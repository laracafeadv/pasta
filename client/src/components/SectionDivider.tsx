export default function SectionDivider() {
  return (
    <div className="relative border-t border-coffee/10" aria-hidden>
      <img
        src="/assets/monogram-outline.png"
        alt=""
        className="absolute left-1/2 top-0 h-5 w-auto -translate-x-1/2 -translate-y-1/2 bg-cream px-2 opacity-60"
      />
    </div>
  );
}
