import 'express';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      email: string;
      plan: string;
      jti: string;
      /** Token expiry (epoch seconds), used to scope the logout blacklist TTL. */
      exp?: number;
    }

    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
