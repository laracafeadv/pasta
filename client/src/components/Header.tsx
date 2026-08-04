import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { NAV_LINKS } from "../lib/constants";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-coffee text-cream shadow-md">
      <div className="border-b border-cream/10 bg-coffee/95">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-xs tracking-wide text-cream/80 sm:px-6 lg:px-8">
          Atendimento para todo o Brasil
        </p>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
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
              className="font-sans text-sm font-medium uppercase tracking-wide text-cream/90 transition-colors hover:text-cream"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/#contato"
            className="rounded-sm border border-cream/40 px-5 py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:bg-cream hover:text-coffee"
          >
            Agendar Consulta
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
                className="mt-2 rounded-sm border border-cream/40 px-4 py-2.5 text-center text-sm font-medium uppercase tracking-wide"
              >
                Agendar Consulta
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
