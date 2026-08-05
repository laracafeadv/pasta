import Reveal from "./Reveal";
import Eyebrow from "./Eyebrow";
import { WHATSAPP_NUMBER } from "../lib/constants";

const GROUPS = [
  {
    label: "Família & União",
    items: [
      {
        n: "01",
        title: "Divórcio",
        text: "Consensual ou litigioso, conduzido com estratégia e o menor desgaste possível.",
      },
      {
        n: "02",
        title: "Planejamento matrimonial",
        text: "Pactos e acordos que antecipam cenários antes que se tornem conflitos.",
      },
      {
        n: "03",
        title: "União estável",
        text: "Formalização da relação com todos os efeitos jurídicos garantidos.",
      },
      {
        n: "04",
        title: "Reconhecimento de união estável",
        text: "Comprovação e registro da relação para todos os efeitos legais.",
      },
      {
        n: "05",
        title: "Dissolução de união estável",
        text: "Encerramento conduzido com respeito e definição clara de direitos.",
      },
    ],
  },
  {
    label: "Sucessões",
    items: [
      {
        n: "06",
        title: "Inventário",
        text: "Judicial ou extrajudicial, para encerrar o processo com segurança.",
      },
      {
        n: "07",
        title: "Partilha de bens",
        text: "Divisão de patrimônio construída com clareza e critério técnico.",
      },
      {
        n: "08",
        title: "Planejamento sucessório",
        text: "Estruturas pensadas para proteger quem você deixa para trás.",
      },
    ],
  },
];

function itemUrl(title: string) {
  const msg = `Olá, Lara! Gostaria de falar sobre ${title.toLowerCase()}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export default function Specialties() {
  return (
    <section
      id="areas-de-atuacao"
      className="scroll-mt-28 lg:scroll-mt-32 relative overflow-hidden bg-coffee py-24 text-cream lg:py-32"
    >
      <img
        src="/assets/monogram-outline.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-[26rem] w-auto opacity-[0.05] invert sm:h-[34rem]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-32">
              <Eyebrow light>Áreas de Atuação</Eyebrow>
              <h2 className="max-w-xs text-[1.85rem] font-normal leading-[1.25] tracking-tight sm:text-[2.15rem]">
                Um índice da minha atuação
              </h2>
              <p className="mt-5 max-w-xs text-[0.9rem] leading-relaxed text-cream/60">
                Da formalização de uma união ao encerramento de um inventário, atuo em cada
                etapa que a vida em família pode exigir.
              </p>
              <p className="mt-6 text-[0.8rem] leading-relaxed text-cream/40">
                Toque em qualquer item para conversar diretamente sobre o seu caso.
              </p>
            </div>
          </Reveal>

          <div>
            {GROUPS.map((group, gi) => (
              <Reveal key={group.label} delay={gi * 0.08} className={gi > 0 ? "mt-10" : ""}>
                <p className="mb-1 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-cream/40">
                  {group.label}
                </p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.n} className="border-b border-cream/12 first:border-t">
                      <a
                        href={itemUrl(item.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-baseline justify-between gap-6 py-5 transition-colors duration-200 hover:text-cream"
                      >
                        <span className="flex items-baseline gap-5">
                          <span className="font-serif text-xs text-cream/35">{item.n}</span>
                          <span className="flex flex-col">
                            <span className="font-serif text-[1.15rem] leading-snug text-cream/90 transition-colors duration-200 group-hover:text-cream">
                              {item.title}
                            </span>
                            <span className="mt-1 max-h-0 max-w-md overflow-hidden text-[0.825rem] leading-relaxed text-cream/50 opacity-0 transition-all duration-300 group-hover:mt-1.5 group-hover:max-h-10 group-hover:opacity-100">
                              {item.text}
                            </span>
                          </span>
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          className="h-4 w-4 shrink-0 -translate-x-1 text-cream/40 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
