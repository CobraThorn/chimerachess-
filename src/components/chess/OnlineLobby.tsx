import { motion } from "framer-motion";
import type { OnlineClientState } from "../../online/useOnlineClient";
import {
  TIME_CONTROLS,
  formatClock,
  type TimeControlId,
} from "../../online/timeControls";

interface OnlineLobbyProps {
  client: OnlineClientState;
  activeTc: TimeControlId | null;
  onFind: (tc: TimeControlId) => void;
  onCancel: () => void;
  onConnect: () => void;
}

export default function OnlineLobby({
  client,
  activeTc,
  onFind,
  onCancel,
  onConnect,
}: OnlineLobbyProps) {
  const isQueued = client.phase === "queued";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
          Online pools
        </p>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
          Match with another player on the same clock. Open two tabs to test locally.
        </p>
        {client.serverStats && (
          <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.3)]">
            {client.serverStats.activeGames} live · {client.serverStats.queued} in queue
          </p>
        )}
      </div>

      {!client.connected && client.phase !== "connecting" && (
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={onConnect}
            className="nav-link rounded-sm px-6 py-2 font-[family-name:var(--font-hud)] text-[10px] tracking-[0.2em]"
          >
            Connect to server
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {TIME_CONTROLS.map((tc) => {
          const selected = activeTc === tc.id;
          const queuedHere = isQueued && selected;
          return (
            <motion.button
              key={tc.id}
              type="button"
              disabled={isQueued && !selected}
              onClick={() => (queuedHere ? onCancel() : onFind(tc.id))}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`glass-panel rounded-sm p-5 text-left transition-all ${
                selected
                  ? "border-[rgba(232,197,71,0.4)] shadow-[0_0_28px_rgba(232,197,71,0.12)]"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              <span className="font-[family-name:var(--font-display)] text-xl text-gold-glow">
                {tc.label}
              </span>
              <span className="mt-1 block font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-[rgba(0,229,255,0.6)]">
                {tc.tagline}
              </span>
              <span className="mt-3 block font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
                {formatClock(tc.initialMs)}
                {tc.incrementMs > 0
                  ? ` + ${tc.incrementMs / 1000}s`
                  : " · no increment"}
              </span>
              <span className="mt-4 block font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(232,197,71,0.55)] uppercase">
                {queuedHere
                  ? `Searching (#${client.queuePosition}) — cancel`
                  : selected && isQueued
                    ? "Searching…"
                    : "Find game"}
              </span>
            </motion.button>
          );
        })}
      </div>

      {client.phase === "connecting" && (
        <p className="mt-6 text-center font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.4)]">
          Connecting to matchmaking…
        </p>
      )}

      {client.error && (
        <p className="mt-6 text-center font-[family-name:var(--font-body)] text-sm text-[rgba(255,120,120,0.9)]">
          {client.error}
          {!client.connected && (
            <span className="block mt-2 text-[rgba(255,255,255,0.35)]">
              Run <code className="text-[rgba(0,229,255,0.7)]">npm run dev:full</code> so the
              API and WebSocket are up.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
