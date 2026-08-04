import Reveal from "./Reveal";
import { WHATSAPP_URL } from "../lib/constants";

const CARDS = [
  {
    number: "01",
    title: "Direito de Família",
    description:
      "Casamento, divórcio, guarda e pensão — conduzidos com estratégia jurídica e sensibilidade para o momento que sua família atravessa.",
  },
  {
    number: "02",
    title: "Sucessões",
    description:
      "Testamentos, inventário, partilha de bens e planejamento sucessório e patrimonial, para que sua vontade seja cumprida sem disputas desnecessárias.",
  },
  {
    number: "03",
    title: "Estratégia Jurídica",
    description:
      "Orientação preventiva para antecipar riscos e proteger o patrimônio familiar diante das decisões que o futuro ainda vai exigir.",
  },
];

export default function Specialties() {
  return (
    <section
      id="areas-de-atuacao"
      className="scroll-mt-28 lg:scroll-mt-32 bg-white py-24 lg:py-36"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-coffee-light">
            Áreas de Atuação
          </p>
          <h2 className="font-serif text-3xl font-semibold text-coffee sm:text-4xl">
            Direito de Família e Sucessões
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            Atuação concentrada, para oferecer profundidade em cada caso — do processo de
            família ao planejamento sucessório e patrimonial.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-3">
          {CARDS.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.1}>
              <div className="border-t border-coffee/20 pt-6 transition-colors duration-300 hover:border-coffee">
                <span className="font-serif text-sm text-coffee-light">{card.number}</span>
                <h3 className="mt-3 font-serif text-xl font-semibold text-coffee">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{card.description}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-16 text-center">
          <p className="text-base text-ink/70">
            Não sabe por onde começar? Descreva sua situação e eu indico o melhor caminho.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-sm border border-coffee px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-coffee transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee hover:text-cream"
          >
            Falar Diretamente Comigo
          </a>
        </Reveal>
      </div>
    </section>
  );
}
