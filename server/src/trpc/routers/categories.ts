import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, count } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "../trpc.js";
import { schema } from "../../db/index.js";
import { slugify } from "../../lib/slugify.js";

export const categoriesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.select().from(schema.blogCategories);
    const articleCounts = await ctx.db
      .select({
        categoryId: schema.blogArticles.categoryId,
        total: count(),
      })
      .from(schema.blogArticles)
      .where(eq(schema.blogArticles.status, "published"))
      .groupBy(schema.blogArticles.categoryId);

    return categories.map((cat) => ({
      ...cat,
      articleCount: articleCounts.find((c) => c.categoryId === cat.id)?.total ?? 0,
    }));
  }),

  adminList: adminProcedure.query(({ ctx }) => ctx.db.select().from(schema.blogCategories)),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        slug: z.string().min(2).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
      const [created] = await ctx.db
        .insert(schema.blogCategories)
        .values({ name: input.name, slug, description: input.description })
        .returning();
      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2),
        slug: z.string().min(2),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(schema.blogCategories)
        .set({
          name: input.name,
          slug: slugify(input.slug),
          description: input.description,
          updatedAt: new Date(),
        })
        .where(eq(schema.blogCategories.id, input.id))
        .returning();
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [{ total }] = await ctx.db
        .select({ total: count() })
        .from(schema.blogArticles)
        .where(eq(schema.blogArticles.categoryId, input.id));

      if (total > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível excluir uma categoria com artigos vinculados.",
        });
      }

      await ctx.db.delete(schema.blogCategories).where(eq(schema.blogCategories.id, input.id));
      return { success: true };
    }),
});
