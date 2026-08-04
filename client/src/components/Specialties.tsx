import { motion } from "framer-motion";
import Reveal from "./Reveal";
import { WHATSAPP_URL } from "../lib/constants";

const CARDS = [
  {
    title: "Direito de Família",
    description:
      "Casamento, divórcio, guarda e pensão — conduzidos com estratégia jurídica e sensibilidade para o momento que sua família atravessa.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-11 w-11">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21c-4.5-3-8-6.5-8-10.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8 4.2c0 3.7-3.5 7.2-8 10.2Z"
        />
      </svg>
    ),
  },
  {
    title: "Sucessões",
    description:
      "Testamentos, inventário e partilha de bens planejados com antecedência, para que sua vontade seja cumprida sem disputas desnecessárias.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-11 w-11">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14H7V3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4h4M9.5 12h5M9.5 15.5h5" />
      </svg>
    ),
  },
  {
    title: "Direito Patrimonial",
    description:
      "Contratos, negociações e proteção de bens estruturados para blindar o patrimônio que você levou uma vida inteira para construir.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-11 w-11">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3 4 6.5v5.2C4 16.7 7.4 20.9 12 22c4.6-1.1 8-5.3 8-10.3V6.5L12 3Z"
        />
      </svg>
    ),
  },
  {
    title: "Estratégia Jurídica",
    description:
      "Orientação preventiva para quem prefere antecipar cenários e decidir com margem, em vez de reagir sob pressão.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-11 w-11">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.75" fill="currentColor" />
      </svg>
    ),
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
            Onde posso ajudar você
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            Quatro frentes de atuação que se conectam por um mesmo propósito: proteger pessoas,
            vínculos e patrimônio com técnica e cuidado.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-lg border-l-4 border-coffee bg-white p-7 shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_14px_32px_rgba(0,0,0,0.12)]"
              >
                <div className="text-coffee">{card.icon}</div>
                <h3 className="mt-5 font-serif text-xl font-semibold text-coffee">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{card.description}</p>
              </motion.div>
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
