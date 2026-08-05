import { Link } from "react-router-dom";
import { trpc } from "../../lib/trpc";
import { formatDate } from "../../lib/format";
import SEO from "../../components/SEO";

export default function ArticlesList() {
  const utils = trpc.useUtils();
  const { data: articles, isLoading } = trpc.articles.adminList.useQuery();

  const togglePublish = trpc.articles.togglePublish.useMutation({
    onSuccess: () => utils.articles.adminList.invalidate(),
  });
  const deleteArticle = trpc.articles.delete.useMutation({
    onSuccess: () => utils.articles.adminList.invalidate(),
  });

  function handleDelete(id: number, title: string) {
    if (confirm(`Tem certeza que deseja excluir o artigo "${title}"? Esta ação não pode ser desfeita.`)) {
      deleteArticle.mutate({ id });
    }
  }

  return (
    <div>
      <SEO title="Gerenciar Artigos | Painel Administrativo" />
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-coffee">Gerenciar Artigos</h1>
        <Link
          to="/admin/articles/new"
          className="rounded-sm bg-coffee px-5 py-2.5 text-sm font-semibold text-cream hover:bg-coffee/90"
        >
          + Novo Artigo
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-ink/50">
              <th className="px-5 py-3">Título</th>
              <th className="px-5 py-3">Categoria</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-ink/50">
                  Carregando...
                </td>
              </tr>
            )}
            {articles?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-ink/50">
                  Nenhum artigo cadastrado.
                </td>
              </tr>
            )}
            {articles?.map((article) => (
              <tr key={article.id} className="border-b border-black/5">
                <td className="max-w-xs truncate px-5 py-3 font-medium text-ink">
                  {article.title}
                </td>
                <td className="px-5 py-3 text-ink/70">{article.categoryName}</td>
                <td className="px-5 py-3 text-ink/70">
                  {formatDate(article.publishedAt ?? article.createdAt)}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => togglePublish.mutate({ id: article.id })}
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      article.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-black/5 text-ink/60"
                    }`}
                  >
                    {article.status === "published" ? "Publicado" : "Rascunho"}
                  </button>
                </td>
                <td className="space-x-3 whitespace-nowrap px-5 py-3">
                  <Link
                    to={`/admin/articles/${article.id}/edit`}
                    className="text-coffee underline"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(article.id, article.title)}
                    className="text-red-500 underline"
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
