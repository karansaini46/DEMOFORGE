import { Router } from 'express';

import * as jobController from '../controllers/job.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { generateLimiter } from '../middleware/ratelimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { createJobSchema } from '../schemas/job.schema';
import { asyncHandler } from '../utils/asyncHandler';

export const jobRouter = Router();

jobRouter.post(
  '/',
  requireAuth,
  generateLimiter,
  validate(createJobSchema),
  asyncHandler(jobController.createJob),
);

jobRouter.get('/:id', requireAuth, asyncHandler(jobController.getJob));

jobRouter.get('/', requireAuth, asyncHandler(jobController.listJobs));

jobRouter.delete('/:id', requireAuth, asyncHandler(jobController.deleteJob));
