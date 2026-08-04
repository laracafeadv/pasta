import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { ArticleSummary } from "../lib/types";
import { formatDate, readingTime } from "../lib/format";

export default function BlogCard({ article }: { article: ArticleSummary }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(0,0,0,0.14)]"
    >
      <Link to={`/blog/${article.slug}`} className="block h-[250px] overflow-hidden">
        <img
          src={article.imageUrl || "/assets/blog-cover-default.jpg"}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <span className="w-fit rounded-full bg-coffee-light/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-coffee">
          {article.categoryName}
        </span>
        <Link to={`/blog/${article.slug}`}>
          <h3 className="mt-3 font-serif text-lg font-semibold leading-snug text-coffee">
            {article.title}
          </h3>
        </Link>
        {article.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/70">
            {article.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 text-xs text-ink/50">
          <span>
            {formatDate(article.publishedAt ?? article.createdAt)} · {readingTime(article.content)}{" "}
            min de leitura
          </span>
        </div>
        <Link
          to={`/blog/${article.slug}`}
          className="mt-4 inline-block w-fit rounded-full bg-coffee px-5 py-2 text-xs font-semibold uppercase tracking-wide text-cream transition-colors hover:bg-coffee/90"
        >
          Leia Mais
        </Link>
      </div>
    </motion.article>
  );
}
