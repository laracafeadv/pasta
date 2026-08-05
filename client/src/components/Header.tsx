import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { NAV_LINKS } from "../lib/constants";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-coffee text-cream transition-shadow duration-300 ${
        scrolled ? "shadow-lg shadow-black/10" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to="/#home" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img
            src="/assets/logo-lockup-light.png"
            alt="Lara Café Advocacia"
            className="h-10 w-auto object-contain sm:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="group relative py-1 font-sans text-[13px] font-medium uppercase tracking-wider text-cream/85 transition-colors hover:text-cream"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-cream transition-all duration-300 ease-out group-hover:w-full" />
            </Link>
          ))}
          <Link
            to="/#contato"
            className="rounded-full border border-cream/40 px-5 py-2 text-[13px] font-medium uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 hover:border-cream hover:bg-cream hover:text-coffee"
          >
            Marcar uma Conversa
          </Link>
        </nav>

        <button
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <motion.span
            animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            className="h-0.5 w-6 bg-cream"
          />
          <motion.span
            animate={open ? { opacity: 0 } : { opacity: 1 }}
            className="h-0.5 w-6 bg-cream"
          />
          <motion.span
            animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            className="h-0.5 w-6 bg-cream"
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-cream/10 md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4 sm:px-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded px-2 py-2.5 text-sm font-medium uppercase tracking-wide text-cream/90 hover:bg-cream/10"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/#contato"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full border border-cream/40 px-4 py-2.5 text-center text-sm font-medium uppercase tracking-wide"
              >
                Marcar uma Conversa
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
