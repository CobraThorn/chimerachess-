import {
  formatExpectedScoreFormula,
  formatExpectedScoreValue,
} from "../../ai/chimeraCalibration";
import type { CalibrationMathSnapshot } from "../../ai/types";

interface ChimeraCalibrationMathProps {
  math: CalibrationMathSnapshot;
  compact?: boolean;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default function ChimeraCalibrationMath({
  math,
  compact = false,
}: ChimeraCalibrationMathProps) {
  const sign = math.surprise >= 0 ? "+" : "";
  const deltaSign = math.chimeraDelta >= 0 ? "+" : "";

  if (compact) {
    return (
      <p className="font-[family-name:var(--font-body)] text-[10px] leading-relaxed text-[rgba(255,255,255,0.45)]">
        S={pct(math.performanceScore)} · E={pct(math.expectedScore)} · ΔR
        <sub>c</sub>={deltaSign}
        {math.chimeraDelta} (K={math.kFactor})
      </p>
    );
  }

  return (
    <div className="glass-panel space-y-3 rounded-sm p-4 text-left">
      <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.55)] uppercase">
        CHIMERA rating math
      </p>

      <div className="space-y-2 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.5)]">
        <p>
          <span className="text-[rgba(232,197,71,0.75)]">R</span>
          <sub>u</sub> = {math.userRating} ·{" "}
          <span className="text-[rgba(0,229,255,0.75)]">R</span>
          <sub>c</sub> played = {math.chimeraPlayedElo} · σ ={" "}
          {math.ratingDeviation}
        </p>
        <p className="font-mono text-[10px] text-[rgba(255,255,255,0.4)]">
          {formatExpectedScoreFormula(math.userRating, math.chimeraPlayedElo)}
        </p>
        <p>{formatExpectedScoreValue(math.userRating, math.chimeraPlayedElo)}</p>
      </div>

      <table className="w-full font-[family-name:var(--font-hud)] text-[9px] tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
        <tbody>
          <tr>
            <td className="py-1 pr-2 text-[rgba(255,255,255,0.35)]">Result S₀</td>
            <td className="py-1 text-right tabular-nums">{pct(math.resultScore)}</td>
          </tr>
          <tr>
            <td className="py-1 pr-2 text-[rgba(255,255,255,0.35)]">Move η</td>
            <td className="py-1 text-right tabular-nums">
              ×{math.efficiencyFactor.toFixed(2)} ({math.fullMoves} full moves)
            </td>
          </tr>
          {math.mistakePenalty > 0 && (
            <tr>
              <td className="py-1 pr-2 text-[rgba(255,255,255,0.35)]">Mistake −</td>
              <td className="py-1 text-right tabular-nums">
                {pct(math.mistakePenalty)}
              </td>
            </tr>
          )}
          <tr>
            <td className="py-1 pr-2 text-[rgba(255,255,255,0.35)]">Performance S</td>
            <td className="py-1 text-right tabular-nums text-gold-glow">
              {pct(math.performanceScore)}
            </td>
          </tr>
          <tr>
            <td className="py-1 pr-2 text-[rgba(255,255,255,0.35)]">Expected E</td>
            <td className="py-1 text-right tabular-nums">{pct(math.expectedScore)}</td>
          </tr>
          <tr>
            <td className="py-1 pr-2 text-[rgba(255,255,255,0.35)]">Surprise S−E</td>
            <td className="py-1 text-right tabular-nums text-[rgba(0,229,255,0.85)]">
              {sign}
              {pct(math.surprise)}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="border-t border-[rgba(255,255,255,0.06)] pt-3 font-mono text-[10px] leading-relaxed text-[rgba(255,255,255,0.55)]">
        ΔR<sub>c</sub> = K × (S − E) = {math.kFactor} × ({pct(math.performanceScore)} −{" "}
        {pct(math.expectedScore)}) ={" "}
        <span className="text-[rgba(0,229,255,0.9)]">
          {deltaSign}
          {math.chimeraDelta}
        </span>
        <br />
        R<sub>c</sub>: {math.chimeraStoredBefore} → {math.chimeraStoredAfter}
      </p>
    </div>
  );
}
