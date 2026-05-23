import { useEffect, useRef, useState } from "react";
import { hashToTimeControl, type TimeControlId } from "../../online/timeControls";
import { useOnlineClient } from "../../online/useOnlineClient";
import OnlineLobby from "./OnlineLobby";
import OnlineMatch from "./OnlineMatch";
import SoloRatedMatch from "./SoloRatedMatch";

interface OnlinePlayProps {
  /** From URL hash (#play-blitz etc.) — auto-queue when set */
  initialTc?: TimeControlId | null;
}

export default function OnlinePlay({ initialTc = null }: OnlinePlayProps) {
  const {
    state,
    connect,
    disconnect,
    findGame,
    cancelQueue,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    resetToLobby,
  } = useOnlineClient();

  const [activeTc, setActiveTc] = useState<TimeControlId | null>(initialTc);
  const [soloTc, setSoloTc] = useState<TimeControlId | null>(null);
  const [queueWaitSec, setQueueWaitSec] = useState(0);
  const autoQueuedRef = useRef(false);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!initialTc || autoQueuedRef.current || soloTc) return;
    if (state.connected && state.phase === "idle") {
      findGame(initialTc);
      setActiveTc(initialTc);
      autoQueuedRef.current = true;
    }
  }, [initialTc, soloTc, state.connected, state.phase, findGame]);

  useEffect(() => {
    if (state.phase !== "queued") {
      setQueueWaitSec(0);
      return;
    }
    const started = Date.now();
    const id = setInterval(
      () => setQueueWaitSec(Math.floor((Date.now() - started) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [state.phase, activeTc]);

  const handleFind = (tc: TimeControlId) => {
    setSoloTc(null);
    setActiveTc(tc);
    findGame(tc);
  };

  const handlePlayBot = (tc: TimeControlId) => {
    cancelQueue();
    setActiveTc(tc);
    setSoloTc(tc);
  };

  if (soloTc) {
    return (
      <SoloRatedMatch
        tc={soloTc}
        onBack={() => {
          setSoloTc(null);
          resetToLobby();
        }}
      />
    );
  }

  if (state.phase === "playing" || state.phase === "ended") {
    if (!state.match) return null;
    return (
      <OnlineMatch
        client={state}
        onSendMove={sendMove}
        onResign={resign}
        onOfferDraw={offerDraw}
        onAcceptDraw={acceptDraw}
        onBack={() => {
          resetToLobby();
          disconnect();
          connect();
        }}
      />
    );
  }

  return (
    <OnlineLobby
      client={state}
      activeTc={activeTc}
      queueWaitSec={queueWaitSec}
      onFind={handleFind}
      onPlayBot={handlePlayBot}
      onCancel={cancelQueue}
      onConnect={connect}
    />
  );
}

/** Read play-* hash for deep links from nav */
export function usePlayHashTc(): TimeControlId | null {
  const [tc, setTc] = useState<TimeControlId | null>(() => {
    if (typeof window === "undefined") return null;
    return hashToTimeControl(window.location.hash.replace("#", ""));
  });

  useEffect(() => {
    const read = () =>
      setTc(hashToTimeControl(window.location.hash.replace("#", "")));
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return tc;
}
