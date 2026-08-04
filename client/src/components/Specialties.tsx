import { motion } from "framer-motion";
import Reveal from "./Reveal";

const CARDS = [
  {
    title: "Direito de Família",
    description:
      "Orientação em questões de casamento, divórcio, guarda de filhos, pensão alimentícia e mediação familiar.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12">
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
      "Planejamento sucessório, elaboração de testamentos, inventário e partilha de bens com segurança jurídica.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14H7V3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4h4M9.5 12h5M9.5 15.5h5" />
      </svg>
    ),
  },
  {
    title: "Direito Patrimonial",
    description:
      "Proteção e gestão de patrimônio, contratos imobiliários, negociações comerciais e defesa de direitos reais.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12">
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
      "Orientação preventiva com foco em alternativas que considerem possíveis riscos e etapas futuras.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.75" fill="currentColor" />
      </svg>
    ),
  },
];

export default function Specialties() {
  return (
    <section id="especialidades" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-coffee sm:text-4xl">
            Especialidades
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            Três pilares de expertise jurídica para proteger você e sua família
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-lg border-l-4 border-coffee bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
              >
                <div className="text-coffee">{card.icon}</div>
                <h3 className="mt-4 font-serif text-xl font-semibold text-coffee">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{card.description}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
