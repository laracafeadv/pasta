import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "../trpc.js";
import { schema } from "../../db/index.js";
import { JWT_SECRET, COOKIE_NAME } from "../context.js";

const isProd = process.env.NODE_ENV === "production";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.admin),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("E-mail inválido."),
        password: z.string().min(1, "Senha obrigatória."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.email, input.email.toLowerCase().trim()));

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return { id: user.id, email: user.email, name: user.name };
    }),

  logout: adminProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME);
    return { success: true };
  }),
});
