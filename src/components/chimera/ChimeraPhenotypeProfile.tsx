import { useMemo } from "react";
import type { ChimeraMemory } from "../../ai/types";
import { getPersonalityById, getRichProfile } from "../../ai/cognition/personality400";
import { formatTraitProgress } from "../../ai/cognition/personalityEvolution";
import { ensureLearning } from "../../ai/learning/learn";
import ChimeraPersonalityCard from "./ChimeraPersonalityCard";
import PhenotypeRadarPanel from "./PhenotypeRadarPanel";

interface ChimeraPhenotypeProfileProps {
  memory: ChimeraMemory;
}

export default function ChimeraPhenotypeProfile({ memory }: ChimeraPhenotypeProfileProps) {
  const L = ensureLearning(memory);
  const evolution = L.evolution;
  const pid =
    evolution?.currentPersonalityId ?? L.phenotype?.personalityId ?? null;

  const def = useMemo(() => (pid ? getPersonalityById(pid) : undefined), [pid]);
  const profile = useMemo(() => (def ? getRichProfile(def) : null), [def]);
  const traitProgress = evolution ? formatTraitProgress(evolution) : [];

  if (!def || !profile) {
    return (
      <p className="font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.4)]">
        Play rated games or complete CHIMERA setup to unlock your personality profile.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ChimeraPersonalityCard def={def} profile={profile} />

      <PhenotypeRadarPanel memory={memory} />

      {traitProgress.length > 0 && (
        <div className="rounded-sm border border-[rgba(232,197,71,0.2)] bg-[rgba(232,197,71,0.04)] p-4">
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-gold-glow uppercase">
            Your evolution
          </p>
          <ul className="mt-3 space-y-2">
            {traitProgress.map((t) => (
              <li
                key={t.label}
                className="flex justify-between font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.55)]"
              >
                <span>{t.label}</span>
                <span className="text-[rgba(0,229,255,0.85)]">{t.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {evolution?.history && evolution.history.length > 0 && (
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(0,229,255,0.45)] uppercase">
            Evolution log
          </p>
          <ul className="mt-2 space-y-2">
            {evolution.history
              .slice()
              .reverse()
              .map((h) => (
                <li
                  key={h.at}
                  className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.45)]"
                >
                  {h.message}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="rounded-sm border border-[rgba(255,255,255,0.08)] p-4">
        <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(255,255,255,0.35)] uppercase">
          Recommended training
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {profile.training.map((t) => (
            <li
              key={t}
              className="font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.5)]"
            >
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.35)] uppercase">
          Roadmap
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          {profile.roadmap.map((r) => (
            <li
              key={r}
              className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.4)]"
            >
              {r}
            </li>
          ))}
        </ol>
      </div>

      <p className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.3)]">
        Queenless middlegame heatmaps will overlay weak zones on this radar as you
        play more rated games.
      </p>
    </div>
  );
}
