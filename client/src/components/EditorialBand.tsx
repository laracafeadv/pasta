import { motion } from "framer-motion";

export default function EditorialBand() {
  return (
    <section className="relative h-[65vh] min-h-[420px] max-h-[560px] overflow-hidden bg-coffee">
      <motion.img
        src="/assets/support-veil-embrace.jpg"
        alt=""
        aria-hidden
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-coffee to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex h-full max-w-3xl flex-col justify-end px-4 pb-14 sm:px-6 lg:px-8 lg:pb-16"
      >
        <span className="mb-5 h-px w-10 bg-cream/50" aria-hidden />
        <p className="max-w-md font-serif text-[1.4rem] italic leading-snug text-cream sm:text-[1.65rem]">
          Todo compromisso — construído ou desfeito — merece ser conduzido com o mesmo cuidado.
        </p>
      </motion.div>
    </section>
  );
}
