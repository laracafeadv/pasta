import SEO from "../components/SEO";
import Hero from "../components/Hero";
import Specialties from "../components/Specialties";
import About from "../components/About";
import Attendance from "../components/Attendance";
import Testimonials from "../components/Testimonials";
import FinalCTA from "../components/FinalCTA";
import ContactSection from "../components/ContactSection";

export default function Home() {
  return (
    <>
      <SEO
        title="Lara Café Advocacia | Direito de Família, Sucessões e Patrimonial"
        description="Escritório especializado em Direito de Família, Sucessões e Direito Patrimonial. Atendimento online, estratégico e sigiloso para todo o Brasil."
      />
      <Hero />
      <Specialties />
      <About />
      <Attendance />
      <Testimonials />
      <FinalCTA />
      <ContactSection />
    </>
  );
}
