import { Link } from "react-router-dom";
import { CONTACT_EMAIL, NAV_LINKS, WHATSAPP_DISPLAY, WHATSAPP_URL } from "../lib/constants";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-coffee text-cream">
      <img
        src="/assets/monogram-outline.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-auto opacity-[0.04] invert sm:h-80"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 md:grid-cols-4 md:gap-8">
          <div>
            <img
              src="/assets/logo-lockup-light.png"
              alt="Lara Café Advocacia"
              className="mb-5 h-12 w-auto object-contain"
            />
            <p className="max-w-xs text-sm leading-relaxed text-cream/70">
              Advocacia estratégica em Direito de Família e Sucessões — orientação clara,
              sigilosa e humana, para clientes em todo o Brasil.
            </p>
          </div>

          <div>
            <h3 className="mb-5 font-serif text-lg">Navegação</h3>
            <ul className="space-y-2.5 text-sm text-cream/70">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="transition-colors hover:text-cream">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 font-serif text-lg">Contato</h3>
            <ul className="space-y-2.5 text-sm text-cream/70">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-cream"
                >
                  WhatsApp: {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-cream">
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="pt-1 text-cream/50">Segunda à sexta, das 8h às 18h</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-5 font-serif text-lg">Redes Sociais</h3>
            <div className="flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/25 transition-all duration-200 hover:-translate-y-0.5 hover:border-cream/60 hover:bg-cream/10"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/25 transition-all duration-200 hover:-translate-y-0.5 hover:border-cream/60 hover:bg-cream/10"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M16.6 5.82c-1.01-.87-1.61-2.13-1.61-3.52h-3.2v13.44c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .58.05.85.13V9.66a6.13 6.13 0 0 0-.85-.06 6.1 6.1 0 1 0 6.1 6.1V9.4a9.34 9.34 0 0 0 5.47 1.75V7.96a6.09 6.09 0 0 1-3.86-2.14z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/25 transition-all duration-200 hover:-translate-y-0.5 hover:border-cream/60 hover:bg-cream/10"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.558V9h3.556v11.452z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-cream/10 pt-7 text-xs text-cream/50 sm:flex-row">
          <p>© 2026 Lara Café Advocacia — Todos os direitos reservados.</p>
          <Link to="/politica-de-privacidade" className="transition-colors hover:text-cream">
            Políticas de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
