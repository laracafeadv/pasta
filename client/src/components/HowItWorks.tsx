import Reveal from "./Reveal";
import Eyebrow from "./Eyebrow";
import { WHATSAPP_URL } from "../lib/constants";

const STEPS = [
  {
    number: "01",
    title: "Contato inicial",
    text: "Você apresenta a situação e eu avalio, com sigilo, se e como posso ajudar.",
  },
  {
    number: "02",
    title: "Diagnóstico",
    text: "Análise aprofundada do caso, para mapear riscos, possibilidades e o melhor caminho jurídico.",
  },
  {
    number: "03",
    title: "Acompanhamento",
    text: "Condução próxima de cada etapa, com atualizações claras sobre o andamento do caso.",
  },
  {
    number: "04",
    title: "Solução",
    text: "Uma resposta jurídica sólida — construída para durar, não apenas para resolver o momento.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-cream py-24 lg:py-36">
      <img
        src="/assets/monogram-watermark.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-4 hidden h-[42rem] w-auto opacity-[0.05] mix-blend-multiply lg:block"
      />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <Reveal>
          <Eyebrow>Como Funciona</Eyebrow>
          <h2 className="max-w-sm text-[1.85rem] font-normal leading-[1.25] tracking-tight text-coffee sm:text-[2.15rem]">
            Um caminho claro, do primeiro contato à solução.
          </h2>
          <p className="mt-5 max-w-md text-[0.975rem] leading-relaxed text-ink/70">
            Cada etapa é pensada para trazer segurança e transparência a um momento sensível.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-9 inline-flex items-center gap-3 rounded-full bg-coffee px-8 py-3.5 text-[0.8rem] font-medium tracking-wide text-cream shadow-sm transition-all duration-300 hover:gap-4 hover:bg-coffee/90 hover:shadow-md"
          >
            Dar o Primeiro Passo
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </a>
        </Reveal>

        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.1}>
              <div
                className={`flex gap-6 pb-8 ${
                  i < STEPS.length - 1 ? "border-b border-coffee/15" : ""
                }`}
              >
                <span className="font-serif text-xl text-coffee-light">{step.number}</span>
                <div>
                  <h3 className="font-serif text-[1.05rem] text-coffee">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{step.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
