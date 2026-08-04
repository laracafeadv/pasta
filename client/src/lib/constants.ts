export const WHATSAPP_NUMBER = "5511999999999";
export const WHATSAPP_DEFAULT_MESSAGE =
  "Olá! Gostaria de agendar uma consulta com a Dra. Lara Café.";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_DEFAULT_MESSAGE
)}`;

export const NAV_LINKS = [
  { label: "Home", href: "/#home" },
  { label: "Sobre mim", href: "/#sobre" },
  { label: "Especialidades", href: "/#especialidades" },
  { label: "Blog", href: "/blog" },
  { label: "Contato", href: "/#contato" },
];
