import type { IntelligenceArchive } from "../intelligence/types";
import { COGNITIVE_PROFILE_CONFIG as CFG } from "./config";
import { windowMean, windowStdDev, linearSlope } from "./seriesBuilder";
import type { GameSeriesPoint } from "./types";
import type { ChessMaturityModel, MaturityDimension } from "./types";

function trendFromSlope(slope: number, volatile: boolean): MaturityDimension["trend"] {
  if (volatile) return "volatile";
  if (slope > 0.8) return "rising";
  if (slope < -0.8) return "falling";
  return "stable";
}

export function buildChessMaturity(
  archive: IntelligenceArchive,
  series: GameSeriesPoint[]
): ChessMaturityModel {
  const phenotype = archive.phenotype;
  const acc = series.map((p) => p.accuracy);
  const acpl = series.map((p) => p.acpl);
  const blunders = series.map((p) => p.blunders);

  const accStd = windowStdDev(acc);
  const acplMean = windowMean(acpl);
  const blunderMean = windowMean(blunders);

  const stability = Math.round(Math.max(20, Math.min(95, 100 - accStd * 4)));
  const consistency = Math.round(
    Math.max(25, Math.min(92, 100 - windowStdDev(acpl) / 2))
  );
  const emotionalControl = Math.round(
    100 - (phenotype.tiltTendency?.score ?? 50)
  );
  const positionalUnderstanding = Math.round(
    phenotype.positionalDiscipline?.score ?? 50
  );
  const tacticalReliability = Math.round(
    phenotype.tacticalSharpness?.score ?? 50
  );
  const decisionDiscipline = Math.round(
    Math.max(15, Math.min(95, 100 - blunderMean * 22 - acplMean / 3))
  );

  const clkSlope = linearSlope(series.map((p) => p.phenotype.timePressureResilience));
  const volatile = accStd >= CFG.volatilityStdDevMin;

  const dimensions: MaturityDimension[] = [
    {
      key: "stability",
      label: "Stability",
      score: stability,
      trend: trendFromSlope(-linearSlope(acc), volatile),
      analyticalNote:
        accStd <= 5
          ? "Accuracy variance is tight — performance band is predictable."
          : `Accuracy σ≈${accStd.toFixed(1)}% — outcomes still swing materially game-to-game.`,
    },
    {
      key: "consistency",
      label: "Consistency",
      score: consistency,
      trend: trendFromSlope(-linearSlope(acpl), false),
      analyticalNote:
        acplMean <= 28
          ? "Centipawn loss profile is steady — decision noise is controlled."
          : `Average ACPL ~${Math.round(acplMean)} — consistency still developing.`,
    },
    {
      key: "emotionalControl",
      label: "Emotional control",
      score: emotionalControl,
      trend: trendFromSlope(-linearSlope(series.map((p) => p.phenotype.tiltTendency)), false),
      analyticalNote:
        emotionalControl >= 65
          ? "Tilt leakage is subdued in the phenotype model."
          : "Emotional carry-over after mistakes remains measurable.",
    },
    {
      key: "positionalUnderstanding",
      label: "Positional understanding",
      score: positionalUnderstanding,
      trend: trendFromSlope(linearSlope(series.map((p) => p.phenotype.positionalDiscipline)), false),
      analyticalNote:
        positionalUnderstanding >= 70
          ? "Structural patience scores high — quiet improvements are a strength."
          : "Positional discipline is not yet a dominant trait.",
    },
    {
      key: "tacticalReliability",
      label: "Tactical reliability",
      score: tacticalReliability,
      trend: trendFromSlope(linearSlope(series.map((p) => p.phenotype.tacticalSharpness)), false),
      analyticalNote:
        tacticalReliability >= 70
          ? "Tactical maturity increasing — forcing lines are handled reliably."
          : "Tactical reliability remains the primary variance source.",
    },
    {
      key: "decisionDiscipline",
      label: "Decision discipline",
      score: decisionDiscipline,
      trend: trendFromSlope(-linearSlope(blunders), false),
      analyticalNote:
        blunderMean < 0.8
          ? "Blunder frequency is low relative to volume."
          : "Decision discipline unstable — blunders cluster under pressure.",
    },
  ];

  if (clkSlope > 0.5 && dimensions.find((d) => d.key === "tacticalReliability")) {
    const tac = dimensions.find((d) => d.key === "tacticalReliability")!;
    if (tac.trend === "stable") {
      tac.analyticalNote += " Strategic maturity stable; clock stress is improving.";
    }
  }

  const overallIndex = Math.round(
    dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length
  );

  const rising = dimensions.filter((d) => d.trend === "rising").map((d) => d.label);
  const falling = dimensions.filter((d) => d.trend === "falling").map((d) => d.label);
  let headline = `Maturity index ${overallIndex}/100 — analytical baseline established.`;
  if (rising.length >= 2) {
    headline = `${rising.slice(0, 2).join(" and ")} trending up; maturity index ${overallIndex}.`;
  } else if (falling.length >= 2) {
    headline = `${falling[0]} under strain — index ${overallIndex}, targeted training indicated.`;
  } else if (volatile) {
    headline = `Volatile performance band — maturity index ${overallIndex}, stability is the constraint.`;
  }

  return {
    overallIndex,
    confidence: Math.min(85, 35 + series.length * 4),
    dimensions,
    headline,
  };
}
