import { motion } from "framer-motion";
import { WHATSAPP_URL } from "../lib/constants";

export default function WhatsAppButton() {
  return (
    <motion.a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar no WhatsApp"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp shadow-lg sm:bottom-6 sm:right-6"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-whatsapp opacity-40" />
      <svg viewBox="0 0 32 32" fill="white" className="relative h-7 w-7">
        <path d="M16.004 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.258.594 4.428 1.72 6.352L3.2 28.8l6.61-1.686a12.74 12.74 0 0 0 6.194 1.586h.006c7.07 0 12.8-5.73 12.8-12.8s-5.73-12.7-12.806-12.7Zm0 23.36a10.5 10.5 0 0 1-5.362-1.47l-.384-.228-3.92 1.002 1.048-3.822-.25-.394a10.478 10.478 0 0 1-1.612-5.646c0-5.804 4.722-10.526 10.53-10.526 2.812 0 5.456 1.098 7.444 3.088a10.457 10.457 0 0 1 3.082 7.446c0 5.804-4.722 10.55-10.576 10.55Zm5.77-7.892c-.316-.158-1.87-.922-2.16-1.028-.29-.106-.502-.158-.714.158-.21.316-.818 1.028-1.004 1.24-.184.21-.37.238-.686.08-.316-.158-1.334-.492-2.542-1.57-.94-.838-1.574-1.872-1.758-2.188-.184-.316-.02-.487.138-.644.142-.14.316-.37.474-.554.158-.184.21-.316.316-.526.106-.21.052-.396-.026-.554-.078-.158-.714-1.72-.978-2.356-.258-.618-.52-.534-.714-.544l-.608-.01c-.21 0-.554.078-.844.396-.29.316-1.106 1.08-1.106 2.634 0 1.554 1.132 3.056 1.29 3.266.158.21 2.228 3.402 5.398 4.77.754.326 1.342.52 1.802.664.758.242 1.446.208 1.992.126.608-.09 1.87-.764 2.134-1.502.264-.738.264-1.37.184-1.502-.078-.132-.29-.21-.606-.368Z" />
      </svg>
    </motion.a>
  );
}
