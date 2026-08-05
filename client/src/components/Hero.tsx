import { motion } from "framer-motion";
import Eyebrow from "./Eyebrow";
import { WHATSAPP_URL } from "../lib/constants";

export default function Hero() {
  return (
    <section
      id="home"
      className="scroll-mt-28 lg:scroll-mt-32 relative flex min-h-[88vh] items-end overflow-hidden bg-coffee sm:min-h-[92vh]"
    >
      <img
        src="/assets/support-veil-embrace.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-[75%_center]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-coffee via-coffee/55 to-coffee/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-coffee/40 via-transparent to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24"
      >
        <div className="max-w-xl">
          <Eyebrow light>Advocacia de Família e Sucessões</Eyebrow>
          <h1 className="text-[2.35rem] font-normal leading-[1.22] tracking-tight text-cream sm:text-[2.75rem] lg:text-[3rem]">
            Uma advocacia pensada para os capítulos mais delicados da vida de uma família.
          </h1>
          <p className="mt-6 max-w-md text-[0.975rem] leading-relaxed text-cream/75 sm:text-base">
            Divórcio, partilha, inventário, uniões e planejamentos — conduzidos com técnica
            apurada, sigilo absoluto e a presença de quem entende que, por trás de cada processo,
            existe uma história real.
          </p>
          <div className="mt-10">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 rounded-full bg-cream px-9 py-4 text-[0.85rem] font-medium tracking-wide text-coffee shadow-md transition-all duration-300 hover:gap-4 hover:shadow-lg"
            >
              Conversar em Sigilo
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </a>
          </div>
        </div>
      </motion.div>

      <img
        src="/assets/mono-light.png"
        alt=""
        aria-hidden
        className="absolute right-6 top-6 h-9 w-auto opacity-70 sm:right-10 sm:top-10 sm:h-11"
      />
    </section>
  );
}
