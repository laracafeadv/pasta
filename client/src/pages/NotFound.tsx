import { Link } from "react-router-dom";
import SEO from "../components/SEO";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <SEO title="Página não encontrada | Lara Café Advocacia" />
      <p className="font-serif text-5xl font-normal text-coffee">404</p>
      <h1 className="mt-4 text-xl font-normal text-coffee">Página não encontrada</h1>
      <p className="mt-3 text-ink/70">A página que você procura não existe ou foi movida.</p>
      <Link
        to="/"
        className="mt-8 rounded-full bg-coffee px-8 py-3 text-sm font-semibold uppercase tracking-wide text-cream"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
