import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../hooks/useAuth";
import SEO from "../../components/SEO";

export default function AdminLogin() {
  const { admin, isLoading, refetch } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: () => {
      refetch();
      navigate("/admin");
    },
  });

  if (!isLoading && admin) {
    return <Navigate to="/admin" replace />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-coffee px-4">
      <SEO title="Login | Painel Administrativo" />
      <div className="w-full max-w-sm rounded-lg bg-cream p-8 shadow-2xl">
        <h1 className="text-center font-serif text-2xl font-semibold text-coffee">
          Painel Administrativo
        </h1>
        <p className="mt-1 text-center text-sm text-ink/60">Lara Café Advocacia</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-coffee">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-coffee-light/30 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/40"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-coffee">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-coffee-light/30 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coffee/40"
            />
          </div>

          {login.isError && (
            <p className="text-sm text-red-500">{login.error.message}</p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full rounded-sm bg-coffee px-8 py-3 text-sm font-semibold uppercase tracking-wide text-cream transition-colors hover:bg-coffee/90 disabled:opacity-60"
          >
            {login.isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
