import { motion } from "framer-motion";
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
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-coffee/85 via-coffee/25 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24"
      >
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex max-w-xl items-baseline gap-3"
        >
          <span className="font-serif text-[1.6rem] italic leading-snug text-cream sm:text-[2rem]">
            Todo compromisso — construído ou desfeito — merece ser conduzido com o mesmo cuidado.
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 shrink-0 self-center text-cream/70 transition-transform duration-300 group-hover:translate-x-1"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </a>
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
