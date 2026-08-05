import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import Eyebrow from "./Eyebrow";

const BIO_PARAGRAPHS = [
  "Sou advogada com atuação dedicada ao Direito das Famílias e Sucessões, áreas em que o Direito encontra aspectos profundamente humanos: relações construídas ao longo da vida, patrimônios formados com esforço e decisões que podem transformar o futuro.",
  "Escolhi essa área por compreender que cada questão jurídica carrega uma história única. Mais do que analisar documentos ou apresentar caminhos processuais, é preciso compreender o contexto, os objetivos e aquilo que realmente importa para cada pessoa.",
  "Acredito que uma boa advocacia começa antes da solução jurídica. Ela nasce da escuta atenta, da compreensão das particularidades de cada caso e da construção de uma estratégia que respeite a realidade e os interesses envolvidos.",
  "Minha atuação é baseada na união entre conhecimento técnico, planejamento e cuidado. Cada orientação é desenvolvida de forma personalizada, buscando oferecer clareza e segurança para que decisões importantes sejam tomadas com mais tranquilidade.",
  "Meu compromisso é conduzir cada etapa com discrição, responsabilidade e estratégia, auxiliando meus clientes na proteção de suas relações, seus patrimônios e seus projetos de futuro.",
];

const PILLARS = [
  {
    title: "Estratégia",
    text: "Uma decisão bem orientada começa com uma análise completa do cenário, considerando os aspectos jurídicos, familiares e patrimoniais envolvidos.",
  },
  {
    title: "Discrição",
    text: "Questões familiares e patrimoniais exigem uma condução cuidadosa, baseada em confiança, confidencialidade e respeito.",
  },
  {
    title: "Clareza",
    text: "O Direito deve ser compreendido por quem precisa tomar decisões. Meu papel é traduzir questões complexas em orientações objetivas e seguras.",
  },
  {
    title: "Planejamento",
    text: "Antecipar cenários e estruturar soluções jurídicas permite preservar aquilo que foi construído e proporcionar mais segurança para o futuro.",
  },
];

export default function About() {
  return (
    <section id="sobre" className="scroll-mt-28 lg:scroll-mt-32 bg-cream py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-16">
          <Reveal>
            <div className="relative mx-auto max-w-md lg:sticky lg:top-32 lg:max-w-none">
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
              Uma advocacia construída a partir de histórias, escolhas e decisões importantes.
            </h2>

            <div className="mt-6 space-y-4 text-[0.975rem] leading-relaxed text-ink/70">
              {BIO_PARAGRAPHS.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            <Link
              to="/#areas-de-atuacao"
              className="group mt-9 inline-flex items-center gap-2 text-[0.8rem] font-medium tracking-wide text-coffee"
            >
              Ver Áreas de Atuação
              <span className="h-px w-5 bg-coffee transition-all duration-300 group-hover:w-8" />
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-20 border-t border-coffee/12 pt-16 lg:mt-28 lg:pt-20">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
            <div>
              <h3 className="max-w-sm text-[1.5rem] font-normal leading-[1.3] tracking-tight text-coffee sm:text-[1.75rem]">
                O cuidado por trás de cada decisão
              </h3>
              <p className="mt-4 max-w-sm text-[0.9rem] leading-relaxed text-ink/65">
                Cada caso possui suas próprias particularidades. Por isso, acredito em uma
                advocacia que não oferece respostas prontas, mas constrói caminhos jurídicos
                adequados à realidade de cada cliente.
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:pl-6">
              {PILLARS.map((pillar) => (
                <div key={pillar.title} className="border-t border-coffee/12 pt-4">
                  <dt className="font-serif text-[1.05rem] text-coffee">{pillar.title}</dt>
                  <dd className="mt-1.5 text-[0.875rem] leading-relaxed text-ink/60">
                    {pillar.text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
