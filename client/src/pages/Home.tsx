import SEO from "../components/SEO";
import Hero from "../components/Hero";
import About from "../components/About";
import Specialties from "../components/Specialties";
import HowItWorks from "../components/HowItWorks";
import ContactSection from "../components/ContactSection";
import EditorialBand from "../components/EditorialBand";

export default function Home() {
  return (
    <>
      <SEO
        title="Lara Café Advocacia | Direito de Família e Sucessões"
        description="Advocacia estratégica em Direito de Família e Sucessões, com discrição e proximidade em cada etapa do caso."
      />
      <Hero />
      <About />
      <Specialties />
      <HowItWorks />
      <EditorialBand />
      <ContactSection />
    </>
  );
}
