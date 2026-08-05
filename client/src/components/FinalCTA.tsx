import { Link } from "react-router-dom";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-coffee py-24 text-cream lg:py-32">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "url(/assets/pattern-monogram.jpg)",
          backgroundSize: "260px 260px",
          backgroundRepeat: "repeat",
        }}
      />
      <Reveal className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <img src="/assets/mono-light.png" alt="" aria-hidden className="mx-auto mb-7 h-9 w-auto opacity-60" />
        <h2 className="text-[1.85rem] font-normal leading-[1.25] tracking-tight sm:text-[2.25rem]">
          Decidir bem começa com uma boa conversa.
        </h2>
        <p className="mt-4 text-[0.975rem] text-cream/70 sm:text-base">
          Marque a sua e saia com clareza sobre os próximos passos.
        </p>
        <Link
          to="/#contato"
          className="group mt-9 inline-flex items-center gap-3 rounded-full bg-cream px-9 py-3.5 text-[0.8rem] font-medium tracking-wide text-coffee shadow-sm transition-all duration-300 hover:gap-4 hover:shadow-md"
        >
          Marcar uma Conversa
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </Link>
      </Reveal>
    </section>
  );
}
