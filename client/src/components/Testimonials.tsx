import { trpc } from "../lib/trpc";
import Reveal from "./Reveal";
import Stars from "./Stars";

export default function Testimonials() {
  const { data: testimonials, isLoading } = trpc.testimonials.list.useQuery();

  return (
    <section className="bg-surface py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-coffee sm:text-4xl">
            O que Nossos Clientes Dizem
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            Histórias reais de clientes que confiaram em nossa expertise
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-white/60" />
            ))}

          {testimonials?.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.1}>
              <div className="h-full rounded-lg border-l-4 border-coffee bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                <Stars rating={t.rating} />
                <p className="mt-3 text-sm leading-relaxed text-ink/80">"{t.content}"</p>
                <div className="mt-4 flex items-center gap-3">
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
      </div>
    </section>
  );
}
