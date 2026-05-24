import { motion } from "framer-motion";
import { hasCompletedChimeraSetup, isLoggedIn } from "../../account/storage";
import { CHIMERA_OPEN_SETUP_EVENT } from "../../chimeraSetup";
import AccountDataSection from "../account/AccountDataSection";
import CustomisationPanel from "../customisation/CustomisationPanel";
import OpenAiKeyPanel from "./OpenAiKeyPanel";

export default function SettingsSection() {
  return (
    <motion.section
      id="settings"
      className="relative z-10 mx-auto max-w-6xl px-6 py-32 md:px-10"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7 }}
    >
      <div className="glass-panel relative overflow-hidden rounded-sm p-10 md:p-14">
        <span className="hud-corner hud-corner--tl" />
        <span className="hud-corner hud-corner--tr" />
        <span className="hud-corner hud-corner--bl" />
        <span className="hud-corner hud-corner--br" />

        <div className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.4em] text-[rgba(0,229,255,0.5)]">
          SETTINGS — CONFIG
        </div>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-wide text-gold-glow md:text-4xl">
          Preferences
        </h2>
        <p className="mt-6 max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-[rgba(255,255,255,0.5)]">
          Tune how CHIMERA looks and feels on the board. Changes apply instantly
          across play modes.
        </p>

        <AccountDataSection />
        {isLoggedIn() && hasCompletedChimeraSetup() && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(CHIMERA_OPEN_SETUP_EVENT))}
            className="mt-8 w-full rounded-sm border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.06)] px-4 py-3 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-[rgba(0,229,255,0.85)]"
          >
            Customise your CHIMERA again
          </button>
        )}
        <CustomisationPanel />
        <OpenAiKeyPanel />
      </div>
    </motion.section>
  );
}
