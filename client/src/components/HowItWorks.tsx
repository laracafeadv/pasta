import Reveal from "./Reveal";

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
    <section className="bg-cream py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-coffee-light">
            Como Funciona
          </p>
          <h2 className="font-serif text-3xl font-semibold text-coffee sm:text-4xl">
            Um caminho claro, do primeiro contato à solução.
          </h2>
        </Reveal>

        <div className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 hidden h-px bg-coffee/15 lg:block"
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.1}>
              <div className="relative">
                <span className="relative z-10 inline-block bg-cream pr-4 font-serif text-2xl text-coffee-light">
                  {step.number}
                </span>
                <h3 className="mt-4 font-serif text-lg font-semibold text-coffee">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink/70">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
