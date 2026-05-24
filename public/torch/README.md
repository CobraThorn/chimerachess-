# Torch 4 / dual analysis

**You do not need to do anything.** The build copies a second engine here automatically so dual analysis and CHIMERA review work on Netlify.

## What you get out of the box

- **Analyze** → SF 18 / Torch 4 / Dual buttons
- **Game review** → Stockfish grades + second opinion on key moves
- **Strong CHIMERA** → can use the second engine at high Elo

The default install uses a **CHIMERA dual-engine shim** (a second Stockfish WASM worker). It is not Chess.com’s proprietary Torch binary, but it gives you the same *dual-line* experience without setup.

## Optional: real Torch 4 worker

If you have licensed Torch 4 browser files from Chess.com or your org:

1. Put `torch-4.js` + `torch-4.wasm` in `third_party/torch/`
2. Run `npm run build`

Licensed files replace the shim automatically.
