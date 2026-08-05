import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { slugify } from "../../lib/slugify";
import SEO from "../../components/SEO";

interface FormState {
  id: number | null;
  name: string;
  slug: string;
  description: string;
}

const EMPTY_FORM: FormState = { id: null, name: "", slug: "", description: "" };

export default function CategoriesList() {
  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.categories.adminList.useQuery();
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const invalidate = () => {
    utils.categories.adminList.invalidate();
    utils.categories.list.invalidate();
  };

  const create = trpc.categories.create.useMutation({
    onSuccess: () => {
      invalidate();
      setForm(null);
    },
  });
  const update = trpc.categories.update.useMutation({
    onSuccess: () => {
      invalidate();
      setForm(null);
    },
  });
  const remove = trpc.categories.delete.useMutation({
    onSuccess: invalidate,
    onError: (err) => setDeleteError(err.message),
  });

  function openNew() {
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setDeleteError("");
  }

  function openEdit(cat: { id: number; name: string; slug: string; description: string | null }) {
    setForm({ id: cat.id, name: cat.name, slug: cat.slug, description: cat.description ?? "" });
    setSlugTouched(true);
    setDeleteError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.id) {
      update.mutate({ id: form.id, name: form.name, slug: form.slug, description: form.description });
    } else {
      create.mutate({ name: form.name, slug: form.slug, description: form.description });
    }
  }

  function handleDelete(id: number, name: string) {
    setDeleteError("");
    if (confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
      remove.mutate({ id });
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <div>
      <SEO title="Gerenciar Categorias | Painel Administrativo" />
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-coffee">Gerenciar Categorias</h1>
        <button
          onClick={openNew}
          className="rounded-sm bg-coffee px-5 py-2.5 text-sm font-semibold text-cream hover:bg-coffee/90"
        >
          + Nova Categoria
        </button>
      </div>

      {deleteError && (
        <p className="mt-4 rounded-sm bg-red-50 px-4 py-3 text-sm text-red-600">{deleteError}</p>
      )}

      {form && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-lg border border-coffee-light/20 bg-white p-5 shadow-sm"
        >
          <h2 className="font-serif text-lg font-semibold text-coffee">
            {form.id ? "Editar Categoria" : "Nova Categoria"}
          </h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-coffee">Nome</label>
            <input
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => (f ? { ...f, name, slug: slugTouched ? f.slug : slugify(name) } : f));
              }}
              className="w-full rounded-sm border border-coffee-light/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-coffee">Slug</label>
            <input
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => (f ? { ...f, slug: e.target.value } : f));
              }}
              className="w-full rounded-sm border border-coffee-light/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-coffee">
              Descrição (opcional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
              className="w-full rounded-sm border border-coffee-light/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/30"
            />
          </div>
          {(create.error || update.error) && (
            <p className="text-sm text-red-500">{create.error?.message || update.error?.message}</p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-sm bg-coffee px-6 py-2.5 text-sm font-semibold text-cream hover:bg-coffee/90 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-sm border border-coffee-light/30 px-6 py-2.5 text-sm font-medium text-ink/70 hover:bg-black/5"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-ink/50">
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Descrição</th>
              <th className="px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-ink/50">
                  Carregando...
                </td>
              </tr>
            )}
            {categories?.map((cat) => (
              <tr key={cat.id} className="border-b border-black/5">
                <td className="px-5 py-3 font-medium text-ink">{cat.name}</td>
                <td className="px-5 py-3 text-ink/60">{cat.slug}</td>
                <td className="max-w-xs truncate px-5 py-3 text-ink/60">{cat.description}</td>
                <td className="space-x-3 whitespace-nowrap px-5 py-3">
                  <button onClick={() => openEdit(cat)} className="text-coffee underline">
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
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
