import { motion } from "framer-motion";
import {
  createPersonaIdentity,
  getPrimaryDef,
  getSubdivisionDef,
  identityFromProfile,
  type ChimeraEntityId,
  type CognitiveIdentity,
} from "../../ai";
import type { PlayStyleProfile } from "../../ai/playStyle";

interface ChimeraEntityArchetypeProps {
  entityName: string;
  profile: PlayStyleProfile;
  identity?: CognitiveIdentity;
  entityId?: ChimeraEntityId;
  accent?: "gold" | "cyan";
}

const GLOW: Record<string, string> = {
  architect: "rgba(232,197,71,0.45)",
  warlord: "rgba(255,90,70,0.5)",
  oracle: "rgba(140,120,255,0.45)",
  phantom: "rgba(180,100,255,0.4)",
  titan: "rgba(120,180,220,0.45)",
  alchemist: "rgba(255,180,60,0.45)",
  sovereign: "rgba(255,220,120,0.6)",
};

export default function ChimeraEntityArchetype({
  entityName,
  profile,
  identity: stored,
  entityId,
  accent = "gold",
}: ChimeraEntityArchetypeProps) {
  const identity =
    stored ??
    (entityId ? createPersonaIdentity(entityId) : identityFromProfile(profile));
  const primary = getPrimaryDef(identity.primary);
  const sub = getSubdivisionDef(identity.subdivision);
  const glow = GLOW[identity.primary] ?? GLOW.architect;
  const accentText =
    accent === "gold"
      ? "text-[rgba(232,197,71,0.75)]"
      : "text-[rgba(0,229,255,0.75)]";

  return (
    <motion.div
      className="mt-4 rounded-sm border px-3 py-3"
      style={{
        borderColor: glow,
        background: `linear-gradient(160deg, ${glow.replace(/[\d.]+\)$/, "0.07)")} 0%, transparent 70%)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <p className={`font-[family-name:var(--font-hud)] text-[7px] tracking-[0.3em] uppercase ${accentText}`}>
        {entityName} cognition
      </p>
      {identity.nascent && !identity.entityId ? (
        <p className="mt-2 font-[family-name:var(--font-body)] text-[9px] text-[rgba(255,255,255,0.35)]">
          Archetype forming — needs more moves
        </p>
      ) : (
        <>
          <p className="mt-1 font-[family-name:var(--font-display)] text-sm leading-tight text-gold-glow">
            {identity.personaLabel ?? primary.name}
          </p>
          {sub && (
            <p className="mt-0.5 font-[family-name:var(--font-hud)] text-[9px] tracking-wide text-[rgba(0,229,255,0.65)]">
              {sub.label}
            </p>
          )}
          <p className="mt-2 font-[family-name:var(--font-body)] text-[8px] leading-snug text-[rgba(255,255,255,0.32)]">
            {primary.cognition}
          </p>
          {identity.secondary.length > 0 && (
            <p className="mt-2 font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.28)]">
              + {identity.secondary.map((s) => getPrimaryDef(s.id).name.replace("The ", "")).join(" · ")}
            </p>
          )}
          {identity.evolutionNote && (
            <p className="mt-2 font-[family-name:var(--font-body)] text-[8px] italic text-[rgba(0,229,255,0.45)]">
              {identity.evolutionNote}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
