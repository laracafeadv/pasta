import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, COOKIE_NAME, type AdminSession } from "../trpc/context.js";

declare global {
  namespace Express {
    interface Request {
      admin?: AdminSession;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  try {
    req.admin = jwt.verify(token, JWT_SECRET) as AdminSession;
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida." });
  }
}
