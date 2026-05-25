import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPersonaPlayStyle,
  getChimeraMove,
  getMirrorArchetype,
  loadMemory,
  mirrorMemoryForColor,
  profileToRadar,
  recordMirrorResult,
  refreshMirrorCognitiveIdentities,
  saveMemory,
  updateStyleFromMove,
} from "../../ai";
import type { ChimeraMemory } from "../../ai";
import { CHIMERA_MEMORY_EVENT } from "../../ai/types";
import ChimeraEntityArchetype from "./ChimeraEntityArchetype";
import ChimeraMemoryRadar from "./ChimeraMemoryRadar";
import ChessBoardGrid from "./ChessBoardGrid";
import {
  createInitialState,
  formatMove,
  getAllLegalMoves,
  getGameStatus,
  makeMove,
  moveToUci,
  resolveBotMove,
} from "../../chess";
import { waitAtLeast } from "../../chess/movePacing";
import type { GameState, Move } from "../../chess";
import { createStockfishEngine, type StockfishEngine } from "../../engine/stockfish";

const SPEEDS = [
  { label: "Slow", ms: 1200 },
  { label: "Normal", ms: 650 },
  { label: "Fast", ms: 320 },
];

export default function ChimeraVsChimera() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [memory, setMemory] = useState<ChimeraMemory>(() => loadMemory());
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [sfReady, setSfReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [moveCount, setMoveCount] = useState(0);
  const [statusText, setStatusText] = useState("Press Play — White CHIMERA vs Black CHIMERA");

  const engineRef = useRef<StockfishEngine | null>(null);
  const stateRef = useRef(state);
  const playingRef = useRef(false);
  const memoryRef = useRef(memory);
  memoryRef.current = memory;

  stateRef.current = state;
  playingRef.current = playing;

  useEffect(() => {
    const onMemoryUpdate = () => setMemory(loadMemory());
    window.addEventListener(CHIMERA_MEMORY_EVENT, onMemoryUpdate);
    return () =>
      window.removeEventListener(CHIMERA_MEMORY_EVENT, onMemoryUpdate);
  }, []);

  useEffect(() => {
    const engine = createStockfishEngine();
    engineRef.current = engine;
    const t = setInterval(() => {
      if (engine.ready) {
        setSfReady(true);
        clearInterval(t);
      }
    }, 100);
    return () => {
      clearInterval(t);
      engine.quit();
      engineRef.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    playingRef.current = false;
    setThinking(false);
    const init = createInitialState();
    setState(init);
    stateRef.current = init;
    setLastMove(null);
    setMoveCount(0);
    setStatusText("Press Play — White CHIMERA vs Black CHIMERA");
  }, []);

  const runOneMove = useCallback(async (): Promise<boolean> => {
    const engine = engineRef.current;
    const current = stateRef.current;
    if (!engine?.ready) return false;

    const st = getGameStatus(current);
    if (st.type === "checkmate") {
      const winner = st.winner;
      setStatusText(
        winner === "w"
          ? "White CHIMERA wins"
          : "Black CHIMERA wins"
      );
      setMemory((prev) => {
        const next = recordMirrorResult(
          prev,
          winner === "w" ? "w" : "b"
        );
        saveMemory(next);
        return next;
      });
      return false;
    }
    if (st.type === "stalemate" || st.type === "draw") {
      setStatusText("Draw — mirror duel logged");
      setMemory((prev) => {
        const next = recordMirrorResult(prev, "draw");
        saveMemory(next);
        return next;
      });
      return false;
    }

    const side = current.turn;
    const mem = memoryRef.current;
    const sideMemory = mirrorMemoryForColor(mem, side);
    const archetype = getMirrorArchetype(mem, side);
    setThinking(true);
    const thinkStart = Date.now();
    setStatusText(
      `${side === "w" ? "White" : "Black"} CHIMERA thinking…`
    );

    try {
      const uci = await getChimeraMove(engine, current, side, sideMemory, {
        mirror: true,
        archetype,
      });
      let move = uci ? resolveBotMove(current, uci) : null;
      if (!move) {
        const legal = getAllLegalMoves(current);
        if (!legal.length) return false;
        const fallback = moveToUci(
          legal[Math.floor(Math.random() * legal.length)]!
        );
        move = resolveBotMove(current, fallback);
      }
      if (!move) return false;

      await waitAtLeast(thinkStart, 280);

      const next = makeMove(current, move);
      if (!next) return false;

      stateRef.current = next;
      setState(next);
      setLastMove(move);
      setMoveCount((c) => c + 1);
      setStatusText(
        `${side === "w" ? "White" : "Black"}: ${formatMove(current, move)}`
      );

      setMemory((prev) => {
        const c1 = prev.chimera1 ?? createPersonaPlayStyle("mirror-white");
        const c2 = prev.chimera2 ?? createPersonaPlayStyle("mirror-black");
        const withProfile =
          side === "w"
            ? { ...prev, chimera1: updateStyleFromMove(c1, current, move) }
            : { ...prev, chimera2: updateStyleFromMove(c2, current, move) };
        const updated = refreshMirrorCognitiveIdentities(withProfile);
        saveMemory(updated);
        return updated;
      });

      return true;
    } finally {
      setThinking(false);
    }
  }, []);

  useEffect(() => {
    if (!playing || !sfReady) return;

    let cancelled = false;

    const loop = async () => {
      while (playingRef.current && !cancelled) {
        const cont = await runOneMove();
        if (!cont || !playingRef.current) {
          setPlaying(false);
          playingRef.current = false;
          if (!cont) {
            setStatusText((prev) =>
              /wins|Draw/i.test(prev)
                ? prev
                : "Mirror duel stopped — engine could not continue."
            );
          }
          break;
        }
        await new Promise((r) =>
          setTimeout(r, SPEEDS[speedIdx]?.ms ?? 650)
        );
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [playing, sfReady, speedIdx, runOneMove]);

  const c1 = memory.chimera1 ?? createPersonaPlayStyle("mirror-white");
  const c2 = memory.chimera2 ?? createPersonaPlayStyle("mirror-black");

  return (
    <div className="grid w-full max-w-6xl grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,200px)_1fr_minmax(0,200px)] lg:gap-4">
      <aside className="glass-panel order-2 rounded-sm p-4 lg:order-1 lg:sticky lg:top-28">
        <ChimeraMemoryRadar
          title="CHIMERA I"
          elo={c1.elo}
          axes={profileToRadar(c1)}
          accent="gold"
          size="sm"
          subtitle="White · play style"
        />
        <ChimeraEntityArchetype
          entityName="CHIMERA I"
          entityId="mirror-white"
          profile={c1}
          identity={memory.chimera1Identity}
          accent="gold"
        />
      </aside>

      <div className="order-1 flex flex-col items-center gap-6 lg:order-2">
        <div className="flex w-full min-w-0 max-w-[min(100%,32rem)] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.25em] text-gold-glow uppercase">
              CHIMERA vs CHIMERA
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
              {statusText}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!sfReady || thinking}
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                  playingRef.current = false;
                } else {
                  const st = getGameStatus(stateRef.current);
                  if (
                    st.type === "checkmate" ||
                    st.type === "stalemate" ||
                    st.type === "draw"
                  ) {
                    reset();
                  }
                  setPlaying(true);
                  playingRef.current = true;
                }
              }}
              className="btn-cta rounded-sm border border-[rgba(232,197,71,0.45)] px-4 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[#ffe566]"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="nav-link rounded-sm px-3 py-1.5 text-[9px]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSpeedIdx(i)}
              className={`rounded-sm px-3 py-1 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] ${
                speedIdx === i
                  ? "border border-[rgba(232,197,71,0.5)] text-gold-glow"
                  : "text-[rgba(255,255,255,0.35)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 flex justify-between px-1 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em]">
            <span className="text-[rgba(255,255,255,0.5)]">♔ White CHIMERA</span>
            <span className="text-[rgba(255,255,255,0.35)]">{moveCount} plies</span>
            <span className="text-[rgba(255,255,255,0.5)]">Black CHIMERA ♚</span>
          </div>
          <ChessBoardGrid
            state={state}
            lastMove={lastMove}
            disabled
            thinkingColor={thinking ? state.turn : null}
            showCorners={false}
          />
        </div>
      </div>

      <aside className="glass-panel order-3 rounded-sm p-4 lg:sticky lg:top-28">
        <ChimeraMemoryRadar
          title="CHIMERA II"
          elo={c2.elo}
          axes={profileToRadar(c2)}
          accent="cyan"
          size="sm"
          subtitle="Black · play style"
        />
        <ChimeraEntityArchetype
          entityName="CHIMERA II"
          entityId="mirror-black"
          profile={c2}
          identity={memory.chimera2Identity}
          accent="cyan"
        />
        {!sfReady && (
          <p className="mt-4 text-center text-[10px] text-[rgba(255,255,255,0.25)]">
            Preparing engine…
          </p>
        )}
      </aside>
    </div>
  );
}
