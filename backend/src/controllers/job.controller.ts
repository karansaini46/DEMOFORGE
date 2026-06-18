import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { addJob } from '../queues/pipeline.queue';
import { CreateJobInput } from '../schemas/job.schema';
import * as storage from '../services/storage.service';
import { validateUrl } from '../services/url.service';

const FREE_PLAN_MONTHLY_LIMIT = 3;

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** Resolve the authenticated user's id or throw 401. */
function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }
  return req.user.id;
}

/** POST /api/jobs — create and enqueue a generation job. */
export const createJob = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const { url, templateId } = req.body as CreateJobInput;

  // SSRF validation (protocol/port/credential/IP-range checks + DNS).
  const validatedUrl = await validateUrl(url);

  // Quota enforcement for FREE plans.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Unauthorized', 401);
  }
  if (user.plan === 'FREE' && user.monthlyUsage >= FREE_PLAN_MONTHLY_LIMIT) {
    throw new AppError(
      'Monthly free-tier limit reached. Upgrade to generate more videos.',
      429,
    );
  }

  const jobId = uuidv4();
  const job = await prisma.job.create({
    data: {
      id: jobId,
      userId,
      url: validatedUrl,
      templateId,
      status: 'PENDING',
    },
  });

  await addJob({ jobId: job.id, url: validatedUrl, templateId, userId });

  res.status(201).json({ jobId: job.id });
};

/** GET /api/jobs/:id — fetch a single job (and its video) for the owner. */
export const getJob = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const { id } = req.params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { video: true },
  });

  // 404 (not 403) on ownership mismatch to avoid leaking job existence.
  if (!job || job.userId !== userId) {
    throw new AppError('Job not found', 404);
  }

  res.status(200).json({ job, video: job.video });
};

/** GET /api/jobs — paginated list of the caller's jobs. */
export const listJobs = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);

  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const rawLimit =
    Number.parseInt(String(req.query.limit ?? DEFAULT_PAGE_SIZE), 10) ||
    DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, rawLimit));

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where: { userId },
      include: { video: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.job.count({ where: { userId } }),
  ]);

  res.status(200).json({
    jobs,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
};

/** DELETE /api/jobs/:id — cancel if running, then remove DB record + stored file. */
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const { id } = req.params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { video: true },
  });

  if (!job || job.userId !== userId) {
    throw new AppError('Job not found', 404);
  }

  // Cancel a still-running job by marking it FAILED first.
  if (job.status === 'PROCESSING') {
    await prisma.job.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: 'Cancelled by user' },
    });
  }

  const storagePath = job.video?.storagePath;

  // Delete the DB record (cascade removes the video row).
  await prisma.job.delete({ where: { id } });

  // Best-effort storage cleanup — a failure here shouldn't undo the DB delete.
  if (storagePath) {
    await storage.deleteFile(storagePath).catch(() => {});
  }

  res.status(200).json({ message: 'Job deleted' });
};
