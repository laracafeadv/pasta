import SEO from "../components/SEO";
import Hero from "../components/Hero";
import About from "../components/About";
import Specialties from "../components/Specialties";
import HowItWorks from "../components/HowItWorks";
import Testimonials from "../components/Testimonials";
import FinalCTA from "../components/FinalCTA";
import ContactSection from "../components/ContactSection";
import SectionDivider from "../components/SectionDivider";

export default function Home() {
  return (
    <>
      <SEO
        title="Lara Café Advocacia | Direito de Família e Sucessões"
        description="Advocacia estratégica em Direito de Família e Sucessões, com discrição e proximidade em cada etapa do caso."
      />
      <Hero />
      <SectionDivider />
      <About />
      <SectionDivider />
      <Specialties />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <Testimonials />
      <FinalCTA />
      <ContactSection />
    </>
  );
}
