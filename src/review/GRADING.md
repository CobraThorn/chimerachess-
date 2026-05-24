# Move grading & accuracy (Chess.com industry standard → CHIMERA)

Chess.com does not publish exact proprietary formulas, but Stockfish-based review tools (Chess.com, Lichess CAPS, research engines) converge on the same model. **CHIMERA game review follows that model** for CPL, accuracy, and move labels, then layers psychology, phenotype, and longitudinal memory on top.

---

## Core idea

Every user move is scored from **engine evaluation before and after the move** (Stockfish in our build).

Compare:

- Evaluation after the **best move** in the position  
- Evaluation after **your move**  
- The gap → **centipawn loss (CPL)** on your side of the board  

```
CPL ≈ eval(best line) − eval(your line)   (from your perspective)
```

Example (your perspective):

| Line        | Eval  |
| ----------- | ----- |
| Before move | +0.20 |
| After best  | +0.80 |
| After yours | −1.50 |

You gave up roughly **220 CPL** versus the engine line.

---

## Step 1 — Per-move CPL

`buildGameReview` grades each user move at review depth via `gradeUserMoveForReview` → `cpLoss`.

That value feeds:

- Move grade (`classifyMove.ts`)  
- Per-move accuracy % (`accuracy.ts`)  
- Game accuracy & ACPL (`buildGameReview.ts`)  

---

## Step 2 — Accuracy (0–100)

Chess.com does **not** use a linear map. Small CPL barely hurts; large CPL crushes the score. That matches human perception (“one blunder ruins the game stat”).

### Industry-style curve (CAPS family)

CHIMERA uses the same exponential form as CAPS / chess.com-style tools:

```ts
// src/review/accuracy.ts
accuracy_move = clamp(0, 100, round(103.17 * e^(-0.04354 * CPL) − 3.17))
```

**Game accuracy** = average of per-move accuracies (not average CPL fed once into the curve).

### Rough CPL → accuracy bands

| Avg CPL (guide) | Typical accuracy |
| ---------------- | ---------------- |
| 0–10             | 98–100           |
| 10–30            | 90–97            |
| 30–70            | 75–90            |
| 70–150           | 50–75            |
| 150+             | &lt;50           |

**ACPL** (average centipawn loss) is also shown: plain mean of CPL per move — easier to compare across games.

### What accuracy means

Accuracy is **not** “% of moves that were correct.”

It is: **how far your moves deviated from engine perfection**, compressed onto a 0–100 scale.

---

## Step 3 — Inaccuracy / Mistake / Blunder

Threshold-based, with light context (winning “miss”, opening “book”).

### CHIMERA thresholds (`src/review/classifyMove.ts`)

| Grade        | CPL (typical) | Notes |
| ------------ | ------------- | ----- |
| Excellent    | ≤50           | Near-best |
| Good         | ≤100          | Small leak |
| Inaccuracy   | 100–299       | `CP_INACCURACY = 100` |
| Mistake      | 300–499       | `CP_MISTAKE = 300` |
| Blunder      | ≥500          | `CP_BLUNDER = 500` |

Chess.com also treats some lines as blunders when **material is hung** or the eval **swings sharply**, even if CPL is mid-range. CHIMERA adds that via live `MistakeRecord` categories (`hangs-piece`, etc.) in mistake intelligence, not only CPL.

### Miss (winning position)

If you were **already winning** (`userEvalBeforeCp ≥ 200`) and lose ≥100 CPL, the grade is **Miss** — letting a large advantage slip.

### Book

Opening plies (≤14) with CPL &lt;35 can be labeled **Book** when not engine-best.

---

## Step 4 — Brilliant & Best

**Best** — engine top line or within ~10 cp of it (`playedBest`).

**Brilliant** — rare: near-best move **and** (only-move gap ≥200 cp vs 2nd line, or material sacrifice that still holds eval). Ordinary top moves are **Best**, not Brilliant.

---

## Step 5 — What Chess.com may add (not all in CHIMERA yet)

| Feature | Chess.com (typical) | CHIMERA today |
| ------- | ------------------- | ------------- |
| CPL per move | Yes | Yes |
| Exponential accuracy | Yes | Yes (`accuracy.ts`) |
| CPL thresholds | Yes | Yes (`classifyMove.ts`) |
| Late-game move weighting | Often | No (equal weight) |
| Forced-line CPL adjustment | Sometimes | Partial (engine depth) |
| Brilliant sacrifice detection | Yes | Simplified |
| Cognitive / phenotype layer | No | Yes (intelligence engine) |
| Mistake autopsy + GPT | No | Yes (`mistakeIntel`) |
| Longitudinal weak-point puzzles | No | Yes (`personalPuzzles`, 5+ games) |

---

## One-line summary

| System | Question it answers |
| ------ | ------------------- |
| **Chess.com-style review** | How far from engine perfection were you? |
| **CHIMERA** | Why did your mind produce those moves, and how is that changing over time? |

---

## Code map

| File | Role |
| ---- | ---- |
| `accuracy.ts` | `cpLossToAccuracy`, `averageAccuracy`, `averageCentipawnLoss` |
| `classifyMove.ts` | `classifyMoveGrade`, thresholds, insight copy |
| `buildGameReview.ts` | Orchestrates review, aggregates stats |
| `reviewEngine.ts` | Stockfish depth / movetime for review |
| `metricsDisplay.ts` | Pawn-language labels for UI (not raw CPL) |

To tune grading: adjust `CP_*` in `classifyMove.ts` or the exponential constants in `accuracy.ts`, then re-run a game review.
