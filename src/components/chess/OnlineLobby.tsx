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
  queueWaitSec: number;
  onFind: (tc: TimeControlId) => void;
  onPlayBot: (tc: TimeControlId) => void;
  onCancel: () => void;
  onConnect: () => void;
}

export default function OnlineLobby({
  client,
  activeTc,
  queueWaitSec,
  onFind,
  onPlayBot,
  onCancel,
  onConnect,
}: OnlineLobbyProps) {
  const isQueued = client.phase === "queued";
  const showBotNudge = isQueued && queueWaitSec >= 6;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
          Online pools
        </p>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
          Match a human on the same time control — or jump straight into a rated
          clock game vs CHIMERA while the pool fills.
        </p>
        {client.serverStats && (
          <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.3)]">
            {client.serverStats.activeGames} live · {client.serverStats.queued} in queue
          </p>
        )}
      </div>

      {!client.connected && client.phase !== "connecting" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex justify-center"
        >
          <button
            type="button"
            onClick={onConnect}
            className="nav-link rounded-sm px-6 py-2 font-[family-name:var(--font-hud)] text-[10px] tracking-[0.2em]"
          >
            Connect
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-sm border border-[rgba(232,197,71,0.25)] bg-[rgba(232,197,71,0.06)] px-4 py-3 text-center"
      >
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-gold-glow uppercase">
          Instant rated
        </p>
        <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.45)]">
          No one online? Play CHIMERA on bullet, blitz, or rapid clocks — CRS still updates.
        </p>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-3">
        {TIME_CONTROLS.map((tc) => {
          const selected = activeTc === tc.id;
          const queuedHere = isQueued && selected;
          return (
            <motion.div
              key={tc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-panel rounded-sm p-5 transition-all ${
                selected
                  ? "border-[rgba(232,197,71,0.4)] shadow-[0_0_28px_rgba(232,197,71,0.12)]"
                  : "opacity-90"
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
              <div className="mt-4 flex flex-col gap-2">
                <motion.button
                  type="button"
                  disabled={isQueued && !selected}
                  onClick={() => (queuedHere ? onCancel() : onFind(tc.id))}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-sm border border-[rgba(255,255,255,0.12)] px-3 py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.7)] uppercase hover:border-[rgba(232,197,71,0.35)]"
                >
                  {queuedHere
                    ? `Searching (${queueWaitSec}s) — cancel`
                    : "Find human"}
                </motion.button>
                <motion.button
                  type="button"
                  disabled={isQueued}
                  onClick={() => onPlayBot(tc.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-sm border border-[rgba(232,197,71,0.45)] bg-[rgba(232,197,71,0.1)] px-3 py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[#ffe566] uppercase hover:bg-[rgba(232,197,71,0.16)]"
                >
                  vs CHIMERA now
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {showBotNudge && activeTc && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-sm border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.06)] px-5 py-4 text-center"
        >
          <p className="font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.55)]">
            Still waiting after {queueWaitSec}s — the pool is quiet.
          </p>
          <button
            type="button"
            onClick={() => {
              onCancel();
              onPlayBot(activeTc);
            }}
            className="mt-3 rounded-sm border border-[rgba(232,197,71,0.5)] px-5 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[#ffe566]"
          >
            Play {activeTc} vs CHIMERA instead
          </button>
        </motion.div>
      )}

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
              Tap Connect, or use vs CHIMERA now — no queue needed.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
