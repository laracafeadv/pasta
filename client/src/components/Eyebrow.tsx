interface EyebrowProps {
  children: string;
  light?: boolean;
  align?: "left" | "center";
}

export default function Eyebrow({ children, light = false, align = "left" }: EyebrowProps) {
  return (
    <p
      className={`mb-3 flex items-center gap-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] ${
        light ? "text-cream/70" : "text-coffee-light"
      } ${align === "center" ? "justify-center" : ""}`}
    >
      <span className={`h-px w-6 shrink-0 ${light ? "bg-cream/50" : "bg-coffee-light/60"}`} />
      {children}
    </p>
  );
}
