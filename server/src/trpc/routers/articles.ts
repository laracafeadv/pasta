import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, ne, like, or, count } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "../trpc.js";
import { schema } from "../../db/index.js";
import { slugify } from "../../lib/slugify.js";

const articleWithCategory = {
  id: schema.blogArticles.id,
  title: schema.blogArticles.title,
  slug: schema.blogArticles.slug,
  content: schema.blogArticles.content,
  excerpt: schema.blogArticles.excerpt,
  author: schema.blogArticles.author,
  imageUrl: schema.blogArticles.imageUrl,
  status: schema.blogArticles.status,
  publishedAt: schema.blogArticles.publishedAt,
  createdAt: schema.blogArticles.createdAt,
  categoryId: schema.blogArticles.categoryId,
  categoryName: schema.blogCategories.name,
  categorySlug: schema.blogCategories.slug,
};

export const articlesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        categorySlug: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(24).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.blogArticles.status, "published")];
      if (input.categorySlug && input.categorySlug !== "todos") {
        conditions.push(eq(schema.blogCategories.slug, input.categorySlug));
      }
      if (input.search) {
        conditions.push(
          or(
            like(schema.blogArticles.title, `%${input.search}%`),
            like(schema.blogArticles.excerpt, `%${input.search}%`)
          )!
        );
      }

      const where = and(...conditions);

      const items = await ctx.db
        .select(articleWithCategory)
        .from(schema.blogArticles)
        .innerJoin(schema.blogCategories, eq(schema.blogArticles.categoryId, schema.blogCategories.id))
        .where(where)
        .orderBy(desc(schema.blogArticles.publishedAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      const [{ total }] = await ctx.db
        .select({ total: count() })
        .from(schema.blogArticles)
        .innerJoin(schema.blogCategories, eq(schema.blogArticles.categoryId, schema.blogCategories.id))
        .where(where);

      return { items, total, hasMore: input.page * input.pageSize < total };
    }),

  recent: publicProcedure.query(({ ctx }) =>
    ctx.db
      .select(articleWithCategory)
      .from(schema.blogArticles)
      .innerJoin(schema.blogCategories, eq(schema.blogArticles.categoryId, schema.blogCategories.id))
      .where(eq(schema.blogArticles.status, "published"))
      .orderBy(desc(schema.blogArticles.publishedAt))
      .limit(5)
  ),

  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const [article] = await ctx.db
      .select(articleWithCategory)
      .from(schema.blogArticles)
      .innerJoin(schema.blogCategories, eq(schema.blogArticles.categoryId, schema.blogCategories.id))
      .where(and(eq(schema.blogArticles.slug, input.slug), eq(schema.blogArticles.status, "published")));

    if (!article) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado." });
    }

    const related = await ctx.db
      .select(articleWithCategory)
      .from(schema.blogArticles)
      .innerJoin(schema.blogCategories, eq(schema.blogArticles.categoryId, schema.blogCategories.id))
      .where(
        and(
          eq(schema.blogArticles.categoryId, article.categoryId),
          eq(schema.blogArticles.status, "published"),
          ne(schema.blogArticles.id, article.id)
        )
      )
      .orderBy(desc(schema.blogArticles.publishedAt))
      .limit(3);

    const allPublished = await ctx.db
      .select({ id: schema.blogArticles.id, slug: schema.blogArticles.slug, title: schema.blogArticles.title })
      .from(schema.blogArticles)
      .where(eq(schema.blogArticles.status, "published"))
      .orderBy(desc(schema.blogArticles.publishedAt));

    const idx = allPublished.findIndex((a) => a.id === article.id);
    const previous = idx < allPublished.length - 1 ? allPublished[idx + 1] : null;
    const next = idx > 0 ? allPublished[idx - 1] : null;

    return { article, related, previous, next };
  }),

  adminList: adminProcedure.query(({ ctx }) =>
    ctx.db
      .select(articleWithCategory)
      .from(schema.blogArticles)
      .innerJoin(schema.blogCategories, eq(schema.blogArticles.categoryId, schema.blogCategories.id))
      .orderBy(desc(schema.blogArticles.createdAt))
  ),

  adminGetById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const [article] = await ctx.db
      .select()
      .from(schema.blogArticles)
      .where(eq(schema.blogArticles.id, input.id));
    if (!article) throw new TRPCError({ code: "NOT_FOUND" });
    return article;
  }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(3),
        slug: z.string().optional(),
        content: z.string().min(1),
        excerpt: z.string().optional(),
        categoryId: z.number(),
        imageUrl: z.string().optional(),
        status: z.enum(["published", "draft"]).default("draft"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
      const [created] = await ctx.db
        .insert(schema.blogArticles)
        .values({
          title: input.title,
          slug,
          content: input.content,
          excerpt: input.excerpt,
          categoryId: input.categoryId,
          author: ctx.admin.name,
          imageUrl: input.imageUrl,
          status: input.status,
          publishedAt: input.status === "published" ? new Date() : null,
        })
        .returning();
      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(3),
        slug: z.string().min(3),
        content: z.string().min(1),
        excerpt: z.string().optional(),
        categoryId: z.number(),
        imageUrl: z.string().optional(),
        status: z.enum(["published", "draft"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(schema.blogArticles)
        .where(eq(schema.blogArticles.id, input.id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await ctx.db
        .update(schema.blogArticles)
        .set({
          title: input.title,
          slug: slugify(input.slug),
          content: input.content,
          excerpt: input.excerpt,
          categoryId: input.categoryId,
          imageUrl: input.imageUrl,
          status: input.status,
          publishedAt:
            input.status === "published" ? existing.publishedAt ?? new Date() : existing.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.blogArticles.id, input.id))
        .returning();
      return updated;
    }),

  togglePublish: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db
      .select()
      .from(schema.blogArticles)
      .where(eq(schema.blogArticles.id, input.id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

    const nextStatus = existing.status === "published" ? "draft" : "published";
    const [updated] = await ctx.db
      .update(schema.blogArticles)
      .set({
        status: nextStatus,
        publishedAt: nextStatus === "published" ? existing.publishedAt ?? new Date() : existing.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.blogArticles.id, input.id))
      .returning();
    return updated;
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.blogArticles).where(eq(schema.blogArticles.id, input.id));
    return { success: true };
  }),
});
