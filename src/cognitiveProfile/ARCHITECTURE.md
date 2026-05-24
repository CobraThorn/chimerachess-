# Cognitive Timeline + Player Identity

Extends `IntelligenceArchive` with `cognitiveProfile` — rebuilt after every `runPostGameIntelligence()`.

## Data model

```typescript
IntelligenceArchive.cognitiveProfile?: {
  version: 1;
  timeline: CognitiveTimelineEvent[];
  identity: PlayerIdentityModel;      // mixture weights
  maturity: ChessMaturityModel;       // 6 analytical dimensions
  insights: ProfileInsightsSnapshot;
  gamesAnalyzed: number;
  gptSummary?: string;
}
```

Migration-safe: field optional; old saves work.

## Pipeline

```
memory.intelligence.reports + phenotype.history + mistakeFamilies
  → buildGameSeries()
  → detectCognitiveTimeline()
  → buildPlayerIdentity()
  → buildChessMaturity()
  → buildProfileInsights()
  → (Profile page) generateProfileGptSummary()
```

## Detection (timeline)

| Type | Trigger (simplified) |
|------|----------------------|
| breakthrough | Phenotype or accuracy window Δ above threshold |
| collapse | Negative window Δ |
| recovery | Endgame discipline decline run then rebound |
| plateau | Low accuracy σ, flat slope |
| volatility | accuracy σ ≥ 12 |
| opening_growth | openingAccuracy slope > 1.2 |
| time_pressure_change | CLK phenotype slope or fast vs slow accuracy gap |
| mistake_pattern | mistakeFamilies occurrences ≥ 3 |
| identity_shift | Primary archetype label changed |

## Identity formula

For each archetype \(A\):

\[
\text{raw}(A) = \frac{\sum_k w_{A,k} \cdot \text{adj}(phenotype_k)}{\sum_k w_{A,k}}
\]

\(\text{adj}\) inverts `tiltTendency`. Weights → softmax → top 4 profiles summing ~100%.

## Maturity index

Mean of six scores (0–100): stability, consistency, emotional control, positional understanding, tactical reliability, decision discipline — derived from phenotype + report series statistics. **Not Elo.**

## Example JSON (truncated)

```json
{
  "version": 1,
  "timeline": [{
    "type": "breakthrough",
    "title": "Aggression lifted",
    "confidence": 72,
    "evidence": [{ "metric": "aggression", "change": 11, "explanation": "Window mean 52 → 63." }]
  }],
  "identity": {
    "currentIdentity": [
      { "id": "tactical_aggressor", "label": "Tactical aggressor", "weight": 42 },
      { "id": "controlled_aggressor", "label": "Controlled aggressor", "weight": 28 }
    ],
    "confidence": 68,
    "driftSummary": "Trajectory: initiative and aggression rising."
  },
  "maturity": {
    "overallIndex": 61,
    "headline": "Tactical reliability trending up; maturity index 61."
  }
}
```

## UI

`CognitiveProfileSection` on Profile — timeline filters, identity bars, maturity grid, insights panels.
