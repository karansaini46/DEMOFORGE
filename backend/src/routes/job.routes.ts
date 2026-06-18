import { Router } from 'express';

import { createJob, deleteJob, getJob, listJobs } from '../controllers/job.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const jobRouter = Router();

jobRouter.use(requireAuth);

jobRouter.post('/', createJob);
jobRouter.get('/', listJobs);
jobRouter.get('/:id', getJob);
jobRouter.delete('/:id', deleteJob);
