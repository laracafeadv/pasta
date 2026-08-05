import Reveal from "./Reveal";
import Eyebrow from "./Eyebrow";
import { WHATSAPP_URL } from "../lib/constants";

const GROUPS = [
  {
    number: "01",
    title: "Família & União",
    items: [
      "Divórcio",
      "Planejamento matrimonial",
      "União estável",
      "Reconhecimento de união estável",
      "Dissolução de união estável",
    ],
  },
  {
    number: "02",
    title: "Sucessões",
    items: ["Inventário", "Partilha de bens", "Planejamento sucessório"],
  },
];

export default function Specialties() {
  return (
    <section id="areas-de-atuacao" className="scroll-mt-28 lg:scroll-mt-32 bg-cream py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow align="center">Áreas de Atuação</Eyebrow>
          <h2 className="font-serif text-3xl font-medium text-coffee sm:text-4xl">
            Direito de Família e Sucessões
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            Da formalização de uma união ao encerramento de um inventário, atuo em cada etapa
            que a vida em família pode exigir.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-x-16 gap-y-14 lg:grid-cols-2">
          {GROUPS.map((group, i) => (
            <Reveal key={group.title} delay={i * 0.1}>
              <div className="flex items-baseline gap-3 border-b border-coffee/20 pb-4">
                <span className="font-serif text-sm text-coffee-light">{group.number}</span>
                <h3 className="font-serif text-xl font-semibold text-coffee">{group.title}</h3>
              </div>
              <ul>
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="border-b border-coffee/10 py-4 text-base text-ink/80 transition-colors duration-200 last:border-none hover:text-coffee"
                  >
                    {item}
                  </li>
                ))}
              </ul>
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
            className="mt-5 inline-block rounded-full border border-coffee px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-coffee transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee hover:text-cream"
          >
            Falar Diretamente Comigo
          </a>
        </Reveal>
      </div>
    </section>
  );
}
