import { Link } from "react-router-dom";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section className="bg-coffee py-16 text-cream lg:py-20">
      <Reveal className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
          Pronto para Proteger Seu Patrimônio?
        </h2>
        <p className="mt-4 text-base text-cream/80 sm:text-lg">
          Entre em contato e agende uma consulta com a Dra. Lara Café
        </p>
        <Link
          to="/#contato"
          className="mt-8 inline-block rounded-sm bg-cream px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-coffee shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
        >
          Agendar Consulta Agora
        </Link>
      </Reveal>
    </section>
  );
}
