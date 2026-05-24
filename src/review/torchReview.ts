import { evalFromResult } from "../engine/analysis";
import type { ChessEngine } from "../engine/types";
import { searchPosition } from "../engine/stockfish";
import type { GameReviewReport, ReviewMoveAnalysis, ReviewProgress } from "./types";

const TORCH_REVIEW_DEPTH = 14;

function torchAgrees(user: ReviewMoveAnalysis, torchBest: string): boolean {
  if (!torchBest) return true;
  if (torchBest === user.bestUci || torchBest === user.uci) return true;
  return false;
}

/** Second opinion on critical / high-loss user moves (Chess.com Torch 4 style). */
export async function enrichReviewWithTorch(
  torch: ChessEngine,
  report: GameReviewReport,
  onProgress?: (p: ReviewProgress) => void
): Promise<GameReviewReport> {
  const targets = new Map<number, ReviewMoveAnalysis>();
  for (const u of report.criticalMoments) targets.set(u.ply, u);
  for (const u of report.userMoves) {
    if (u.cpLoss >= 80 && !targets.has(u.ply)) targets.set(u.ply, u);
  }
  const list = [...targets.values()].sort((a, b) => b.cpLoss - a.cpLoss).slice(0, 14);
  if (!list.length) {
    return { ...report, torchUsed: false, analysisEngines: ["stockfish"] };
  }

  const total = list.length + 1;
  let step = 0;
  const tick = (label: string) => {
    step += 1;
    onProgress?.({ step, total, label });
  };

  tick("Torch 4 second opinion…");

  const userMoves = report.userMoves.map((u) => ({ ...u }));
  const byPly = new Map(userMoves.map((u) => [u.ply, u]));
  let disagreements = 0;

  for (const src of list) {
    const u = byPly.get(src.ply);
    if (!u) continue;

    torch.stop();
    const root = await searchPosition(torch, u.fenBefore, TORCH_REVIEW_DEPTH, 2);
    const torchBest = root.topMoves[0]?.move ?? u.bestUci;
    const { cpWhite } = evalFromResult(u.fenBefore, root.eval);
    const agrees = torchAgrees(u, torchBest);

    u.torchBestUci = torchBest;
    u.torchEvalWhite = cpWhite;
    u.torchAgrees = agrees;
    if (!agrees) {
      disagreements += 1;
      u.insight = `${u.insight} Torch 4 suggests ${torchBest} here.`;
    }
    tick(`Torch · move ${Math.ceil(u.ply / 2)}`);
  }

  const criticalMoments = report.criticalMoments.map(
    (c) => byPly.get(c.ply) ?? c
  );

  const narrative = [...report.narrative];
  if (disagreements > 0) {
    narrative.unshift(
      `Torch 4 disagreed with Stockfish on ${disagreements} key moment${disagreements > 1 ? "s" : ""} — compare both lines in the recap.`
    );
  } else {
    narrative.unshift("Torch 4 confirmed Stockfish on your critical positions.");
  }

  return {
    ...report,
    userMoves,
    criticalMoments,
    narrative: narrative.slice(0, 7),
    torchUsed: true,
    analysisEngines: ["stockfish", "torch"],
  };
}
