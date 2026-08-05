import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import Reveal from "../components/Reveal";
import Eyebrow from "../components/Eyebrow";
import CategoryPills from "../components/CategoryPills";
import BlogCard from "../components/BlogCard";
import BlogSidebar from "../components/BlogSidebar";
import { trpc } from "../lib/trpc";
import type { ArticleSummary } from "../lib/types";

const PAGE_SIZE = 6;

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("categoria") || "todos";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ArticleSummary[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [category, debouncedSearch]);

  const { data, isLoading, isFetching } = trpc.articles.list.useQuery({
    categorySlug: category,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
  }, [data, page]);

  function handleCategoryChange(slug: string) {
    setSearchParams(slug === "todos" ? {} : { categoria: slug });
  }

  return (
    <div>
      <SEO
        title="Blog Jurídico | Lara Café Advocacia"
        description="Reflexões sobre divórcio, união estável, inventário e planejamento sucessório, escritas para ajudar você a decidir com mais clareza."
      />

      <section className="relative flex h-64 items-end overflow-hidden bg-coffee sm:h-72">
        <img
          src="/assets/support-certificate.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coffee via-coffee/60 to-coffee/20" />
        <Reveal className="relative mx-auto w-full max-w-7xl px-4 pb-9 sm:px-6 lg:px-8">
          <nav className="mb-3 text-xs text-cream/60">
            <Link to="/" className="hover:text-cream">
              Início
            </Link>{" "}
            &gt; <span className="text-cream">Blog</span>
          </nav>
          <Eyebrow light>Blog Jurídico</Eyebrow>
          <h1 className="text-[1.85rem] font-normal leading-[1.25] tracking-tight text-cream sm:text-[2.15rem]">
            Clareza jurídica, um artigo de cada vez
          </h1>
        </Reveal>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <p className="max-w-2xl text-[0.975rem] leading-relaxed text-ink/70">
          Divórcio, união estável, inventário e planejamento sucessório — escritos para ajudar
          você a entender seus direitos antes de precisar deles.
        </p>

        <div className="mt-8">
        <CategoryPills active={category} onChange={handleCategoryChange} />
      </div>

      <div className="mt-4 lg:hidden">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar artigos..."
          className="w-full rounded-sm border border-coffee-light/30 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
        />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_280px]">
        <div>
          {isLoading && page === 1 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-96 animate-pulse rounded-lg bg-white/70" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-ink/60">
              Nenhum artigo encontrado por aqui ainda. Novos conteúdos chegam em breve.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((article) => (
                <BlogCard key={article.id} article={article} />
              ))}
            </div>
          )}

          {data?.hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="rounded-full border border-coffee px-8 py-3 text-sm font-semibold uppercase tracking-wide text-coffee transition-colors hover:bg-coffee hover:text-cream disabled:opacity-60"
              >
                {isFetching ? "Carregando..." : "Carregar Mais"}
              </button>
            </div>
          )}
        </div>

        <BlogSidebar search={search} onSearchChange={setSearch} activeCategory={category} />
      </div>
      </div>
    </div>
  );
}
