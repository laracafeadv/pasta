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
    <section id="sobre" className="scroll-mt-28 lg:scroll-mt-32 bg-cream py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <img
              src="/assets/monogram-outline.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-16 -z-20 h-44 w-auto opacity-[0.12] sm:-right-16 sm:-top-20 sm:h-56"
            />
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-[2rem] border border-coffee/12 sm:-inset-5"
            />
            <img
              src="/assets/lara-foto.png"
              alt="Lara Café, advogada especialista em Direito de Família e Sucessões"
              className="aspect-[4/5] w-full rounded-[1.75rem] rounded-tr-[4.5rem] object-cover shadow-xl"
            />

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="absolute -bottom-5 left-1/2 w-[80%] -translate-x-1/2 rounded-md bg-white px-5 py-3.5 text-center shadow-lg sm:left-6 sm:w-auto sm:translate-x-0 sm:text-left"
            >
              <p className="font-serif text-base text-coffee">Lara Café</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-ink/45">
                Direito de Família e Sucessões
              </p>
            </motion.div>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="lg:pl-6">
          <Eyebrow>Sobre mim</Eyebrow>
          <h2 className="max-w-lg text-[1.85rem] font-normal leading-[1.25] tracking-tight text-coffee sm:text-[2.15rem]">
            Técnica e escuta não competem — se completam.
          </h2>

          <div className="mt-6 space-y-4 text-[0.975rem] leading-relaxed text-ink/70">
            <p>
              Herança, separação, partilha de bens: são situações que carregam camadas muito
              além do processo judicial. É nesse espaço — entre a técnica e o que realmente
              importa para cada pessoa — que concentro a minha prática.
            </p>
            <p>
              Formei-me para o rigor; a rotina me ensinou a ouvir antes de agir. Conduzo cada
              caso de Direito de Família e Sucessões a partir de uma premissa simples:
              informação clara, sigilo absoluto e presença real, da primeira conversa à
              resolução.
            </p>
            <p>
              Mais do que representar, procuro estar ao lado de quem me procura — nos momentos
              em que uma decisão bem pensada muda o rumo das coisas, para quem vive hoje e para
              quem vem depois.
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="border-t border-coffee/12 pt-4">
                <dt className="font-serif text-[1.05rem] text-coffee">{pillar.title}</dt>
                <dd className="mt-1.5 text-[0.875rem] leading-relaxed text-ink/60">
                  {pillar.text}
                </dd>
              </div>
            ))}
          </dl>

          <blockquote className="mt-10 border-l-2 border-coffee-light pl-5 font-serif text-[1.1rem] italic leading-snug text-coffee-light">
            "O cuidado que se tem hoje é o que sustenta o amanhã."
          </blockquote>

          <Link
            to="/#areas-de-atuacao"
            className="group mt-9 inline-flex items-center gap-2 text-[0.8rem] font-medium tracking-wide text-coffee"
          >
            Ver Áreas de Atuação
            <span className="h-px w-5 bg-coffee transition-all duration-300 group-hover:w-8" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
