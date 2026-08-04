import SEO from "../components/SEO";
import Hero from "../components/Hero";
import About from "../components/About";
import Specialties from "../components/Specialties";
import HowItWorks from "../components/HowItWorks";
import Testimonials from "../components/Testimonials";
import FinalCTA from "../components/FinalCTA";
import ContactSection from "../components/ContactSection";

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
      <Testimonials />
      <FinalCTA />
      <ContactSection />
    </>
  );
}
