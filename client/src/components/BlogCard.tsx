import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { ArticleSummary } from "../lib/types";
import { formatDate, readingTime } from "../lib/format";

export default function BlogCard({ article }: { article: ArticleSummary }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group flex h-full flex-col overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(59,31,14,0.08)] transition-shadow duration-300 hover:shadow-[0_18px_38px_rgba(59,31,14,0.14)]"
    >
      <Link to={`/blog/${article.slug}`} className="relative block h-[270px] overflow-hidden bg-coffee">
        <img
          src={article.imageUrl || "/assets/blog-cover-default.jpg"}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-coffee/85 via-coffee/15 to-transparent" />
        <span className="absolute bottom-4 left-5 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-cream/90">
          {article.categoryName}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link to={`/blog/${article.slug}`}>
          <h3 className="font-serif text-[1.2rem] leading-snug text-coffee">{article.title}</h3>
        </Link>
        {article.excerpt && (
          <p className="mt-2.5 line-clamp-3 text-[0.875rem] leading-relaxed text-ink/65">
            {article.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-coffee/8 pt-4 text-[0.7rem] text-ink/45">
          <span>
            {formatDate(article.publishedAt ?? article.createdAt)} · {readingTime(article.content)}{" "}
            min de leitura
          </span>
        </div>
        <Link
          to={`/blog/${article.slug}`}
          className="group/link mt-3 inline-flex w-fit items-center gap-2 text-[0.8rem] font-medium text-coffee"
        >
          Leia mais
          <span className="h-px w-4 bg-coffee transition-all duration-300 group-hover/link:w-6" />
        </Link>
      </div>
    </motion.article>
  );
}
