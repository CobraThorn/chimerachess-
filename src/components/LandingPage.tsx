import { useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { logDataEvent } from "../account/events";
import { scheduleSync } from "../api/chimeraBackend";
import { isLoggedIn } from "../account/storage";
import { CHIMERA_FULL_NAME } from "../content/chimera";
import ChessBoardBackground from "./ChessBoardBackground";
import HudOverlay from "./HudOverlay";
import ChessGame from "./chess/ChessGame";
import Hero from "./Hero";
import Navbar from "./Navbar";
import ParticleField from "./ParticleField";
import StockfishAnalysis from "./analyze/StockfishAnalysis";
import OpeningTrainer from "./train/OpeningTrainer";
import ProfilePage from "./profile/ProfilePage";
import SettingsSection from "./settings/SettingsSection";
import LegendsSection from "./legends/LegendsSection";

const FEATURE_SECTIONS = [
  {
    id: "play",
    tag: "PLAY — ARENA",
    title: "Enter the Arena",
    body: "Quick match, ranked ladders, blitz, bullet, classical, AI sparring, custom games, tournaments, and puzzle rush — one ignition away.",
  },
  {
    id: "analyze",
    tag: "ANALYZE — INTELLIGENCE",
    title: "The Intelligent Chess OS",
    body: "Game review, live analysis, opening explorer, endgame lab, cognitive heatmaps, accuracy reports, and style analysis.",
  },
  {
    id: "train",
    tag: "TRAIN — NEURAL LAB",
    title: "Enhancement Protocol",
    body: "Today's focus, tactical training, opening drills, visualization, memory exercises, AI coaching, and adaptive weakness training.",
  },
  {
    id: "legends",
    tag: "LEGENDS — ARCHIVE",
    title: "Where Chess Lives",
    body: "Six immortal profiles—portraits, style radars, four-sentence biographies, and interactive replays of their finest games.",
  },
  {
    id: "social",
    tag: "SOCIAL — NETWORK",
    title: "Command Your Circle",
    body: "Friends, clubs, chat, shared analyses, community puzzles, spectating, creator profiles, and tournaments.",
  },
  {
    id: "profile",
    tag: "PROFILE — IDENTITY",
    title: "Your Chess DNA",
    body: "Stats, achievements, style profile, favorite openings, performance charts, psychological profile — Spotify Wrapped for chess.",
  },
];

export default function LandingPage() {
  useEffect(() => {
    logDataEvent("session_start");
    if (isLoggedIn()) scheduleSync(3000);
  }, []);

  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.92]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.4]);

  return (
    <div className="relative min-h-screen bg-void pb-24 text-white md:pb-0">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#0a0a14] via-void to-void" />

      <ChessBoardBackground />
      <ParticleField />
      <HudOverlay />

      <div className="pointer-events-none fixed inset-0 z-[3] bg-[radial-gradient(ellipse_at_50%_0%,rgba(232,197,71,0.06)_0%,transparent_55%)]" />

      <Navbar />

      <motion.main style={{ scale: heroScale, opacity: heroOpacity }}>
        <Hero />
      </motion.main>

      {FEATURE_SECTIONS.map((section, i) => (
        <motion.section
          key={section.id}
          id={section.id}
          className="relative z-10 mx-auto max-w-6xl px-6 py-32 md:px-10"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: i * 0.05 }}
        >
          <div
            className={`glass-panel relative rounded-sm p-10 md:p-14 ${
              section.id === "analyze" || section.id === "legends"
                ? "overflow-visible"
                : "overflow-hidden"
            }`}
          >
            <span className="hud-corner hud-corner--tl" />
            <span className="hud-corner hud-corner--tr" />
            <span className="hud-corner hud-corner--bl" />
            <span className="hud-corner hud-corner--br" />

            <div className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.4em] text-[rgba(0,229,255,0.5)]">
              {section.tag}
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-wide text-gold-glow md:text-4xl">
              {section.title}
            </h2>
            <p className="mt-6 max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-[rgba(255,255,255,0.5)]">
              {section.body}
            </p>

            {section.id === "play" && (
              <div className="relative z-10 mt-12 scroll-mt-28 pb-[max(7rem,env(safe-area-inset-bottom,0px)+5.5rem)] md:pb-8">
                <ChessGame />
              </div>
            )}

            {section.id === "analyze" && <StockfishAnalysis />}

            {section.id === "train" && <OpeningTrainer />}

            {section.id === "profile" && <ProfilePage />}

            {section.id === "legends" && <LegendsSection />}

            <motion.div
              className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[rgba(232,197,71,0.04)] blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>
        </motion.section>
      ))}

      <SettingsSection />

      <footer
        id="intel"
        className="relative z-10 border-t border-[rgba(232,197,71,0.08)] py-12 text-center"
      >
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.4em] text-[rgba(255,255,255,0.2)]">
          © 2026 CHIMERA — {CHIMERA_FULL_NAME}
        </p>
      </footer>
    </div>
  );
}
