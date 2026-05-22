import { useEffect, useRef, useState } from "react";
import { hashToTimeControl, type TimeControlId } from "../../online/timeControls";
import { useOnlineClient } from "../../online/useOnlineClient";
import OnlineLobby from "./OnlineLobby";
import OnlineMatch from "./OnlineMatch";

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
  const autoQueuedRef = useRef(false);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!initialTc || autoQueuedRef.current) return;
    if (state.connected && state.phase === "idle") {
      findGame(initialTc);
      setActiveTc(initialTc);
      autoQueuedRef.current = true;
    }
  }, [initialTc, state.connected, state.phase, findGame]);

  const handleFind = (tc: TimeControlId) => {
    setActiveTc(tc);
    findGame(tc);
  };

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
      onFind={handleFind}
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
