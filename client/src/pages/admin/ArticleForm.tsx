import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { trpc } from "../../lib/trpc";
import { slugify } from "../../lib/slugify";
import SEO from "../../components/SEO";
import RichTextEditor from "../../components/admin/RichTextEditor";
import ImageUploadField from "../../components/admin/ImageUploadField";

export default function ArticleForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: existing } = trpc.articles.adminGetById.useQuery(
    { id: Number(id) },
    { enabled: isEdit }
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSlug(existing.slug);
      setContent(existing.content);
      setExcerpt(existing.excerpt ?? "");
      setCategoryId(existing.categoryId);
      setImageUrl(existing.imageUrl ?? "");
      setStatus(existing.status);
    }
  }, [existing]);

  useEffect(() => {
    if (!slugTouched && !isEdit) setSlug(slugify(title));
  }, [title, slugTouched, isEdit]);

  const create = trpc.articles.create.useMutation({
    onSuccess: () => {
      utils.articles.adminList.invalidate();
      navigate("/admin/articles");
    },
  });
  const update = trpc.articles.update.useMutation({
    onSuccess: () => {
      utils.articles.adminList.invalidate();
      navigate("/admin/articles");
    },
  });

  const saving = create.isPending || update.isPending;
  const error = create.error?.message || update.error?.message;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return;

    const payload = {
      title,
      slug,
      content,
      excerpt: excerpt || undefined,
      categoryId: Number(categoryId),
      imageUrl: imageUrl || undefined,
      status,
    };

    if (isEdit) {
      update.mutate({ id: Number(id), ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SEO title={`${isEdit ? "Editar" : "Novo"} Artigo | Painel Administrativo`} />
      <h1 className="font-serif text-2xl font-semibold text-coffee">
        {isEdit ? "Editar Artigo" : "Novo Artigo"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-lg bg-white p-5 shadow-sm sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-coffee">Título</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-sm border border-coffee-light/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-coffee">Slug</label>
          <input
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            className="w-full rounded-sm border border-coffee-light/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-coffee">Categoria</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full rounded-sm border border-coffee-light/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
          >
            <option value="">Selecione uma categoria</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-coffee">
            Excerpt (opcional)
          </label>
          <textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="w-full rounded-sm border border-coffee-light/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-coffee">Imagem de Capa</label>
          <ImageUploadField value={imageUrl} onChange={setImageUrl} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-coffee">Conteúdo</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-coffee">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
            className="w-full rounded-sm border border-coffee-light/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30 sm:w-64"
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-sm bg-coffee px-8 py-3 text-sm font-semibold uppercase tracking-wide text-cream hover:bg-coffee/90 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/articles")}
            className="rounded-sm border border-coffee-light/30 px-8 py-3 text-sm font-semibold text-ink/70 hover:bg-black/5"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
