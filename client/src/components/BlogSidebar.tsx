import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { formatDate } from "../lib/format";

interface BlogSidebarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeCategory?: string;
}

export default function BlogSidebar({ search, onSearchChange, activeCategory }: BlogSidebarProps) {
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: recent } = trpc.articles.recent.useQuery();

  return (
    <aside className="hidden space-y-8 lg:block">
      <div>
        <h3 className="mb-3 font-serif text-lg font-semibold text-coffee">Buscar</h3>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar artigos..."
            className="w-full rounded-sm border border-coffee-light/30 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-serif text-lg font-semibold text-coffee">Categorias</h3>
        <ul className="space-y-2">
          {categories?.map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/blog?categoria=${cat.slug}`}
                className={`flex items-center justify-between text-sm transition-colors hover:text-coffee ${
                  activeCategory === cat.slug ? "font-semibold text-coffee" : "text-ink/70"
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-xs text-ink/40">({cat.articleCount})</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 font-serif text-lg font-semibold text-coffee">Artigos Recentes</h3>
        <ul className="space-y-4">
          {recent?.map((article) => (
            <li key={article.id}>
              <Link to={`/blog/${article.slug}`} className="group flex gap-3">
                <img
                  src={article.imageUrl || "/assets/blog-cover-default.jpg"}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded object-cover"
                />
                <div>
                  <p className="line-clamp-2 text-sm font-medium text-ink group-hover:text-coffee">
                    {article.title}
                  </p>
                  <p className="mt-1 text-xs text-ink/50">
                    {formatDate(article.publishedAt ?? article.createdAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
