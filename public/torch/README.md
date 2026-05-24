# Torch 4 assets

Place licensed Torch 4 browser worker files in `third_party/torch/` at the repo root:

- `torch-4.js`
- `torch-4.wasm`

Then run `npm run torch:copy` (or `npm run build`).

CHIMERA probes `/torch/torch-4.js` and enables dual analysis when present.
