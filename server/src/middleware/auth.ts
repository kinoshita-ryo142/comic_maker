import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const TOKEN_COOKIE_NAME = 'comic_token';

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[TOKEN_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'ログインが必要です。' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'セッションの有効期限が切れています。再ログインしてください。' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: '管理者権限が必要です。' });
    return;
  }
  next();
}
