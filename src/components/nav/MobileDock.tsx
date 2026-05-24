import { motion } from "framer-motion";
import { MOBILE_DOCK } from "../../content/nav";

const DOCK_ICONS = {
  home: (
    <path d="M6 10 L12 5 L18 10 L18 18 L6 18 Z" strokeLinejoin="round" />
  ),
  analyze: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8 L12 16 M8 12 L16 12" strokeLinecap="round" />
    </>
  ),
  play: <path d="M9 7 L18 12 L9 17 Z" fill="currentColor" stroke="none" />,
  train: (
    <>
      <path d="M6 18 L12 6 L18 18" strokeLinejoin="round" />
      <path d="M8 14 L16 14" strokeLinecap="round" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="9" r="3" />
      <path d="M6 20 C6 16 8 14 12 14 C16 14 18 16 18 20" />
    </>
  ),
} as const;

export default function MobileDock() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Mobile navigation"
    >
      <div className="mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] glass-panel flex items-end justify-around rounded-2xl px-2 py-2 pb-3">
        {MOBILE_DOCK.map((item) => {
          const isPrimary = "primary" in item && item.primary;

          if (isPrimary) {
            return (
              <a
                key={item.id}
                href={item.href}
                aria-label={item.label}
                className="relative -mt-8 flex flex-col items-center"
              >
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[rgba(232,197,71,0.6)] bg-gradient-to-b from-[rgba(232,197,71,0.35)] to-[rgba(168,139,42,0.15)] shadow-[0_0_32px_rgba(232,197,71,0.35)]"
                  whileTap={{ scale: 0.92 }}
                  animate={{
                    boxShadow: [
                      "0 0 32px rgba(232,197,71,0.35)",
                      "0 0 48px rgba(232,197,71,0.5)",
                      "0 0 32px rgba(232,197,71,0.35)",
                    ],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-[#ffe566]"
                    fill="currentColor"
                  >
                    {DOCK_ICONS.play}
                  </svg>
                </motion.div>
                <span className="mt-1 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-gold-glow">
                  {item.label}
                </span>
              </a>
            );
          }

          return (
            <a
              key={item.id}
              href={item.href}
              aria-label={item.label}
              className="dock-icon flex flex-1 flex-col items-center gap-1 py-1"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                className="h-5 w-5"
              >
                {DOCK_ICONS[item.icon]}
              </svg>
              <span className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(255,255,255,0.35)] uppercase">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
