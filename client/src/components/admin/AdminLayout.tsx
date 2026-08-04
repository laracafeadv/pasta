import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../hooks/useAuth";

const LINKS = [
  { label: "Dashboard", to: "/admin", end: true },
  { label: "Gerenciar Artigos", to: "/admin/articles" },
  { label: "Gerenciar Categorias", to: "/admin/categories" },
  { label: "Gerenciar Contatos", to: "/admin/contacts" },
];

export default function AdminLayout() {
  const { admin, refetch } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      refetch();
      navigate("/admin/login");
    },
  });

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-coffee text-cream transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-center border-b border-cream/10 px-4">
          <img
            src="/assets/logo-lockup-light.png"
            alt="Lara Café Advocacia"
            className="h-9 w-auto object-contain"
          />
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `rounded-sm px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-cream/15 text-cream" : "text-cream/70 hover:bg-cream/10"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={() => logout.mutate()}
            className="mt-4 rounded-sm px-4 py-2.5 text-left text-sm font-medium text-cream/70 hover:bg-cream/10"
          >
            Logout
          </button>
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="flex h-16 items-center justify-between border-b border-black/5 bg-white px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-coffee/20 lg:hidden"
            aria-label="Abrir menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="hidden font-serif text-lg font-semibold text-coffee lg:block">
            Painel Administrativo
          </span>
          <span className="text-sm text-ink/70">Olá, {admin?.name}</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
