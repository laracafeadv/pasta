import { Link } from "react-router-dom";
import Reveal from "./Reveal";

const APPROACH = [
  "Alternativas jurídicas fundamentadas na legislação vigente",
  "Estratégia e visão preventiva para proteger seu patrimônio",
  "Proteção patrimonial e continuidade familiar",
  "Linguagem acessível e clara",
];

export default function About() {
  return (
    <section id="sobre" className="bg-cream py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-md">
            <div className="absolute -inset-4 -z-10 rounded-bl-[6rem] bg-coffee/10 sm:-inset-6" />
            <img
              src="/assets/lara-foto.png"
              alt="Dra. Lara Café"
              className="aspect-[2/3] w-full rounded-bl-[6rem] object-cover shadow-xl"
            />
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <h2 className="font-serif text-3xl font-semibold text-coffee sm:text-4xl">
            Quem é a Dra. Lara Café?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-ink/80">
            <p>
              Sou Lara Café, advogada especialista em Direito de Família, Sucessões e Direito
              Patrimonial, com foco em soluções estratégicas e proteção patrimonial.
            </p>
            <p>
              Atendo online para clientes em todo o Brasil. Meu trabalho é pautado em orientação
              jurídica clara, sigilosa e baseada na legislação vigente, proporcionando
              informações seguras para a tomada de decisões em questões familiares e
              sucessórias.
            </p>
          </div>

          <p className="mt-6 font-medium text-coffee">Minha abordagem:</p>
          <ul className="mt-3 space-y-2">
            {APPROACH.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-ink/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coffee" />
                {item}
              </li>
            ))}
          </ul>

          <blockquote className="mt-8 border-l-4 border-coffee pl-5 font-serif text-lg italic text-coffee-light">
            "O planejamento que você faz hoje, protege o seu futuro amanhã."
          </blockquote>

          <Link
            to="/#contato"
            className="mt-8 inline-block rounded-sm bg-coffee px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee/90 hover:shadow-lg"
          >
            Agendar Consulta
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
