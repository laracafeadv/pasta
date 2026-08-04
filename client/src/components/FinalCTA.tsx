import { Link } from "react-router-dom";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section className="bg-coffee py-24 text-cream lg:py-32">
      <Reveal className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <img src="/assets/mono-light.png" alt="" aria-hidden className="mx-auto mb-6 h-10 w-auto opacity-70" />
        <h2 className="font-serif text-3xl font-medium leading-tight sm:text-4xl">
          O melhor momento para proteger seu futuro é antes que ele precise ser defendido.
        </h2>
        <p className="mt-4 text-base text-cream/75 sm:text-lg">
          Agende uma consulta particular e saia com um caminho claro para o seu caso.
        </p>
        <Link
          to="/#contato"
          className="mt-9 inline-block rounded-full bg-cream px-9 py-4 text-sm font-semibold uppercase tracking-wide text-coffee shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-cream/90 hover:shadow-xl"
        >
          Agendar minha Consulta
        </Link>
      </Reveal>
    </section>
  );
}
