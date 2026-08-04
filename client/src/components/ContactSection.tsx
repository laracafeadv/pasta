import Reveal from "./Reveal";
import ContactForm from "./ContactForm";
import { WHATSAPP_URL } from "../lib/constants";

export default function ContactSection() {
  return (
    <section id="contato" className="bg-white py-16 lg:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <Reveal>
          <h2 className="font-serif text-3xl font-semibold text-coffee sm:text-4xl">
            Fale com a Dra. Lara Café
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/70">
            Preencha o formulário ao lado ou, se preferir, fale diretamente pelo WhatsApp.
            Retornaremos o mais breve possível.
          </p>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-sm border border-coffee px-6 py-3 text-sm font-semibold uppercase tracking-wide text-coffee transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee hover:text-cream"
          >
            Falar no WhatsApp
          </a>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="rounded-lg border border-coffee-light/20 bg-cream p-6 shadow-sm sm:p-8">
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
