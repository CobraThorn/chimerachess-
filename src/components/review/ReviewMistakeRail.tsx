import type { GameReviewReport, MoveGrade } from "../../review/types";

const CHIP: Record<
  MoveGrade,
  { label: string; border: string; bg: string; text: string }
> = {
  brilliant: {
    label: "!!",
    border: "rgba(0,229,255,0.4)",
    bg: "rgba(0,229,255,0.1)",
    text: "rgba(0,229,255,0.9)",
  },
  great: {
    label: "!",
    border: "rgba(52,211,153,0.35)",
    bg: "rgba(52,211,153,0.08)",
    text: "rgba(52,211,153,0.9)",
  },
  good: {
    label: "✓",
    border: "rgba(255,255,255,0.15)",
    bg: "rgba(255,255,255,0.04)",
    text: "rgba(255,255,255,0.7)",
  },
  book: {
    label: "📖",
    border: "rgba(232,197,71,0.3)",
    bg: "rgba(232,197,71,0.06)",
    text: "rgba(232,197,71,0.85)",
  },
  inaccuracy: {
    label: "?!",
    border: "rgba(255,200,100,0.35)",
    bg: "rgba(255,200,100,0.08)",
    text: "rgba(255,200,100,0.9)",
  },
  mistake: {
    label: "?",
    border: "rgba(255,160,80,0.4)",
    bg: "rgba(255,160,80,0.1)",
    text: "rgba(255,160,80,0.95)",
  },
  blunder: {
    label: "??",
    border: "rgba(255,120,120,0.45)",
    bg: "rgba(255,100,100,0.12)",
    text: "rgba(255,120,120,0.95)",
  },
};

interface ReviewMistakeRailProps {
  report: GameReviewReport;
  activePly: number;
  onJump: (ply: number) => void;
}

export default function ReviewMistakeRail({
  report,
  activePly,
  onJump,
}: ReviewMistakeRailProps) {
  const clickable = report.userMoves.filter(
    (m) =>
      m.grade === "blunder" ||
      m.grade === "mistake" ||
      m.grade === "inaccuracy" ||
      m.isCritical
  );

  if (clickable.length === 0) {
    return (
      <p className="font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
        No major inaccuracies — strong game. Scrub the timeline to revisit key positions.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(255,120,120,0.65)] uppercase">
        Tap a mistake — heat map shows before you played
      </p>
      <div className="flex flex-wrap gap-2">
        {clickable.map((m) => {
          const c = CHIP[m.grade];
          const active = activePly === m.ply;
          return (
            <button
              key={m.ply}
              type="button"
              onClick={() => onJump(m.ply)}
              className="rounded-sm border px-3 py-2 text-left transition-all hover:scale-[1.02]"
              style={{
                borderColor: active ? "rgba(0,229,255,0.55)" : c.border,
                background: active ? "rgba(0,229,255,0.12)" : c.bg,
                boxShadow: active ? "0 0 20px rgba(0,229,255,0.15)" : undefined,
              }}
            >
              <span
                className="font-[family-name:var(--font-hud)] text-[10px]"
                style={{ color: c.text }}
              >
                {c.label} Move {Math.ceil(m.ply / 2)}
              </span>
              <span className="mt-0.5 block font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.5)]">
                {m.san ?? m.uci} · {m.accuracyPct}% · −{m.cpLoss}cp
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
