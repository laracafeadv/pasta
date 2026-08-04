import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { WHATSAPP_URL } from "../lib/constants";

export default function Hero() {
  return (
    <section id="home" className="scroll-mt-28 lg:scroll-mt-32 relative overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="order-2 lg:order-1"
        >
          <p className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-coffee-light">
            Direito de Família e Sucessões
          </p>
          <h1 className="font-serif text-4xl font-medium leading-[1.15] text-coffee sm:text-5xl lg:text-[3.2rem]">
            Para os momentos que só se enfrentam uma vez.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/80 sm:text-lg">
            Cuido de questões de família e sucessão nos momentos que mais pesam na vida de
            alguém — com rigor técnico, sigilo absoluto e a proximidade de quem acompanha cada
            etapa até a solução.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-coffee px-8 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-cream shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee/90 hover:shadow-lg"
            >
              Iniciar uma Conversa Reservada
            </a>
            <Link
              to="/#sobre"
              className="rounded-full border border-coffee bg-white px-8 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-coffee transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee hover:text-cream"
            >
              Conhecer meu Trabalho
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
          className="order-1 flex justify-center lg:order-2 lg:justify-end"
        >
          <div className="relative w-full max-w-md">
            <div className="absolute -inset-4 -z-10 rounded-tr-[6rem] bg-coffee-light/20 sm:-inset-6" />
            <img
              src="/assets/lara-foto.png"
              alt="Lara Café, advogada especialista em Direito de Família e Sucessões"
              className="aspect-[2/3] w-full rounded-tr-[6rem] object-cover shadow-2xl"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
