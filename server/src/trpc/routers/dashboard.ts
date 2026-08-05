import { count, desc, eq } from "drizzle-orm";
import { router, adminProcedure } from "../trpc.js";
import { schema } from "../../db/index.js";

export const dashboardRouter = router({
  stats: adminProcedure.query(async ({ ctx }) => {
    const [[{ published }], [{ drafts }], [{ contacts }], [{ unread }], recentContacts] =
      await Promise.all([
        ctx.db
          .select({ published: count() })
          .from(schema.blogArticles)
          .where(eq(schema.blogArticles.status, "published")),
        ctx.db
          .select({ drafts: count() })
          .from(schema.blogArticles)
          .where(eq(schema.blogArticles.status, "draft")),
        ctx.db.select({ contacts: count() }).from(schema.contactSubmissions),
        ctx.db
          .select({ unread: count() })
          .from(schema.contactSubmissions)
          .where(eq(schema.contactSubmissions.read, false)),
        ctx.db
          .select()
          .from(schema.contactSubmissions)
          .orderBy(desc(schema.contactSubmissions.createdAt))
          .limit(5),
      ]);

    return { published, drafts, contacts, unread, recentContacts };
  }),
});
