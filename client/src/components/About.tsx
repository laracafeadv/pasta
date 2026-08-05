import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import Eyebrow from "./Eyebrow";

const PILLARS = [
  {
    title: "Estratégia",
    text: "Decisões pensadas para o seu cenário específico — nunca copiadas de um modelo padrão.",
  },
  {
    title: "Prevenção",
    text: "Antecipar riscos custa menos, em tempo e desgaste, do que remediá-los depois.",
  },
  {
    title: "Sigilo",
    text: "Sua história é tratada com discrição absoluta, do primeiro contato ao desfecho do caso.",
  },
  {
    title: "Clareza",
    text: "Você decide com informação — a lei traduzida em linguagem que faz sentido.",
  },
];

export default function About() {
  return (
    <section id="sobre" className="scroll-mt-28 lg:scroll-mt-32 bg-cream py-24 lg:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-lg lg:max-w-none">
            <img
              src="/assets/monogram-outline.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-14 -z-20 h-40 w-auto opacity-[0.14] sm:-right-14 sm:-top-16 sm:h-52"
            />
            <div
              aria-hidden
              className="absolute -inset-5 -z-10 rounded-[2.5rem] border border-coffee/15 sm:-inset-6"
            />
            <div
              aria-hidden
              className="absolute -inset-3 -z-10 rounded-[2.25rem] bg-coffee-light/15 sm:-inset-4"
            />
            <img
              src="/assets/lara-foto.png"
              alt="Lara Café, advogada especialista em Direito de Família e Sucessões"
              className="aspect-[4/5] w-full rounded-[2rem] rounded-tr-[5rem] object-cover shadow-2xl"
            />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="absolute -bottom-6 left-1/2 w-[85%] -translate-x-1/2 rounded-lg bg-white px-6 py-4 text-center shadow-xl sm:left-6 sm:w-auto sm:translate-x-0 sm:text-left"
            >
              <p className="font-serif text-lg font-semibold text-coffee">Lara Café</p>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-ink/50">
                Direito de Família e Sucessões
              </p>
            </motion.div>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="lg:pl-4">
          <Eyebrow>Sobre mim</Eyebrow>
          <h2 className="font-serif text-3xl font-medium leading-tight text-coffee sm:text-4xl">
            Sobre a Lara Café
          </h2>

          <div className="mt-6 space-y-4 text-base leading-relaxed text-ink/80">
            <p>
              Existem decisões que não cabem em modelos prontos. Herança, separação, partilha de
              bens — cada uma dessas situações carrega camadas que vão muito além do processo
              judicial, e é nesse espaço, entre a técnica e o que realmente importa para cada
              pessoa, que concentro a minha prática.
            </p>
            <p>
              Formei-me para o rigor técnico; a experiência me ensinou a escutar. Conduzo casos
              de Direito de Família e Sucessões a partir de uma premissa simples: informação
              clara, sigilo absoluto e presença real em cada etapa — da primeira conversa até a
              resolução do caso.
            </p>
            <p>
              Mais do que representar, procuro estar ao lado de quem me procura nos momentos em
              que uma decisão bem pensada muda o rumo das coisas — para você e para as gerações
              que vêm depois.
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="border-t border-coffee/15 pt-4">
                <dt className="font-serif text-base font-semibold text-coffee">{pillar.title}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink/70">{pillar.text}</dd>
              </div>
            ))}
          </dl>

          <blockquote className="mt-10 border-l-4 border-coffee pl-5 font-serif text-lg italic leading-snug text-coffee-light">
            "O cuidado que se tem hoje é o que sustenta o amanhã."
          </blockquote>

          <Link
            to="/#areas-de-atuacao"
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-coffee px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee/90 hover:shadow-lg"
          >
            Ver Áreas de Atuação
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
