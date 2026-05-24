import type { GameReviewReport } from "../../review/types";
import { MOVE_GRADE_META, isPositiveGrade } from "../../review/moveGrades";

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
  const clickable = report.userMoves.filter((m) => !isPositiveGrade(m.grade) && m.grade !== "book");

  if (clickable.length === 0) {
    return (
      <p className="font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
        No inaccuracies or worse — strong game.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {clickable.map((m) => {
        const meta = MOVE_GRADE_META[m.grade];
        const active = activePly === m.ply;
        return (
          <button
            key={m.ply}
            type="button"
            onClick={() => onJump(m.ply)}
            className={`rounded-sm border px-3 py-2 text-left transition-all ${meta.borderClass} ${active ? "ring-1 ring-[rgba(0,229,255,0.5)]" : ""}`}
            style={{ background: active ? "rgba(0,229,255,0.1)" : undefined }}
          >
            <span className={`font-[family-name:var(--font-hud)] text-[10px] ${meta.textClass}`}>
              {meta.name} · move {Math.ceil(m.ply / 2)}
            </span>
            <span className="mt-0.5 block font-mono text-[10px] text-[rgba(255,255,255,0.5)]">
              {m.san ?? m.uci}
            </span>
          </button>
        );
      })}
    </div>
  );
}
