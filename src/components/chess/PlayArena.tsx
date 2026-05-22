import { useEffect, useState } from "react";
import { hashToTimeControl, type TimeControlId } from "../../online/timeControls";
import ChimeraMatch from "./ChimeraMatch";
import ChimeraVsChimera from "./ChimeraVsChimera";
import OnlinePlay from "./OnlinePlay";

type PlayMode = "you" | "mirror" | "online";

const MODES: { id: PlayMode; label: string; sub: string }[] = [
  { id: "you", label: "You vs CHIMERA", sub: "Learn & adapt" },
  { id: "online", label: "Online", sub: "Bullet · Blitz · Rapid" },
  { id: "mirror", label: "CHIMERA vs CHIMERA", sub: "Mirror duel" },
];

function readHashMode(): { mode: PlayMode; tc: TimeControlId | null } {
  const hash = window.location.hash.replace("#", "");
  const tc = hashToTimeControl(hash);
  if (tc) return { mode: "online", tc };
  return { mode: "you", tc: null };
}

export default function PlayArena() {
  const [{ mode, tc: hashTc }, setRoute] = useState(readHashMode);

  useEffect(() => {
    const onHash = () => setRoute(readHashMode());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="w-full">
      <div className="mx-auto mb-10 flex max-w-2xl justify-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setRoute({ mode: m.id, tc: null });
              if (m.id !== "online") {
                window.location.hash = "play";
              }
            }}
            className={`flex-1 rounded-sm px-4 py-3 text-left transition-all ${
              mode === m.id
                ? "glass-panel border-[rgba(232,197,71,0.35)] shadow-[0_0_24px_rgba(232,197,71,0.1)]"
                : "border border-transparent opacity-60 hover:opacity-90"
            }`}
          >
            <span
              className={`block font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] uppercase ${
                mode === m.id ? "text-gold-glow" : "text-[rgba(255,255,255,0.5)]"
              }`}
            >
              {m.label}
            </span>
            <span className="mt-1 block font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.35)]">
              {m.sub}
            </span>
          </button>
        ))}
      </div>

      {mode === "you" && <ChimeraMatch />}
      {mode === "mirror" && <ChimeraVsChimera />}
      {mode === "online" && <OnlinePlay initialTc={hashTc} />}
    </div>
  );
}
