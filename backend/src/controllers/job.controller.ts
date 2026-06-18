import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

import { jobQueue } from '../config/queue';
import { AppError } from '../middleware/error.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const prisma = new PrismaClient();

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const { url, templateId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  if (!url || !templateId) {
    throw new AppError('URL and templateId are required', 400);
  }

  // Create job in DB
  const job = await prisma.job.create({
    data: {
      userId,
      url,
      templateId,
      status: 'PENDING',
      currentStep: 'Queued',
      stepProgress: 0,
    },
  });

  // Add to BullMQ
  await jobQueue.add('generate-demo', { jobId: job.id, url, templateId });

  res.status(201).json({ jobId: job.id, job });
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const job = await prisma.job.findFirst({
    where: { id, userId },
    include: { video: true },
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  res.status(200).json(job);
});

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { video: true },
      skip,
      take: limit,
    }),
    prisma.job.count({ where: { userId } }),
  ]);

  res.status(200).json({ jobs, total, page, limit });
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  await prisma.job.delete({ where: { id } });

  res.status(200).json({ message: 'Job deleted successfully' });
});
