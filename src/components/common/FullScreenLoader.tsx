import { HeartPulse } from "lucide-react";
import { motion } from "framer-motion";

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="grid h-14 w-14 place-items-center rounded-2xl brand-gradient text-primary-foreground shadow-glow"
        >
          <HeartPulse className="h-7 w-7" />
        </motion.div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
