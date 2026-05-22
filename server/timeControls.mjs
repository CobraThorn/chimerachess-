/** Standard pool time controls (initial seconds + increment seconds). */
export const TIME_CONTROLS = {
  bullet: {
    id: "bullet",
    label: "Bullet",
    tagline: "1+0 — sixty seconds, zero margin",
    initialMs: 60_000,
    incrementMs: 0,
  },
  blitz: {
    id: "blitz",
    label: "Blitz",
    tagline: "3+2 — three minutes plus Fischer increment",
    initialMs: 180_000,
    incrementMs: 2_000,
  },
  rapid: {
    id: "rapid",
    label: "Rapid",
    tagline: "10+5 — ten minutes, five second increment",
    initialMs: 600_000,
    incrementMs: 5_000,
  },
};

export function getTimeControl(id) {
  return TIME_CONTROLS[id] ?? null;
}
