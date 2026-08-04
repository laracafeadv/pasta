import { Link } from "react-router-dom";
import Reveal from "./Reveal";

export default function Attendance() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-coffee sm:text-4xl">
            Como Funciona o Meu Atendimento
          </h2>
        </Reveal>

        <Reveal delay={0.15} className="mt-10">
          <div className="mx-auto max-w-2xl rounded-lg border border-coffee-light/30 border-l-4 border-l-coffee bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coffee/10 text-coffee">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
                  <rect x="2.5" y="6" width="14" height="12" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21.5 8-4.5 3.2v1.6l4.5 3.2V8Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-coffee">
                  Online para todo o Brasil
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  Realizado por vídeo chamada segura e sigilosa, o atendimento online oferece
                  praticidade e conforto para clientes em qualquer lugar.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/#contato"
              className="inline-block rounded-sm bg-coffee px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee/90 hover:shadow-lg"
            >
              Quero Começar Minha Consultoria Jurídica
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
