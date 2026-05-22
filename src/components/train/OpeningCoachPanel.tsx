import { motion } from "framer-motion";
import type { CoachInsight } from "../../api/openingCoach";
import { hasOpenAiApiKey } from "../../api/openaiKey";

interface OpeningCoachPanelProps {
  insight: CoachInsight | null;
  loading: boolean;
  error: string | null;
  focusPly: number;
  totalPlies: number;
  showArrows: boolean;
  onToggleArrows: () => void;
  cognitiveHeadline?: string;
  onRefresh: () => void;
  onSelectPly: (ply: number) => void;
  moveLabels: string[];
}

function renderExplanation(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-[rgba(255,255,255,0.85)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function OpeningCoachPanel({
  insight,
  loading,
  error,
  focusPly,
  totalPlies,
  showArrows,
  onToggleArrows,
  cognitiveHeadline,
  onRefresh,
  onSelectPly,
  moveLabels,
}: OpeningCoachPanelProps) {
  const gptOn = hasOpenAiApiKey();

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="glass-panel rounded-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.5)]">
            CHATGPT COACH
          </p>
          <span
            className={`font-[family-name:var(--font-hud)] text-[7px] tracking-[0.12em] ${
              insight?.source === "gpt"
                ? "text-gold-glow"
                : "text-[rgba(255,255,255,0.3)]"
            }`}
          >
            {loading
              ? "Thinking…"
              : insight?.source === "gpt"
                ? "GPT-4o mini"
                : gptOn
                  ? "Local + GPT retry"
                  : "Local guide"}
          </span>
        </div>

        {cognitiveHeadline && (
          <p className="mt-2 font-[family-name:var(--font-body)] text-[11px] text-[rgba(0,229,255,0.55)]">
            {cognitiveHeadline}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleArrows}
            className={`rounded-sm px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.12em] ${
              showArrows
                ? "border border-[rgba(232,197,71,0.45)] text-gold-glow"
                : "text-[rgba(255,255,255,0.35)]"
            }`}
          >
            {showArrows ? "Arrows on" : "Arrows"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="nav-link rounded-sm px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.12em] disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        {!gptOn && (
          <p className="mt-3 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.38)]">
            Add your OpenAI key in{" "}
            <a href="#settings" className="text-[rgba(0,229,255,0.7)] underline">
              Settings
            </a>{" "}
            for full ChatGPT explanations on every move.
          </p>
        )}

        {error && (
          <p className="mt-2 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,120,120,0.9)]">
            {error}
          </p>
        )}

        <motion.div
          key={`${focusPly}-${insight?.title}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4"
        >
          <h4 className="font-[family-name:var(--font-display)] text-base text-gold-glow">
            {insight?.title ?? "Loading…"}
          </h4>
          <p className="mt-1 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.25)]">
            {focusPly < 0
              ? "Opening overview"
              : `Move ${focusPly + 1} of ${totalPlies}`}
          </p>
          <div className="mt-3 max-h-[280px] overflow-y-auto font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.55)]">
            {insight?.explanation
              ? insight.explanation.split("\n\n").map((para, i) => (
                  <p key={i} className={i > 0 ? "mt-3" : ""}>
                    {renderExplanation(para)}
                  </p>
                ))
              : "Generating coach notes…"}
          </div>
        </motion.div>
      </div>

      <div className="glass-panel rounded-sm p-4">
        <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(255,255,255,0.25)]">
          LINE — tap to explain
        </p>
        <ol className="mt-3 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onSelectPly(-1)}
              className={`w-full rounded-sm px-2 py-1 text-left font-[family-name:var(--font-body)] text-xs ${
                focusPly < 0
                  ? "bg-[rgba(232,197,71,0.12)] text-gold-glow"
                  : "text-[rgba(255,255,255,0.4)] hover:text-white"
              }`}
            >
              Overview
            </button>
          </li>
          {moveLabels.map((san, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelectPly(i)}
                className={`w-full rounded-sm px-2 py-1 text-left font-[family-name:var(--font-body)] text-xs ${
                  focusPly === i
                    ? "bg-[rgba(232,197,71,0.12)] text-gold-glow"
                    : "text-[rgba(255,255,255,0.4)] hover:text-white"
                }`}
              >
                {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : "…"}
                {san}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
