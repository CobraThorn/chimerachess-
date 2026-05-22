# CHIMERA — Elite Chess Landing

Premium cinematic landing page blending F1 telemetry, luxury watch precision, cyberpunk HUDs, and trading-terminal polish.

## Run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Stockfish 18

Installed via npm (`stockfish@18` — Stockfish.js lite single-threaded, ~7MB).

```bash
npm install          # runs postinstall → copies WASM to public/stockfish/
npm run stockfish:copy   # manual copy if needed
```

Engine API: `src/engine/stockfish.ts` · FEN export: `src/chess/fen.ts`

## CHIMERA AI (learning opponent)

**Play CHIMERA** in the `#play` section — you (White) vs CHIMERA (Black).

- Starts around **250 Elo** (shallow search + random moves + weak skill)
- **Remembers every game** in `localStorage` (`chimera-memory-v1`)
- After each of your moves, Stockfish checks for blunders/inaccuracies
- CHIMERA builds **patterns** from your repeated mistakes and tries to **refute** them in future games
- **Adaptation %** rises as it learns your habits (separate from raw strength cap ~600 display Elo)

Modules: `src/ai/chimeraBot.ts`, `src/ai/memory.ts`, `src/ai/mistakeAnalyzer.ts`

## Stack

- React 19 + Vite 6
- Tailwind CSS 4
- Framer Motion
- Stockfish 18 (WASM)

## Screens

- **Landing** — Hero with animated chess board, particle field, gold typography, Play / Train / Analyze CTAs, glass navbar with login & sign up
