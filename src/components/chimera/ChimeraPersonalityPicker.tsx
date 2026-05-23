import { useEffect, useMemo, useRef, useState } from "react";
import { loadMemory } from "../../ai";
import {
  DEFAULT_TRAIT_VECTOR,
  topPersonalityMatches,
  traitsFromMemory,
  traitsFromQuiz,
  type TraitVector,
} from "../../ai/cognition/personalityMatch";
import { personalityToPhenotype } from "../../ai/learning/phenotype";
import type { ChimeraPhenotype } from "../../ai/learning/types";
import type { PersonalityTypeDef } from "../../ai/cognition/personality400";
import { searchPersonalities } from "../../ai/cognition/personality400";
import ChimeraPersonalityCard from "./ChimeraPersonalityCard";

const QUIZ_LABELS: { key: keyof TraitVector; label: string; low: string; high: string }[] = [
  { key: "aggression", label: "Attack vs defend", low: "Patient", high: "Aggressive" },
  { key: "tactical", label: "Tactics vs strategy", low: "Strategic", high: "Tactical" },
  { key: "risk", label: "Risk", low: "Safe", high: "Bold" },
  { key: "calculation", label: "Calculation", low: "Intuitive", high: "Calculating" },
];

interface ChimeraPersonalityPickerProps {
  value: ChimeraPhenotype;
  onChange: (phenotype: ChimeraPhenotype, def: PersonalityTypeDef) => void;
}

export default function ChimeraPersonalityPicker({
  value,
  onChange,
}: ChimeraPersonalityPickerProps) {
  const memoryTraits = useMemo(() => {
    try {
      const m = loadMemory();
      if ((m.userStyle?.moves ?? 0) > 8) return traitsFromMemory(m);
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  const [traits, setTraits] = useState<TraitVector>(
    () => memoryTraits ?? DEFAULT_TRAIT_VECTOR
  );
  const [selectedId, setSelectedId] = useState(
    () => value.personalityId ?? ""
  );
  const [showExplore, setShowExplore] = useState(false);
  const [exploreQuery, setExploreQuery] = useState("");

  const topMatches = useMemo(
    () => topPersonalityMatches(traits, 3),
    [traits]
  );

  const exploreResults = useMemo(() => {
    if (!showExplore || !exploreQuery.trim()) return [];
    return searchPersonalities(exploreQuery).slice(0, 12);
  }, [showExplore, exploreQuery]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (selectedId) return;
    const first = topMatches[0];
    if (first) {
      setSelectedId(first.def.id);
      onChangeRef.current(personalityToPhenotype(first.def), first.def);
    }
  }, [topMatches, selectedId]);

  const selectDef = (def: PersonalityTypeDef) => {
    setSelectedId(def.id);
    onChange(personalityToPhenotype(def), def);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-sm border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.04)] px-4 py-3">
        <p className="font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-[rgba(255,255,255,0.5)]">
          CHIMERA reads your style as{" "}
          <span className="text-[rgba(0,229,255,0.8)]">12 archetypes</span>,{" "}
          <span className="text-[rgba(0,229,255,0.8)]">60 subtypes</span>, and{" "}
          <span className="text-[rgba(0,229,255,0.8)]">400 fine types</span> under
          the hood. You only need to pick from your top matches — not browse 400.
        </p>
      </div>

      {!memoryTraits && (
        <div className="space-y-3">
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(232,197,71,0.55)] uppercase">
            Quick style quiz
          </p>
          {QUIZ_LABELS.map((q) => (
            <label key={q.key} className="block">
              <div className="flex justify-between font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.35)]">
                <span>{q.low}</span>
                <span>{q.label}</span>
                <span>{q.high}</span>
              </div>
              <input
                type="range"
                min={20}
                max={80}
                value={traits[q.key]}
                onChange={(e) =>
                  setTraits(
                    traitsFromQuiz({
                      ...traits,
                      [q.key]: Number(e.target.value),
                    })
                  )
                }
                className="mt-1 w-full accent-[#00e5ff]"
              />
            </label>
          ))}
        </div>
      )}

      {memoryTraits && (
        <p className="font-[family-name:var(--font-body)] text-[11px] text-[rgba(120,200,140,0.75)]">
          Matched from your games on this device.
        </p>
      )}

      <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.55)] uppercase">
        Your top 3 matches
      </p>
      <div className="space-y-3">
        {topMatches.map((m) => (
          <ChimeraPersonalityCard
            key={m.def.id}
            match={m}
            selected={selectedId === m.def.id}
            compact
            onSelect={() => selectDef(m.def)}
          />
        ))}
      </div>

      {selectedId && (
        <div className="mt-4">
          {topMatches
            .filter((m) => m.def.id === selectedId)
            .map((m) => (
              <ChimeraPersonalityCard key={m.def.id} match={m} />
            ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowExplore((v) => !v)}
        className="w-full rounded-sm border border-[rgba(255,255,255,0.1)] py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.45)]"
      >
        {showExplore ? "Hide" : "Explore"} finer types (optional)
      </button>

      {showExplore && (
        <div className="space-y-2">
          <input
            value={exploreQuery}
            onChange={(e) => setExploreQuery(e.target.value)}
            placeholder="Search e.g. Tactical Predator, Karpov, INTJ…"
            className="w-full rounded-sm border border-[rgba(255,255,255,0.1)] bg-black/40 px-3 py-2 text-sm text-white"
          />
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {exploreResults.map((def) => (
              <li key={def.id}>
                <button
                  type="button"
                  onClick={() => selectDef(def)}
                  className="w-full rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2 text-left text-[11px] hover:border-[rgba(0,229,255,0.25)]"
                >
                  <span className="text-[rgba(0,229,255,0.6)]">#{def.fineIndex}</span>{" "}
                  {def.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
