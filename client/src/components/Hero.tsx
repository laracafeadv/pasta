import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Eyebrow from "./Eyebrow";
import { WHATSAPP_URL } from "../lib/constants";

export default function Hero() {
  return (
    <section id="home" className="scroll-mt-28 lg:scroll-mt-32 relative overflow-hidden bg-cream">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "url(/assets/pattern-monogram-light.jpg)",
          backgroundSize: "280px 280px",
          backgroundRepeat: "repeat",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-8 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="order-2 lg:order-1"
        >
          <Eyebrow>Advocacia de Família e Sucessões</Eyebrow>
          <h1 className="max-w-xl text-[2.35rem] font-normal leading-[1.22] tracking-tight text-coffee sm:text-[2.75rem] lg:text-[3rem]">
            Uma advocacia pensada para os capítulos mais delicados da vida de uma família.
          </h1>
          <p className="mt-6 max-w-md text-[0.975rem] leading-relaxed text-ink/70 sm:text-base">
            Divórcio, partilha, inventário, uniões e planejamentos — conduzidos com técnica
            apurada, sigilo absoluto e a presença de quem entende que, por trás de cada processo,
            existe uma história real.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 rounded-full bg-coffee px-8 py-3.5 text-[0.8rem] font-medium tracking-wide text-cream shadow-sm transition-all duration-300 hover:gap-4 hover:bg-coffee/90 hover:shadow-md"
            >
              Conversar em Sigilo
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </a>
            <Link
              to="/#sobre"
              className="group inline-flex items-center gap-2 text-[0.8rem] font-medium tracking-wide text-coffee"
            >
              Conhecer Minha Abordagem
              <span className="h-px w-5 bg-coffee transition-all duration-300 group-hover:w-8" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
          className="order-1 flex justify-center lg:order-2 lg:justify-end"
        >
          <div className="relative w-full max-w-sm">
            <div className="absolute -inset-3 -z-10 rounded-tr-[5rem] border border-coffee/15 sm:-inset-4" />
            <div className="absolute -right-5 -top-5 -z-20 h-full w-full rounded-tr-[5rem] bg-coffee-light/15 sm:-right-6 sm:-top-6" />

            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-tr-[5rem] shadow-2xl">
              <img
                src="/assets/lara-foto-duotone.jpg"
                alt="Lara Café, advogada especialista em Direito de Família e Sucessões"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-coffee/25 via-transparent to-transparent" />
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-2 -left-2 select-none text-[10px] font-medium uppercase tracking-[0.3em] text-coffee-light/70 [writing-mode:vertical-rl] sm:-bottom-3 sm:-left-3"
            >
              Lara Café — Advocacia
            </div>

            <img
              src="/assets/mono-light.png"
              alt=""
              aria-hidden
              className="absolute -bottom-5 -right-5 h-16 w-auto rounded-full bg-coffee p-4 shadow-lg sm:h-20 sm:p-5"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
