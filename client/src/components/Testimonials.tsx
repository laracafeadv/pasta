import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import Reveal from "./Reveal";
import Stars from "./Stars";

export default function Testimonials() {
  const { data: testimonials, isLoading } = trpc.testimonials.list.useQuery();

  return (
    <section className="bg-surface py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-coffee-light">
            Confiança Construída
          </p>
          <h2 className="font-serif text-3xl font-semibold text-coffee sm:text-4xl">
            Quem já esteve aqui, hoje está mais tranquilo
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            Casos reais, resolvidos com técnica e proximidade — na voz de quem confiou o próprio
            caso a este trabalho.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-white/60" />
            ))}

          {testimonials?.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.1}>
              <div className="h-full rounded-lg border-l-4 border-coffee bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                <Stars rating={t.rating} />
                <p className="mt-3 text-sm leading-relaxed text-ink/80">"{t.content}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coffee text-sm font-semibold text-cream">
                    {t.authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-coffee">{t.authorName}</p>
                    {t.profession && <p className="text-xs text-ink/60">{t.profession}</p>}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-14 text-center">
          <Link
            to="/#contato"
            className="inline-block text-sm font-semibold uppercase tracking-wide text-coffee underline decoration-coffee-light/50 underline-offset-4 transition-colors hover:decoration-coffee"
          >
            Quero ser o próximo caso bem resolvido
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
