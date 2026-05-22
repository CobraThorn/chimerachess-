import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  classifyCognition,
  getPrimaryDef,
  getSubdivisionDef,
  type ChimeraMemory,
  type CognitiveIdentity,
} from "../../ai";

interface CognitiveArchetypePanelProps {
  memory: ChimeraMemory;
  compact?: boolean;
}

const ARCHETYPE_GLOW: Record<string, string> = {
  architect: "rgba(232,197,71,0.5)",
  warlord: "rgba(255,90,70,0.55)",
  oracle: "rgba(140,120,255,0.5)",
  phantom: "rgba(180,100,255,0.45)",
  titan: "rgba(120,180,220,0.5)",
  alchemist: "rgba(255,180,60,0.5)",
  sovereign: "rgba(255,220,120,0.65)",
};

export default function CognitiveArchetypePanel({
  memory,
  compact = false,
}: CognitiveArchetypePanelProps) {
  const identity: CognitiveIdentity | null = useMemo(() => {
    if (memory.cognitiveIdentity) return memory.cognitiveIdentity;
    if (!memory.userStyle) return null;
    const c = classifyCognition(memory.userStyle, memory);
    return {
      primary: c.primary,
      subdivision: c.subdivision,
      secondary: c.secondary,
      blendedScores: c.primaryScores,
      confidence: c.confidence,
      nascent: c.nascent,
      updatedAt: Date.now(),
    };
  }, [memory]);

  if (!identity) {
    return (
      <p className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.35)]">
        Play rated games to map your cognitive archetype.
      </p>
    );
  }

  const primary = getPrimaryDef(identity.primary);
  const sub = getSubdivisionDef(identity.subdivision);
  const glow = ARCHETYPE_GLOW[identity.primary] ?? ARCHETYPE_GLOW.architect;

  const ranked = useMemo(
    () =>
      (Object.entries(identity.blendedScores) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
    [identity.blendedScores]
  );

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.35em] text-[rgba(0,229,255,0.45)] uppercase">
          Cognitive archetype
        </p>
        <p className="mt-1 font-[family-name:var(--font-body)] text-[9px] leading-relaxed text-[rgba(255,255,255,0.35)]">
          Derived from move patterns, pressure response, and decision habits — not
          personality labels. Identity blends and evolves.
        </p>
      </div>

      <motion.div
        className="relative overflow-hidden rounded-sm border px-4 py-4"
        style={{
          borderColor: glow,
          background: `linear-gradient(135deg, ${glow.replace(/[\d.]+\)$/, "0.08)")} 0%, rgba(5,5,10,0.6) 100%)`,
        }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {identity.nascent && (
          <span className="absolute right-2 top-2 font-[family-name:var(--font-hud)] text-[7px] tracking-wider text-[rgba(255,255,255,0.3)]">
            FORMING
          </span>
        )}
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-[rgba(255,255,255,0.4)] uppercase">
          {primary.cognition}
        </p>
        <h4 className="mt-1 font-[family-name:var(--font-display)] text-xl text-gold-glow">
          {primary.name}
        </h4>
        {sub && (
          <p className="mt-1 font-[family-name:var(--font-hud)] text-[10px] tracking-[0.15em] text-[rgba(0,229,255,0.7)]">
            {sub.label}
            <span className="ml-2 font-[family-name:var(--font-body)] font-normal normal-case tracking-normal text-[rgba(255,255,255,0.35)]">
              — {sub.tagline}
            </span>
          </p>
        )}
        <p className="mt-3 font-[family-name:var(--font-body)] text-[10px] leading-relaxed text-[rgba(255,255,255,0.42)]">
          {primary.essence}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: glow }}
              initial={{ width: 0 }}
              animate={{ width: `${identity.confidence}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <span className="font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.35)]">
            {identity.confidence}% signal
          </span>
        </div>
      </motion.div>

      {identity.evolutionNote && (
        <p className="font-[family-name:var(--font-body)] text-[10px] italic text-[rgba(0,229,255,0.55)]">
          {identity.evolutionNote}
        </p>
      )}

      {identity.secondary.length > 0 && (
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.3em] text-[rgba(255,255,255,0.25)] uppercase">
            Secondary influences
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {identity.secondary.map((inf) => (
              <span
                key={inf.id}
                className="rounded-sm border border-[rgba(255,255,255,0.08)] px-2 py-1 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.45)]"
              >
                {getPrimaryDef(inf.id).name.split(" ").pop()} · {inf.weight}%
              </span>
            ))}
          </div>
        </div>
      )}

      {!compact && (
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.3em] text-[rgba(255,255,255,0.25)] uppercase">
            Cognitive blend
          </p>
          <ul className="mt-2 space-y-1.5">
            {ranked.map(([id, score]) => (
              <li key={id} className="flex items-center gap-2">
                <span className="w-20 shrink-0 font-[family-name:var(--font-body)] text-[9px] capitalize text-[rgba(255,255,255,0.35)]">
                  {id}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div
                    className="h-full rounded-full bg-[rgba(232,197,71,0.35)]"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="w-6 text-right font-[family-name:var(--font-hud)] text-[8px] text-[rgba(232,197,71,0.6)]">
                  {score}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
