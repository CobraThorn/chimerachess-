import { motion } from "framer-motion";
import { useState } from "react";
import { PHENOTYPE_RADAR_AXES } from "../../ai/cognition/personalityRadar";
import type { LegendProfile } from "../../content/legends";
import { radarValuesToSeries } from "../../content/legends";
import PhenotypeRadarChart from "../chimera/PhenotypeRadarChart";
import LegendGameReplayer from "./LegendGameReplayer";

function LegendPortrait({
  legend,
}: {
  legend: LegendProfile;
}) {
  const [failed, setFailed] = useState(false);
  const initials = legend.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (failed) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-sm bg-gradient-to-br from-[rgba(0,229,255,0.12)] to-[rgba(232,197,71,0.08)]">
        <span className="font-[family-name:var(--font-display)] text-5xl text-gold-glow">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={legend.imageUrl}
      alt={legend.fullName}
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-[4/5] w-full rounded-sm object-cover object-top shadow-lg ring-1 ring-[rgba(232,197,71,0.15)]"
    />
  );
}

function LegendBanner({ legend }: { legend: LegendProfile }) {
  if (!legend.banner) return null;

  const memorial = legend.banner.kind === "memorial";

  return (
    <div
      className={`relative overflow-hidden rounded-sm border px-4 py-2.5 ${
        memorial
          ? "border-[rgba(180,120,255,0.35)] bg-gradient-to-r from-[rgba(80,40,120,0.35)] via-[rgba(40,20,60,0.5)] to-[rgba(0,0,0,0.4)]"
          : "border-[rgba(0,229,255,0.35)] bg-gradient-to-r from-[rgba(0,229,255,0.12)] via-[rgba(232,197,71,0.08)] to-[rgba(0,0,0,0.35)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-40 ${
          memorial
            ? "bg-[repeating-linear-gradient(-45deg,transparent,transparent_8px,rgba(255,255,255,0.03)_8px,rgba(255,255,255,0.03)_16px)]"
            : "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,229,255,0.04)_10px,rgba(0,229,255,0.04)_20px)]"
        }`}
      />
      <p
        className={`relative font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] uppercase ${
          memorial ? "text-[rgba(200,170,255,0.9)]" : "text-[rgba(0,229,255,0.85)]"
        }`}
      >
        {legend.banner.label}
      </p>
      {legend.banner.sublabel && (
        <p className="relative mt-1 text-xs text-[rgba(255,255,255,0.5)]">
          {legend.banner.sublabel}
        </p>
      )}
    </div>
  );
}

interface LegendCardProps {
  legend: LegendProfile;
  index: number;
}

export default function LegendCard({ legend, index }: LegendCardProps) {
  const radarSeries = [
    {
      id: legend.id,
      label: legend.name,
      values: radarValuesToSeries(legend.radar),
      accent: "gold" as const,
      opacity: 0.92,
    },
  ];

  return (
    <motion.article
      id={`legend-${legend.id}`}
      className="scroll-mt-28"
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay: index * 0.06 }}
    >
      <div className="glass-panel relative overflow-hidden rounded-sm border border-[rgba(255,255,255,0.06)] p-6 md:p-10">
        <span className="hud-corner hud-corner--tl" />
        <span className="hud-corner hud-corner--tr" />
        <span className="hud-corner hud-corner--bl" />
        <span className="hud-corner hud-corner--br" />

        {legend.banner && (
          <div className="mb-6">
            <LegendBanner legend={legend} />
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-2 xl:grid-cols-[minmax(220px,260px)_1fr_minmax(280px,340px)]">
          <div className="space-y-5 lg:max-w-xs">
            <LegendPortrait legend={legend} />
            <div>
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.35em] text-[rgba(0,229,255,0.5)] uppercase">
                {legend.country} · {legend.years}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-gold-glow md:text-3xl">
                {legend.fullName}
              </h3>
              <p className="mt-1 text-sm italic text-[rgba(232,197,71,0.7)]">
                {legend.epithet}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(255,255,255,0.35)] uppercase">
                Profile
              </p>
              <div className="mt-4 space-y-4 font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.58)]">
                {legend.bio.map((sentence, i) => (
                  <p key={i}>{sentence}</p>
                ))}
              </div>
            </div>

            <div className="flex justify-center lg:justify-start">
              <PhenotypeRadarChart
                series={radarSeries}
                axes={PHENOTYPE_RADAR_AXES}
                size={260}
              />
            </div>
          </div>

          <div className="lg:col-span-2 xl:col-span-1">
            <LegendGameReplayer
              game={legend.game}
              highlightPly={legend.game.highlightPly}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
