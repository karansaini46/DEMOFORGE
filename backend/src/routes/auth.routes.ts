import { Router } from 'express';

import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/ratelimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { asyncHandler } from '../utils/asyncHandler';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(authController.register),
);

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);

authRouter.post('/logout', requireAuth, asyncHandler(authController.logout));

authRouter.get('/me', requireAuth, asyncHandler(authController.getMe));
