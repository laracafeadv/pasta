import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "../trpc.js";
import { schema } from "../../db/index.js";

export const contactsRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2, "Informe seu nome completo."),
        email: z.string().trim().email("Informe um e-mail válido."),
        phone: z.string().trim().min(8, "Informe um telefone válido."),
        message: z.string().trim().min(10, "A mensagem deve ter pelo menos 10 caracteres."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db.insert(schema.contactSubmissions).values(input).returning();
      return created;
    }),

  adminList: adminProcedure.query(({ ctx }) =>
    ctx.db.select().from(schema.contactSubmissions).orderBy(desc(schema.contactSubmissions.createdAt))
  ),

  markRead: adminProcedure
    .input(z.object({ id: z.number(), read: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(schema.contactSubmissions)
        .set({ read: input.read })
        .where(eq(schema.contactSubmissions.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.contactSubmissions).where(eq(schema.contactSubmissions.id, input.id));
    return { success: true };
  }),
});
