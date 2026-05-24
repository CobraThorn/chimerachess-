# Mistake Explanation Engine

Extends Stockfish game review with **elite-coach depth** — every inaccuracy+ gets structured intelligence, not a one-line engine diff.

## Extension model (no review rewrite)

```
buildGameReview()  →  GameReviewReport (unchanged)
runPostGameIntelligence()  →  buildMistakeIntelligenceReport(reviewReport)
                         →  report.mistakeIntelligence + archive.mistakeFamilies
```

## Modules

| Path | Role |
|------|------|
| `evidence/tacticalScan.ts` | Hanging pieces, captures, open files, king blind spots, discovered-attack hints |
| `evidence/positionalAnalysis.ts` | King safety, files, center, coordination narratives |
| `evidence/cognitiveModel.ts` | Probabilistic cognitive failure labels |
| `evidence/bestMoveAnalysis.ts` | Why the engine line works (not just UCI) |
| `services/mistakeExplainer.ts` | Assembles `MistakeIntelligence` per move |
| `services/patternRegistry.ts` | Cross-game `MistakePatternFamily` persistence |
| `engine.ts` | `buildMistakeIntelligenceReport()` |

## Persistence (migration-safe)

`ChimeraMemory.intelligence.mistakeFamilies` — optional array; older saves omit it.

Each `PostGameIntelligenceReport` may include `mistakeIntelligence` (version 1).

## Scoring

- **Severity**: maps review grades + `cpLoss` / `isCritical`
- **Confidence**: blend of cognitive inference weights + review depth baseline (~72%)

## Example JSON (truncated)

```json
{
  "id": "mistake-24",
  "moveNumber": 12,
  "severity": "blunder",
  "playerMove": "Nf3",
  "bestMove": "Re1",
  "evaluationSwing": 340,
  "headline": "Move 12: hanging piece — major swing (3.4 pawns)",
  "explanation": {
    "whatHappened": "You played Nf3 (blunder, 42% accuracy)...",
    "whyWrong": "You weakened square control near your king...",
    "violatedConcepts": ["king safety", "coordination"],
    "whyBestMoveWorks": "Re1 centralizes a rook...",
    "likelyThoughtProcess": "You may have been prioritizing development...",
    "cognitiveFailure": ["Probable cause (high confidence): Threat blindness..."],
    "boardConsequences": ["King-zone control weakened (1 → 4 vulnerable squares)"],
    "preventionAdvice": "Before every move: checks, captures, threats..."
  },
  "patternTags": ["hanging_piece:recurring"],
  "trainingRecommendation": ["Daily 5-minute scan: list every piece attacked..."]
}
```

## UI

- `MistakeDeepDivePanel` inside `PostGameIntelligencePanel` — expandable cards per move
- `MistakeLabPanel` on Profile — recurring `mistakeFamilies` + recent session summaries

## Clock data

`StoredGame.userMoveTimesMs` is recorded in Chimera and Solo rated matches and passed into `buildMistakeIntelligenceReport` for clock-pressure cognitive inference.
