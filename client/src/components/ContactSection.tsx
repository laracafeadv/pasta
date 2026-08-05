import Reveal from "./Reveal";
import ContactForm from "./ContactForm";
import Eyebrow from "./Eyebrow";
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_URL } from "../lib/constants";

export default function ContactSection() {
  return (
    <section id="contato" className="scroll-mt-28 lg:scroll-mt-32 bg-cream py-24 lg:py-36">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <Reveal>
          <Eyebrow>Fale Comigo</Eyebrow>
          <h2 className="max-w-md text-[1.85rem] font-normal leading-[1.25] tracking-tight text-coffee sm:text-[2.15rem]">
            O primeiro passo é uma conversa
          </h2>
          <p className="mt-5 max-w-md text-[0.975rem] leading-relaxed text-ink/70">
            Conte, em poucas palavras, o que está acontecendo. Eu leio com atenção e retorno
            pessoalmente com os próximos passos possíveis para o seu caso.
          </p>

          <div className="mt-9 space-y-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-lg border border-coffee-light/20 bg-white px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-coffee/40 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coffee/10 text-coffee">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold text-coffee">WhatsApp</span>
                <span className="block text-sm text-ink/60">{WHATSAPP_DISPLAY}</span>
              </span>
            </a>

            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-4 rounded-lg border border-coffee-light/20 bg-white px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-coffee/40 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coffee/10 text-coffee">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold text-coffee">E-mail</span>
                <span className="block text-sm text-ink/60">{CONTACT_EMAIL}</span>
              </span>
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="rounded-xl border border-coffee-light/20 bg-white p-6 shadow-sm sm:p-8">
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
