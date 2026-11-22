import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

export function InteractionFeedback() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      setVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 650);
    };
    window.addEventListener("puntr:success-feedback", show);
    return () => {
      window.removeEventListener("puntr:success-feedback", show);
      if (timer) clearTimeout(timer);
    };
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1.05 }} exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 20 }} aria-hidden
          className="pointer-events-none fixed bottom-6 right-5 z-[100] flex size-12 items-center justify-center overflow-hidden rounded-full border border-emerald-300/70 bg-emerald-500 text-white shadow-[0_0_28px_rgba(34,197,94,0.45)]">
          <motion.span className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-transparent" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 0.55 }} />
          <Check className="relative size-6" strokeWidth={3} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
