import { useEffect, useState } from "react";
import { hashToTimeControl, type TimeControlId } from "../../online/timeControls";
import ChimeraMatch from "./ChimeraMatch";
import ChimeraVsChimera from "./ChimeraVsChimera";
import OnlinePlay from "./OnlinePlay";
import RatedLobby from "./RatedLobby";
import SoloRatedMatch from "./SoloRatedMatch";

type PlayMode = "you" | "mirror" | "online" | "rated";

const MODES: { id: PlayMode; label: string; sub: string }[] = [
  { id: "you", label: "You vs CHIMERA", sub: "Learn & adapt" },
  { id: "rated", label: "Rated clocks", sub: "Bullet · Blitz · Rapid" },
  { id: "online", label: "Online", sub: "Find a human" },
  { id: "mirror", label: "CHIMERA vs CHIMERA", sub: "Mirror duel" },
];

function readHashMode(): { mode: PlayMode; tc: TimeControlId | null } {
  const hash = window.location.hash.replace("#", "");
  if (hash === "play-ranked") return { mode: "rated", tc: null };
  const tc = hashToTimeControl(hash);
  if (tc) return { mode: "rated", tc };
  return { mode: "you", tc: null };
}

const RATED_HASH: Record<PlayMode, string> = {
  you: "play",
  rated: "play-rated",
  online: "play-online",
  mirror: "play",
};

export default function PlayArena() {
  const [{ mode, tc: hashTc }, setRoute] = useState(readHashMode);
  const [ratedTc, setRatedTc] = useState<TimeControlId | null>(() =>
    readHashMode().mode === "rated" ? readHashMode().tc : null
  );

  useEffect(() => {
    const onHash = () => {
      const next = readHashMode();
      setRoute(next);
      if (next.mode === "rated") setRatedTc(next.tc);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (mode === "rated") setRatedTc(hashTc);
  }, [mode, hashTc]);

  const setMode = (m: PlayMode) => {
    setRoute({ mode: m, tc: null });
    if (m === "rated") {
      setRatedTc(null);
      window.location.hash = RATED_HASH.rated;
    } else if (m === "online") {
      setRatedTc(null);
      window.location.hash = RATED_HASH.online;
    } else {
      setRatedTc(null);
      window.location.hash = RATED_HASH.you;
    }
  };

  const startRated = (tc: TimeControlId) => {
    setRoute({ mode: "rated", tc });
    setRatedTc(tc);
    window.location.hash = `play-${tc}`;
  };

  return (
    <div className="w-full">
      <div className="mx-auto mb-10 flex max-w-3xl flex-wrap justify-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`min-w-[7.5rem] flex-1 rounded-sm px-3 py-3 text-left transition-all sm:min-w-[9rem] ${
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
      {mode === "online" && <OnlinePlay />}
      {mode === "rated" &&
        (ratedTc ? (
          <SoloRatedMatch
            tc={ratedTc}
            onBack={() => {
              setRatedTc(null);
              setRoute({ mode: "rated", tc: null });
              window.location.hash = RATED_HASH.rated;
            }}
          />
        ) : (
          <RatedLobby onSelect={startRated} />
        ))}
    </div>
  );
}
