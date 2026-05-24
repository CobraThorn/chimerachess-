# CHIMERA per-player Elo calibration

CHIMERA maintains a **stored** opponent rating (`memory.chimeraElo`) per player, separate from your CRS. It converges on the strength needed for competitive games.

## Signals

| Signal | Effect |
|--------|--------|
| **Result** | Win / loss / draw vs expected score (Elo formula) |
| **Move count** | Fast wins (e.g. ~25 full moves) amplify “you were stronger than this setting” |
| **Played Elo** | Uses effective strength at **game start** (snapshot), not end-of-game |
| **CRS anchor** | Blends in your Chimera Rating as more calibration games are played |

## Updates (after each vs-CHIMERA game)

- **Stored CHIMERA Elo** moves up when you outperform; down when CHIMERA dominates.
- **Perceived user Elo** tracks your strength from these games alone.
- **Confidence** rises with game count → smaller per-game steps, stable matchmaking.

## Engine strength

`effectiveChimeraElo()` uses stored rating once confidence is high (~82%+). Early on, a challenge floor still applies so games are not trivial.

## UI

- **Calibrating · N%** under CHIMERA Elo until confidence ≥ 82%.
- Post-game **±** on CHIMERA badge reflects the calibration delta.

## Tests

```bash
npm run test:calibration
```
