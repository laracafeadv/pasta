import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { formatDate } from "../../lib/format";
import SEO from "../../components/SEO";

export default function ContactsList() {
  const utils = trpc.useUtils();
  const { data: contacts, isLoading } = trpc.contacts.adminList.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const markRead = trpc.contacts.markRead.useMutation({
    onSuccess: () => utils.contacts.adminList.invalidate(),
  });
  const remove = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      utils.contacts.adminList.invalidate();
      setSelectedId(null);
    },
  });

  const selected = contacts?.find((c) => c.id === selectedId);

  function handleDelete(id: number) {
    if (confirm("Tem certeza que deseja excluir esta mensagem?")) {
      remove.mutate({ id });
    }
  }

  return (
    <div>
      <SEO title="Gerenciar Contatos | Painel Administrativo" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-coffee">Gerenciar Contatos</h1>
        <a
          href="/api/admin/contacts/export.csv"
          className="rounded-sm border border-coffee px-5 py-2.5 text-sm font-semibold text-coffee hover:bg-coffee hover:text-cream"
        >
          Exportar CSV
        </a>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-ink/50">
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">E-mail</th>
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
            {contacts?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-ink/50">
                  Nenhuma mensagem recebida ainda.
                </td>
              </tr>
            )}
            {contacts?.map((c) => (
              <tr key={c.id} className={`border-b border-black/5 ${!c.read ? "bg-coffee/5" : ""}`}>
                <td className="px-5 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-5 py-3 text-ink/70">{c.email}</td>
                <td className="px-5 py-3 text-ink/70">{formatDate(c.createdAt)}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      c.read ? "bg-black/5 text-ink/60" : "bg-coffee/10 text-coffee"
                    }`}
                  >
                    {c.read ? "Lido" : "Não lido"}
                  </span>
                </td>
                <td className="space-x-3 whitespace-nowrap px-5 py-3">
                  <button onClick={() => setSelectedId(c.id)} className="text-coffee underline">
                    Ver
                  </button>
                  <button
                    onClick={() => markRead.mutate({ id: c.id, read: !c.read })}
                    className="text-coffee underline"
                  >
                    {c.read ? "Marcar não lido" : "Marcar lido"}
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 underline">
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="font-serif text-xl font-semibold text-coffee">{selected.name}</h2>
              <button onClick={() => setSelectedId(null)} className="text-ink/40 hover:text-ink">
                ✕
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-ink/50">E-mail</dt>
                <dd className="text-ink">{selected.email}</dd>
              </div>
              <div>
                <dt className="text-ink/50">Telefone</dt>
                <dd className="text-ink">{selected.phone}</dd>
              </div>
              <div>
                <dt className="text-ink/50">Data</dt>
                <dd className="text-ink">{formatDate(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-ink/50">Mensagem</dt>
                <dd className="whitespace-pre-wrap text-ink">{selected.message}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
