import SEO from "../components/SEO";
import Hero from "../components/Hero";
import About from "../components/About";
import Specialties from "../components/Specialties";
import Testimonials from "../components/Testimonials";
import FinalCTA from "../components/FinalCTA";
import ContactSection from "../components/ContactSection";

export default function Home() {
  return (
    <>
      <SEO
        title="Lara Café Advocacia | Direito de Família, Sucessões e Patrimonial"
        description="Advocacia estratégica em Direito de Família, Sucessões e Direito Patrimonial. Atendimento particular, sigiloso e por videochamada para todo o Brasil."
      />
      <Hero />
      <About />
      <Specialties />
      <Testimonials />
      <FinalCTA />
      <ContactSection />
    </>
  );
}
