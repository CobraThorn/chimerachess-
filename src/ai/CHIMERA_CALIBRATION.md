# CHIMERA per-player Elo calibration (math)

CHIMERA stores a per-player opponent rating `R_c` (`memory.chimeraElo`). After each vs-CHIMERA game, numbers update from standard Elo-style formulas shown in the UI.

## Expected score

\[
E = \frac{1}{1 + 10^{(R_c - R_u) / 400}}
\]

`R_u` blends **perceived you** (from calibration games) with your **CRS** as more data arrives.

## Performance score S

| Term | Definition |
|------|------------|
| `S₀` | Result: win = 1, draw = 0.5, loss = 0 |
| `η` | Logistic move efficiency (short decisive games → η > 1) |
| penalty | Average mistake centipawn loss, capped |
| `S` | `S₀ × η` (wins) or `S₀ / η` (losses), minus penalty, clamped to [0, 1] |

## Surprise

\[
\text{surprise} = S - E
\]

## Rating update

\[
\Delta R_c = K \times (S - E)
\]

\[
\Delta R_u = K \times (S - E)
\]

**K** = `800 / σ`, where **σ** (rating deviation) starts near 320 and falls as you play more games — same idea as Glicko RD.

Step size is also capped: `±120 / √(1 + n/6)` for game count `n`.

## Target strength

Fair fight target (≈50% expected for you):

\[
R_{c,\text{target}} = R_u + \delta,\quad \delta = 35 + 0.12 \max(0, R_u - 400)
\]

While σ is large, a small pull toward `R_{c,target}` is applied each game.

## Player UI

After each game: **CHIMERA rating math** panel with `R_u`, `R_c`, `E`, `S`, `η`, `K`, and `ΔR_c`.

Status line while learning: `σ 220 · 45%` (deviation · confidence %).

## Tests

```bash
npm run test:calibration
```
