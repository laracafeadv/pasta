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
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 hidden h-[36rem] w-[36rem] rounded-full border border-coffee-light/25 lg:block"
      />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <Reveal>
          <Eyebrow>Como Funciona</Eyebrow>
          <h2 className="font-serif text-3xl font-medium leading-tight text-coffee sm:text-4xl">
            Um caminho claro, do primeiro contato à solução.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink/70">
            Cada etapa é pensada para trazer segurança e transparência a um momento sensível.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-9 inline-block rounded-full bg-coffee px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee/90 hover:shadow-lg"
          >
            Dar o Primeiro Passo
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
                <span className="font-serif text-2xl text-coffee-light">{step.number}</span>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-coffee">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">{step.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
