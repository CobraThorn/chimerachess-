import { motion } from "framer-motion";
import type { PersonalityMatchResult } from "../../ai/cognition/personalityMatch";
import type { PersonalityRichProfile } from "../../ai/cognition/personalityNarrative";
import type { PersonalityTypeDef } from "../../ai/cognition/personality400";
import { getRichProfile } from "../../ai/cognition/personality400";

interface ChimeraPersonalityCardProps {
  match?: PersonalityMatchResult;
  def?: PersonalityTypeDef;
  profile?: PersonalityRichProfile;
  matchPercent?: number;
  selected?: boolean;
  compact?: boolean;
  onSelect?: () => void;
}

export default function ChimeraPersonalityCard({
  match,
  def: defProp,
  profile: profileProp,
  matchPercent,
  selected,
  compact,
  onSelect,
}: ChimeraPersonalityCardProps) {
  const def = match?.def ?? defProp;
  if (!def) return null;
  const profile = match?.profile ?? profileProp ?? getRichProfile(def);
  const pct = match?.matchPercent ?? matchPercent;

  const inner = (
    <>
      {pct != null && (
        <p className="font-[family-name:var(--font-display)] text-2xl text-[rgba(0,229,255,0.95)]">
          {pct}%
          <span className="ml-1 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(255,255,255,0.35)]">
            match
          </span>
        </p>
      )}
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-gold-glow">
        {profile.displayTitle}
      </h3>
      <p className="mt-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(0,229,255,0.45)]">
        {profile.hierarchyLine}
      </p>
      {!compact && (
        <>
          <p className="mt-3 font-[family-name:var(--font-body)] text-[12px] leading-relaxed text-[rgba(255,255,255,0.55)]">
            {profile.headline}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(120,200,140,0.7)] uppercase">
                Strengths
              </p>
              <ul className="mt-2 space-y-1">
                {profile.strengths.map((s) => (
                  <li
                    key={s}
                    className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.5)]"
                  >
                    + {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(255,160,120,0.7)] uppercase">
                Weaknesses
              </p>
              <ul className="mt-2 space-y-1">
                {profile.weaknesses.map((w) => (
                  <li
                    key={w}
                    className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.5)]"
                  >
                    − {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.45)]">
            <span className="text-[rgba(232,197,71,0.65)]">Under pressure:</span>{" "}
            {profile.underPressure}
          </p>
          <p className="mt-2 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.45)]">
            <span className="text-[rgba(232,197,71,0.65)]">Tendencies like:</span>{" "}
            {profile.similarTo}
          </p>
          <p className="mt-2 font-[family-name:var(--font-body)] text-[10px] italic text-[rgba(255,255,255,0.35)]">
            {profile.tiltTendency}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.playstyleIndicators.map((ind) => (
              <span
                key={ind.label}
                className="rounded-sm border border-[rgba(255,255,255,0.08)] px-2 py-1 font-[family-name:var(--font-hud)] text-[6px] text-[rgba(255,255,255,0.45)]"
              >
                {ind.label} {ind.value}
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );

  const className = `w-full rounded-sm border p-4 text-left transition-colors ${
    selected
      ? "border-[rgba(232,197,71,0.45)] bg-[rgba(232,197,71,0.08)]"
      : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(0,229,255,0.3)]"
  }`;

  if (onSelect) {
    return (
      <motion.button type="button" onClick={onSelect} className={className} whileTap={{ scale: 0.99 }}>
        {inner}
      </motion.button>
    );
  }

  return <div className={className}>{inner}</div>;
}
