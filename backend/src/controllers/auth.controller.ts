import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { AppError } from '../middleware/error.middleware';
import { LoginInput, RegisterInput } from '../schemas/auth.schema';

// Generic message used for both "user not found" and "wrong password" to
// prevent account enumeration — never reveal which factor failed.
const INVALID_CREDENTIALS = 'Invalid credentials';

type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
};

/** Sign a JWT for the given user with a fresh jti. */
const signToken = (user: { id: string; email: string; plan: string }): string => {
  const payload = {
    sub: user.id,
    email: user.email,
    plan: user.plan,
    jti: uuidv4(),
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

const toSafeUser = (user: {
  id: string;
  email: string;
  name: string | null;
  plan: string;
}): SafeUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  plan: user.plan,
});

/** POST /api/auth/register */
export const register = async (req: Request, res: Response): Promise<void> => {
  // Body is already validated + sanitized by the validate(registerSchema) middleware.
  const { email, password, name } = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, name: name ?? null },
  });

  const token = signToken(user);

  res.status(201).json({ token, user: toSafeUser(user) });
};

/** POST /api/auth/login */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  // Reset the monthly usage counter when we roll into a new calendar month.
  const now = new Date();
  const lastReset = user.usageResetAt;
  const newMonth =
    lastReset.getUTCFullYear() !== now.getUTCFullYear() ||
    lastReset.getUTCMonth() !== now.getUTCMonth();

  let current = user;
  if (newMonth) {
    current = await prisma.user.update({
      where: { id: user.id },
      data: { monthlyUsage: 0, usageResetAt: now },
    });
  }

  const token = signToken(current);

  res.status(200).json({ token, user: toSafeUser(current) });
};

/** POST /api/auth/logout — requires requireAuth */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const auth = req.user;
  if (!auth) {
    throw new AppError('Unauthorized', 401);
  }

  // Blacklist this token's jti until its natural expiry so it can't be reused.
  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = auth.exp ? auth.exp - nowSec : 0;
  if (ttl > 0) {
    await redis.set(`jti:${auth.jti}`, '1', 'EX', ttl);
  }

  res.status(200).json({ message: 'Logged out' });
};

/** GET /api/auth/me — requires requireAuth */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const auth = req.user;
  if (!auth) {
    throw new AppError('Unauthorized', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user) {
    throw new AppError('Unauthorized', 401);
  }

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      monthlyUsage: user.monthlyUsage,
    },
  });
};
