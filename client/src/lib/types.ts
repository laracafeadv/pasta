import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "server/router";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ArticleSummary = RouterOutputs["articles"]["list"]["items"][number];
export type ArticleDetail = RouterOutputs["articles"]["bySlug"]["article"];
export type Category = RouterOutputs["categories"]["list"][number];
