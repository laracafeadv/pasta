import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";

export interface AdminSession {
  id: number;
  email: string;
  name: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "lc_admin_session";

export function createContext({ req, res }: CreateExpressContextOptions) {
  let admin: AdminSession | null = null;
  const token = req.cookies?.[COOKIE_NAME];

  if (token) {
    try {
      admin = jwt.verify(token, JWT_SECRET) as AdminSession;
    } catch {
      admin = null;
    }
  }

  return { req, res, db, admin };
}

export type Context = ReturnType<typeof createContext>;
export { JWT_SECRET, COOKIE_NAME };
