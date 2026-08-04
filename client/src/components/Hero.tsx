import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { WHATSAPP_URL } from "../lib/constants";

export default function Hero() {
  return (
    <section
      id="home"
      className="scroll-mt-28 lg:scroll-mt-32 relative overflow-hidden bg-cream"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[32rem] w-[32rem] rounded-full bg-coffee-light/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-coffee/5 blur-3xl"
      />
      <img
        src="/assets/mono-dark.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 hidden w-[26rem] opacity-[0.05] mix-blend-multiply lg:block"
      />

      <div className="relative mx-auto flex min-h-[86vh] max-w-4xl flex-col items-center justify-center px-4 py-28 text-center sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-coffee-light"
        >
          Direito de Família · Sucessões · Direito Patrimonial
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="font-serif text-[2.5rem] font-semibold leading-[1.15] text-coffee sm:text-5xl lg:text-6xl"
        >
          Segurança jurídica para proteger quem você ama e o que você construiu.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="mx-auto mt-7 max-w-2xl text-balance text-base leading-relaxed text-ink/75 sm:text-lg"
        >
          Assessoria jurídica estratégica em decisões de família, herança e patrimônio —
          conduzida com técnica, discrição e a clareza que você precisa para decidir com
          confiança. Atendimento particular, por videochamada, para todo o Brasil.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm bg-coffee px-9 py-4 text-center text-sm font-semibold uppercase tracking-wide text-cream shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee/90 hover:shadow-xl"
          >
            Marcar uma Conversa Reservada
          </a>
          <Link
            to="/#sobre"
            className="rounded-sm border border-coffee/30 px-9 py-4 text-center text-sm font-semibold uppercase tracking-wide text-coffee transition-all duration-200 hover:-translate-y-0.5 hover:border-coffee hover:bg-white"
          >
            Conhecer meu Trabalho
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="relative hidden justify-center pb-10 sm:flex"
      >
        <Link
          to="/#sobre"
          aria-label="Rolar para a seção Sobre"
          className="flex flex-col items-center gap-2 text-coffee-light transition-colors hover:text-coffee"
        >
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </motion.span>
        </Link>
      </motion.div>
    </section>
  );
}
