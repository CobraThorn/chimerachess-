import { fromFen } from "../../chess/fen";
import { getLegalMoves, makeMove } from "../../chess/game";
import { algebraic } from "../../chess/square";
import type { Color } from "../../chess";
import { uciToMove } from "../../chess/uci";
import { analyzeOpenFiles } from "../../review/positionInsights";

export function explainBestMove(
  fenBefore: string,
  bestUci: string,
  playedUci: string,
  userColor: Color
): string {
  const state = fromFen(fenBefore);
  if (!state) {
    return `${bestUci} is the engine's top choice — it preserves the evaluation better than ${playedUci}.`;
  }

  const best = uciToMove(state, bestUci);
  if (!best) {
    return `${bestUci} improves the position by consolidating threats and piece coordination.`;
  }

  const after = makeMove(state, best);
  if (!after) {
    return `${bestUci} is preferred for tactical and positional reasons the engine sees one ply deeper.`;
  }

  const parts: string[] = [];
  const fromAlg = algebraic(best.from);
  const toAlg = algebraic(best.to);

  if (best.flags?.includes("capture")) {
    parts.push(`${bestUci} wins material or defuses a capture sequence immediately.`);
  } else if (best.flags?.includes("castle-k") || best.flags?.includes("castle-q")) {
    parts.push(`${bestUci} improves king safety and connects rooks — a high-leverage quiet move.`);
  } else {
    const piece = state.board[best.from];
    const name =
      piece?.type === "n"
        ? "Knight"
        : piece?.type === "b"
          ? "Bishop"
          : piece?.type === "r"
            ? "Rook"
            : piece?.type === "q"
              ? "Queen"
              : "Piece";
    parts.push(
      `${name} ${fromAlg}→${toAlg} improves piece activity and keeps your pieces coordinated.`
    );
  }

  const { open, semiOpen } = analyzeOpenFiles(after, userColor);
  if (open.length > 0 || semiOpen.length > 0) {
    parts.push(
      `It respects open-file geometry (${[...open, ...semiOpen].slice(0, 3).join(", ")}) — stronger players occupy these lines before the opponent.`
    );
  }

  const legal = getLegalMoves(state);
  const checks = legal.filter((m) => {
    const n = makeMove(state, m);
    return n && m.to !== best.to;
  });
  if (checks.length > 0 && !bestUci.includes("+")) {
    parts.push("Short-term: it avoids unnecessary forcing play while improving the position.");
  } else {
    parts.push("Short-term: it addresses the opponent's threats; long-term: it preserves initiative.");
  }

  if (playedUci !== bestUci) {
    parts.push(
      `Compared to ${playedUci}, ${bestUci} is what stronger players prefer when calculating one more ply of replies.`
    );
  }

  return parts.join(" ");
}
