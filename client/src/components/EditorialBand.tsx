import Reveal from "./Reveal";

export default function EditorialBand() {
  return (
    <section className="relative overflow-hidden bg-coffee py-20 lg:py-28">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "url(/assets/pattern-monogram.jpg)",
          backgroundSize: "260px 260px",
          backgroundRepeat: "repeat",
        }}
      />
      <img
        src="/assets/monogram-outline.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-auto -translate-x-1/2 -translate-y-1/2 opacity-[0.05] invert sm:h-[34rem]"
      />

      <Reveal className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <span className="mx-auto mb-6 block h-px w-10 bg-cream/50" aria-hidden />
        <p className="font-serif text-[1.4rem] italic leading-snug text-cream sm:text-[1.65rem]">
          Decisões importantes merecem tempo, escuta e a orientação certa.
        </p>
      </Reveal>
    </section>
  );
}
