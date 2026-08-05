import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import Reveal from "./Reveal";
import Stars from "./Stars";
import Eyebrow from "./Eyebrow";

export default function Testimonials() {
  const { data: testimonials, isLoading } = trpc.testimonials.list.useQuery();

  return (
    <section className="bg-cream py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow align="center">Confiança Construída</Eyebrow>
          <h2 className="text-[1.85rem] font-normal leading-[1.25] tracking-tight text-coffee sm:text-[2.15rem]">
            A confiança de quem já viveu o processo
          </h2>
          <p className="mt-4 text-[0.975rem] leading-relaxed text-ink/70">
            Casos reais, conduzidos com técnica e proximidade — na voz de quem confiou o próprio
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
              <div className="h-full rounded-md border border-coffee-light/15 bg-white p-7 transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(59,31,14,0.08)]">
                <span className="font-serif text-3xl leading-none text-coffee-light/40">"</span>
                <Stars rating={t.rating} />
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink/75">{t.content}</p>
                <div className="mt-6 flex items-center gap-3 border-t border-coffee/10 pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-coffee text-xs font-medium text-cream">
                    {t.authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-coffee">{t.authorName}</p>
                    {t.profession && <p className="text-xs text-ink/55">{t.profession}</p>}
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
