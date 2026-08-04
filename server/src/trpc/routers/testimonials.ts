import { router, publicProcedure } from "../trpc.js";
import { schema } from "../../db/index.js";

export const testimonialsRouter = router({
  list: publicProcedure.query(({ ctx }) => ctx.db.select().from(schema.testimonials)),
});
