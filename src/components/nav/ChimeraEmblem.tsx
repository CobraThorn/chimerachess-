import { motion } from "framer-motion";
import ChimeraBrandMark from "./ChimeraBrandMark";

const shellVariants = {
  rest: {
    boxShadow: "inset 0 0 0 1px rgba(232,197,71,0.2)",
  },
  hover: {
    boxShadow:
      "0 0 32px rgba(232,197,71,0.4), 0 0 8px rgba(0,229,255,0.15), inset 0 0 0 1px rgba(232,197,71,0.55), inset 0 0 20px rgba(232,197,71,0.08)",
  },
};

export default function ChimeraEmblem() {
  return (
    <motion.div
      className="group relative flex h-11 w-11 items-center justify-center"
      initial="rest"
      whileHover="hover"
      aria-label="CHIMERA"
    >
      <motion.div
        className="absolute inset-0 rounded-[3px]"
        style={{
          background:
            "linear-gradient(145deg, rgba(232,197,71,0.08) 0%, rgba(10,10,18,0.6) 50%, rgba(0,229,255,0.03) 100%)",
        }}
        variants={shellVariants}
        transition={{ duration: 0.4 }}
      />

      <div className="relative z-[1] h-10 w-10">
        <ChimeraBrandMark size={40} className="h-full w-full" />
      </div>

      <motion.div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3px]"
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: 1 },
        }}
      >
        <motion.div
          className="absolute -inset-full h-[200%] w-[40%] rotate-12 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.14)] to-transparent"
          variants={{
            rest: { x: "-120%" },
            hover: { x: ["-120%", "280%"] },
          }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
