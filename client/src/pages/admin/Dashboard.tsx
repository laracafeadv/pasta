import { Link } from "react-router-dom";
import { trpc } from "../../lib/trpc";
import { formatDate } from "../../lib/format";
import SEO from "../../components/SEO";

export default function Dashboard() {
  const { data, isLoading } = trpc.dashboard.stats.useQuery();

  const cards = [
    { label: "Artigos Publicados", value: data?.published ?? "-" },
    { label: "Artigos em Rascunho", value: data?.drafts ?? "-" },
    { label: "Mensagens de Contato", value: data?.contacts ?? "-" },
    { label: "Mensagens Não Lidas", value: data?.unread ?? "-" },
  ];

  return (
    <div>
      <SEO title="Dashboard | Painel Administrativo" />
      <h1 className="font-serif text-2xl font-semibold text-coffee">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border-l-4 border-coffee bg-white p-5 shadow-sm">
            <p className="text-sm text-ink/60">{card.label}</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-coffee">
              {isLoading ? "…" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-coffee">
            Últimas Mensagens de Contato
          </h2>
          <Link to="/admin/contacts" className="text-sm text-coffee underline">
            Ver todas
          </Link>
        </div>

        {data?.recentContacts.length === 0 ? (
          <p className="text-sm text-ink/60">Nenhuma mensagem recebida ainda.</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-ink/50">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">E-mail</th>
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentContacts.map((c) => (
                <tr key={c.id} className="border-b border-black/5">
                  <td className="py-3 pr-4">{c.name}</td>
                  <td className="py-3 pr-4">{c.email}</td>
                  <td className="py-3 pr-4">{formatDate(c.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        c.read ? "bg-black/5 text-ink/60" : "bg-coffee/10 text-coffee"
                      }`}
                    >
                      {c.read ? "Lido" : "Não lido"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
