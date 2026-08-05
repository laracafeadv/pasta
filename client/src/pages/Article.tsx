import { Link, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import Reveal from "../components/Reveal";
import ShareButtons from "../components/ShareButtons";
import { trpc } from "../lib/trpc";
import { formatDate, readingTime } from "../lib/format";

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = trpc.articles.bySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  );
  const { data: categories } = trpc.categories.list.useQuery();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <div className="h-8 w-2/3 animate-pulse rounded bg-white/70" />
        <div className="mt-6 h-96 animate-pulse rounded-lg bg-white/70" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-serif text-2xl font-semibold text-coffee">Artigo não encontrado</h1>
        <Link to="/blog" className="mt-6 inline-block text-coffee underline">
          Voltar para o blog
        </Link>
      </div>
    );
  }

  const { article, related, previous, next } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <SEO
        title={`${article.title} | Lara Café Advocacia`}
        description={article.excerpt ?? undefined}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-ink/50">
        <Link to="/" className="hover:text-coffee">
          Início
        </Link>
        <span>&gt;</span>
        <Link to="/blog" className="hover:text-coffee">
          Blog
        </Link>
        <span>&gt;</span>
        <Link to={`/blog?categoria=${article.categorySlug}`} className="hover:text-coffee">
          {article.categoryName}
        </Link>
        <span>&gt;</span>
        <span className="text-coffee">{article.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <article>
          <Reveal>
            <span className="rounded-full bg-coffee-light/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-coffee">
              {article.categoryName}
            </span>
            <h1 className="mt-4 text-[1.75rem] font-normal leading-[1.25] tracking-tight text-coffee sm:text-[2.1rem]">
              {article.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/60">
              <span>{formatDate(article.publishedAt ?? article.createdAt)}</span>
              <span>·</span>
              <span>{readingTime(article.content)} min de leitura</span>
              <span>·</span>
              <span>Por {article.author}</span>
            </div>

            <img
              src={article.imageUrl || "/assets/blog-cover-default.jpg"}
              alt={article.title}
              className="mt-8 h-[260px] w-full rounded-lg object-cover sm:h-[400px]"
            />

            <div
              className="prose-article mt-8"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <div className="mt-10 flex items-center gap-4 border-t border-black/10 pt-6">
              <span className="text-sm font-medium text-coffee">Compartilhar:</span>
              <ShareButtons title={article.title} />
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 border-t border-black/10 pt-8 sm:grid-cols-2">
            {previous ? (
              <Link
                to={`/blog/${previous.slug}`}
                className="rounded-lg border border-coffee-light/20 bg-white p-4 transition-colors hover:border-coffee"
              >
                <p className="text-xs uppercase tracking-wide text-ink/50">Artigo Anterior</p>
                <p className="mt-1 line-clamp-2 font-serif font-medium text-coffee">
                  {previous.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                to={`/blog/${next.slug}`}
                className="rounded-lg border border-coffee-light/20 bg-white p-4 text-right transition-colors hover:border-coffee"
              >
                <p className="text-xs uppercase tracking-wide text-ink/50">Próximo Artigo</p>
                <p className="mt-1 line-clamp-2 font-serif font-medium text-coffee">
                  {next.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </article>

        <aside className="space-y-8">
          <div className="rounded-lg border border-coffee-light/20 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coffee">
                <img src="/assets/mono-light.png" alt="" aria-hidden className="h-7 w-auto opacity-90" />
              </span>
              <div>
                <p className="font-serif font-semibold text-coffee">{article.author}</p>
                <p className="text-xs text-ink/60">Advocacia de Família e Sucessões</p>
              </div>
            </div>
            <Link
              to="/#contato"
              className="mt-4 block rounded-full bg-coffee px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-cream"
            >
              Marcar uma Conversa
            </Link>
          </div>

          {related.length > 0 && (
            <div>
              <h3 className="mb-3 font-serif text-lg font-semibold text-coffee">
                Artigos Relacionados
              </h3>
              <ul className="space-y-4">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/blog/${r.slug}`} className="group flex gap-3">
                      <img
                        src={r.imageUrl || "/assets/blog-cover-default.jpg"}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded object-cover"
                      />
                      <p className="line-clamp-3 text-sm font-medium text-ink group-hover:text-coffee">
                        {r.title}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-3 font-serif text-lg font-semibold text-coffee">Categorias</h3>
            <ul className="space-y-2">
              {categories?.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/blog?categoria=${cat.slug}`}
                    className="text-sm text-ink/70 hover:text-coffee"
                  >
                    {cat.name} ({cat.articleCount})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
