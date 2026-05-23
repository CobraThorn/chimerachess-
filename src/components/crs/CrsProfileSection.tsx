import { motion } from "framer-motion";
import type { ChimeraRatingState } from "../../crs/types";
import { buildImprovementInsights } from "../../crs/insights";
import CrsRatingCard from "./CrsRatingCard";

const MODE_LABELS: { key: keyof ChimeraRatingState["modeRatings"]; label: string }[] = [
  { key: "bullet", label: "Bullet" },
  { key: "blitz", label: "Blitz" },
  { key: "rapid", label: "Rapid" },
  { key: "classical", label: "Classical" },
  { key: "puzzle", label: "Puzzle" },
  { key: "chimera", label: "vs CHIMERA" },
];

interface CrsProfileSectionProps {
  crs: ChimeraRatingState;
  gamesPlayed: number;
  winRatePct: number;
  blunderRate: number;
  avgAccuracy: number;
}

export default function CrsProfileSection({
  crs,
  gamesPlayed,
  winRatePct,
  blunderRate,
  avgAccuracy,
}: CrsProfileSectionProps) {
  const insights = buildImprovementInsights({
    recentScores: crs.recentScores,
    blunderRate,
    avgAccuracy,
    gamesPlayed: crs.totalRatedGames,
  });

  const history = crs.ratingHistory.slice(-24);
  const maxR = Math.max(...history.map((h) => h.newRating), crs.chimeraRating);
  const minR = Math.min(...history.map((h) => h.newRating), crs.chimeraRating - 50);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <CrsRatingCard crs={crs} />
        <div className="flex-1 space-y-4">
          <div className="glass-panel rounded-sm p-5">
            <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.5)] uppercase">
              Player archetype
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-gold-glow">
              {crs.playerArchetype}
            </p>
            <p className="mt-3 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.4)]">
              Peak {crs.peakRating} CRS · Streak {crs.winStreak} (best {crs.bestStreak}) ·{" "}
              {winRatePct}% win rate · {gamesPlayed} games
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MODE_LABELS.map(({ key, label }) => (
              <div
                key={key}
                className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2"
              >
                <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(255,255,255,0.35)] uppercase">
                  {label}
                </p>
                <p className="font-[family-name:var(--font-display)] text-lg text-white">
                  {crs.modeRatings[key] ?? "—"}
                </p>
                <p className="font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.25)]">
                  {crs.gamesByMode[key] ?? 0} games
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {history.length > 2 && (
        <div className="glass-panel rounded-sm p-5">
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(232,197,71,0.55)] uppercase">
            Rating trajectory
          </p>
          <div className="mt-4 flex h-24 items-end gap-0.5">
            {history.map((h) => {
              const range = Math.max(40, maxR - minR);
              const hPct = ((h.newRating - minR) / range) * 100;
              return (
                <div
                  key={h.id}
                  className="min-w-[4px] flex-1 rounded-t-sm bg-[rgba(0,229,255,0.35)] transition-all hover:bg-[rgba(0,229,255,0.6)]"
                  style={{ height: `${Math.max(8, hPct)}%` }}
                  title={`${h.delta >= 0 ? "+" : ""}${h.delta} · ${h.newRating}`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="glass-panel rounded-sm p-5">
        <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.5)] uppercase">
          Improvement intelligence
        </p>
        <ul className="mt-3 space-y-2">
          {insights.map((line) => (
            <motion.li
              key={line}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.55)]"
            >
              <span className="mr-2 text-[rgba(0,229,255,0.45)]">▸</span>
              {line}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
