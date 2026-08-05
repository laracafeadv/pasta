import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.admin) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Faça login para continuar." });
  }
  return next({ ctx: { ...ctx, admin: ctx.admin } });
});
