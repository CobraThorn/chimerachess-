import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ELITE_PLAYER_REFERENCES,
  compareRadarProfiles,
  radarCurrentFromMemory,
  radarFingerprintFromPersonality,
  radarPotentialFromMemory,
  valuesToRadarAxes,
  weakestAxes,
  type PhenotypeRadarValues,
} from "../../ai/cognition/personalityRadar";
import { getPersonalityById } from "../../ai/cognition/personality400";
import { ensureLearning } from "../../ai/learning/learn";
import type { ChimeraMemory } from "../../ai/types";
import PhenotypeRadarChart, { type PhenotypeRadarSeries } from "./PhenotypeRadarChart";
import PlyScrubber from "../ui/PlyScrubber";

type CompareMode = "you" | "potential" | "elite" | "timeline";

interface PhenotypeRadarPanelProps {
  memory: ChimeraMemory;
  compact?: boolean;
}

function valuesToArray(v: PhenotypeRadarValues): number[] {
  return valuesToRadarAxes(v).map((a) => a.value);
}

export default function PhenotypeRadarPanel({
  memory,
  compact = false,
}: PhenotypeRadarPanelProps) {
  const L = ensureLearning(memory);
  const pid =
    L.evolution?.currentPersonalityId ?? L.phenotype?.personalityId ?? null;
  const def = useMemo(() => (pid ? getPersonalityById(pid) : undefined), [pid]);

  const [mode, setMode] = useState<CompareMode>("you");
  const [eliteId, setEliteId] = useState(ELITE_PLAYER_REFERENCES[0].id);
  const [selectedAxis, setSelectedAxis] = useState<number | null>(null);
  const [timelineIndex, setTimelineIndex] = useState<number | null>(null);

  const current = useMemo(
    () => (def ? radarCurrentFromMemory(memory, def) : null),
    [memory, def]
  );
  const dna = useMemo(
    () => (def ? radarFingerprintFromPersonality(def) : null),
    [def]
  );
  const potential = useMemo(
    () => (def ? radarPotentialFromMemory(memory, def) : null),
    [memory, def]
  );

  const timeline = L.evolution?.radarTimeline ?? [];
  const timelineLen = timeline.length;

  const displayCurrent = useMemo(() => {
    if (mode !== "timeline" || timelineLen < 2) return current;
    const idx =
      timelineIndex ?? timelineLen - 1;
    const snap = timeline[idx];
    if (!snap) return current;
    const prev = timeline[Math.max(0, idx - 1)];
    if (idx === 0 || !prev) return snap.values;
    return snap.values;
  }, [mode, timeline, timelineLen, timelineIndex, current]);

  const elite = ELITE_PLAYER_REFERENCES.find((e) => e.id === eliteId)!;

  const comparison = useMemo(() => {
    if (!displayCurrent || mode !== "elite") return null;
    return compareRadarProfiles(displayCurrent, elite.values, elite.name);
  }, [displayCurrent, mode, elite]);

  const series: PhenotypeRadarSeries[] = useMemo(() => {
    if (!displayCurrent) return [];
    const primary: PhenotypeRadarSeries = {
      id: "you",
      label: mode === "timeline" ? "You (snapshot)" : "Current you",
      values: valuesToArray(displayCurrent),
      accent: "cyan",
    };
    const out: PhenotypeRadarSeries[] = [primary];

    if (mode === "potential" && potential) {
      out.push({
        id: "potential",
        label: "Potential you",
        values: valuesToArray(potential),
        accent: "gold",
        opacity: 0.9,
      });
    }
    if (mode === "elite" && elite) {
      out.push({
        id: "elite",
        label: elite.name,
        values: valuesToArray(elite.values),
        accent: "muted",
      });
    }
    if (mode === "you" && dna) {
      out.push({
        id: "dna",
        label: "Phenotype DNA",
        values: valuesToArray(dna),
        accent: "gold",
        opacity: 0.55,
      });
    }
    return out;
  }, [displayCurrent, mode, potential, elite, dna]);

  const weak = displayCurrent ? weakestAxes(displayCurrent, 2) : [];

  if (!def || !current) {
    return (
      <p className="font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.4)]">
        Complete CHIMERA setup to unlock your cognitive radar fingerprint.
      </p>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        <PhenotypeRadarChart
          series={[
            {
              id: "you",
              label: "You",
              values: valuesToArray(current),
              accent: "cyan",
            },
          ]}
          size={180}
        />
        <p className="text-center font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(0,229,255,0.5)]">
          Tap axes on profile for full compare & timeline
        </p>
      </div>
    );
  }

  const tabs: { id: CompareMode; label: string }[] = [
    { id: "you", label: "You vs DNA" },
    { id: "potential", label: "Potential" },
    { id: "elite", label: "Elite compare" },
    ...(timelineLen >= 2
      ? [{ id: "timeline" as const, label: "Timeline" }]
      : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-sm p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.55)] uppercase">
            Cognitive radar
          </p>
          <p className="mt-1 max-w-md font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.45)]">
            Ten-axis fingerprint — tap any stat for explanation and training.
            Shapes morph as you play rated games.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setMode(t.id);
              setSelectedAxis(null);
              if (t.id === "timeline") {
                setTimelineIndex(timelineLen - 1);
              }
            }}
            className={`rounded-sm border px-3 py-1.5 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] transition-colors ${
              mode === t.id
                ? "border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.1)] text-[rgba(0,229,255,0.9)]"
                : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "elite" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ELITE_PLAYER_REFERENCES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEliteId(e.id)}
              className={`rounded-sm border px-2 py-1 font-[family-name:var(--font-hud)] text-[6px] tracking-[0.1em] ${
                eliteId === e.id
                  ? "border-gold-glow/40 text-gold-glow"
                  : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.35)]"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
      )}

      {mode === "timeline" && timelineLen >= 2 && (
        <div className="mt-4">
          <div className="flex justify-between font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.35)]">
            <span>{timeline[0]?.label}</span>
            <span>{timeline[timelineLen - 1]?.label}</span>
          </div>
          <PlyScrubber
            className="mt-2"
            min={0}
            max={timelineLen - 1}
            value={timelineIndex ?? timelineLen - 1}
            onPreview={(v) => setTimelineIndex(v)}
            onChange={(v) => setTimelineIndex(v)}
            aria-label="Morph phenotype timeline"
          />
          <p className="mt-1 text-center font-[family-name:var(--font-hud)] text-[8px] text-[rgba(0,229,255,0.6)]">
            {timeline[timelineIndex ?? timelineLen - 1]?.label}
          </p>
          {timelineIndex != null &&
            timelineIndex > 0 &&
            timeline[timelineIndex] &&
            timeline[timelineIndex - 1] && (
              <p className="mt-2 text-center font-[family-name:var(--font-body)] text-[10px] text-[rgba(232,197,71,0.65)]">
                Morphing from {timeline[timelineIndex - 1].label} →{" "}
                {timeline[timelineIndex].label}
              </p>
            )}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <PhenotypeRadarChart
          series={series}
          size={300}
          selectedIndex={selectedAxis}
          onSelectAxis={setSelectedAxis}
        />
      </div>

      {mode === "elite" && comparison && (
        <div className="mt-4 rounded-sm border border-[rgba(232,197,71,0.15)] bg-[rgba(232,197,71,0.04)] p-4">
          <p className="font-[family-name:var(--font-display)] text-lg text-gold-glow">
            {comparison.similarityPercent}% similarity
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.5)]">
            {comparison.summary}
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-[9px] text-[rgba(255,255,255,0.3)]">
            {elite.note}
          </p>
          {comparison.sharedStrengths.length > 0 && (
            <p className="mt-3 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(0,229,255,0.5)] uppercase">
              Shared strengths
            </p>
          )}
          <ul className="mt-1 flex flex-wrap gap-2">
            {comparison.sharedStrengths.map((s) => (
              <span
                key={s}
                className="rounded-sm border border-[rgba(0,229,255,0.2)] px-2 py-0.5 font-[family-name:var(--font-hud)] text-[7px] text-[rgba(0,229,255,0.75)]"
              >
                {s}
              </span>
            ))}
          </ul>
          {comparison.missingAreas.length > 0 && (
            <>
              <p className="mt-3 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(255,200,140,0.6)] uppercase">
                Growth gaps vs {elite.name}
              </p>
              <ul className="mt-2 space-y-2">
                {comparison.missingAreas.map((m) => (
                  <li
                    key={m.axis}
                    className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.45)]"
                  >
                    <span className="text-[rgba(255,200,140,0.85)]">
                      {m.axis}
                    </span>{" "}
                    −{m.gap} · {m.hint}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {mode === "potential" && potential && (
        <p className="mt-3 text-center font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.4)]">
          Gold outline = where your phenotype can grow with deliberate training —
          not a guarantee, a direction.
        </p>
      )}

      {weak.length > 0 && mode === "you" && (
        <div className="mt-4 rounded-sm border border-[rgba(255,255,255,0.06)] p-3">
          <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(255,255,255,0.35)] uppercase">
            Relative weak points
          </p>
          <ul className="mt-2 space-y-1">
            {weak.map((w) => (
              <li
                key={w.key}
                className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.45)]"
              >
                {w.label} ({displayCurrent![w.key]}) — {w.trainingHint}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
