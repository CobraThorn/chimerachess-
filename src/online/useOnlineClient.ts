import { useCallback, useEffect, useRef, useState } from "react";
import { logDataEvent } from "../account/events";
import { getOnlineDisplayName, getOnlinePlayerId } from "./player";
import type { GameResult, OnlineMatchInfo, OnlinePhase } from "./types";
import type { TimeControlId } from "./timeControls";
import { onlineWsUrl } from "./wsUrl";

export interface OnlineClientState {
  phase: OnlinePhase;
  connected: boolean;
  error: string | null;
  queueLabel: string | null;
  queuePosition: number;
  match: OnlineMatchInfo | null;
  result: GameResult | null;
  endReason: string | null;
  drawOffered: boolean;
  serverStats: { activeGames: number; queued: number } | null;
}

const INITIAL: OnlineClientState = {
  phase: "idle",
  connected: false,
  error: null,
  queueLabel: null,
  queuePosition: 0,
  match: null,
  result: null,
  endReason: null,
  drawOffered: false,
  serverStats: null,
};

export function useOnlineClient() {
  const [state, setState] = useState<OnlineClientState>(INITIAL);
  const wsRef = useRef<WebSocket | null>(null);
  const matchRef = useRef<OnlineMatchInfo | null>(null);

  const patch = useCallback((p: Partial<OnlineClientState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const connect = useCallback(() => {
    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    patch({ phase: "connecting", error: null });
    const ws = new WebSocket(onlineWsUrl());
    wsRef.current = ws;

    ws.onopen = () => patch({ connected: true, phase: "idle" });

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }

      switch (msg.type) {
        case "hello":
          patch({
            serverStats: msg.stats as OnlineClientState["serverStats"],
          });
          break;
        case "queued":
          patch({
            phase: "queued",
            queueLabel: String(msg.label ?? ""),
            queuePosition: Number(msg.position ?? 0),
            error: null,
          });
          break;
        case "left_queue":
          patch({
            phase: "idle",
            queueLabel: null,
            queuePosition: 0,
          });
          break;
        case "matched": {
          const startedAt = Number(
            msg.startedAt ?? msg.turnStartedAt ?? Date.now()
          );
          const match: OnlineMatchInfo = {
            gameId: String(msg.gameId),
            tc: msg.tc as TimeControlId,
            tcLabel: String(msg.tcLabel ?? msg.tc),
            color: msg.color as "w" | "b",
            opponent: msg.opponent as OnlineMatchInfo["opponent"],
            fen: String(msg.fen),
            incrementMs: Number(msg.incrementMs ?? 0),
            clock: msg.clock as OnlineMatchInfo["clock"],
            startedAt,
            turnStartedAt: Number(msg.turnStartedAt ?? startedAt),
            moveHistory: [],
          };
          matchRef.current = match;
          patch({
            phase: "playing",
            match,
            result: null,
            endReason: null,
            drawOffered: false,
            queueLabel: null,
          });
          logDataEvent("online_match_start", {
            tc: match.tc,
            color: match.color,
          });
          break;
        }
        case "move": {
          if (!matchRef.current || msg.gameId !== matchRef.current.gameId) break;
          const turn = String(msg.turn ?? "w") as "w" | "b";
          const mover: "w" | "b" = turn === "w" ? "b" : "w";
          const by =
            mover === matchRef.current.color ? "user" : "opponent";
          const ply = matchRef.current.moveHistory.length + 1;
          const uci = String(msg.uci ?? "");
          if (uci) {
            matchRef.current.moveHistory.push({
              ply,
              uci,
              san: msg.san != null ? String(msg.san) : undefined,
              fen: String(msg.fen),
              by,
            });
          }
          matchRef.current = {
            ...matchRef.current,
            fen: String(msg.fen),
            clock: msg.clock as OnlineMatchInfo["clock"],
            turnStartedAt: Number(msg.turnStartedAt ?? Date.now()),
          };
          patch({ match: { ...matchRef.current }, error: null });
          break;
        }
        case "game_over":
          patch({
            phase: "ended",
            result: msg.result as GameResult,
            endReason: String(msg.reason ?? "game_over"),
          });
          logDataEvent("online_match_end", {
            result: String(msg.result ?? ""),
            reason: String(msg.reason ?? ""),
          });
          break;
        case "draw_offered":
          patch({ drawOffered: true });
          break;
        case "opponent_disconnected":
          patch({
            error: "Opponent disconnected — you win.",
            phase: "ended",
            result: matchRef.current?.color === "w" ? "white-win" : "black-win",
            endReason: "disconnect",
          });
          break;
        case "error":
          patch({ error: String(msg.message ?? "Error") });
          break;
        case "pong":
          patch({
            serverStats: msg.stats as OnlineClientState["serverStats"],
          });
          break;
        default:
          break;
      }
    };

    ws.onerror = () => patch({ error: "Connection failed", connected: false });
    ws.onclose = () => {
      const m = matchRef.current;
      setState((s) => {
        if (m && s.phase === "playing") {
          return {
            ...s,
            connected: false,
            phase: "ended",
            result: m.color === "w" ? "black-win" : "white-win",
            endReason: "disconnect",
            error: "Connection lost — game ended.",
          };
        }
        return { ...s, connected: false };
      });
      wsRef.current = null;
    };
  }, [patch]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    matchRef.current = null;
    setState(INITIAL);
  }, []);

  const findGame = useCallback((tc: TimeControlId) => {
    const sendJoin = () => {
      wsRef.current?.send(
        JSON.stringify({
          type: "join",
          tc,
          playerId: getOnlinePlayerId(),
          name: getOnlineDisplayName(),
        })
      );
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendJoin();
      return;
    }

    connect();
    const ws = wsRef.current;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) sendJoin();
    else ws.addEventListener("open", () => sendJoin(), { once: true });
  }, [connect]);

  const cancelQueue = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "leave" }));
    patch({ phase: "idle", queueLabel: null, queuePosition: 0 });
  }, [patch]);

  const sendMove = useCallback((uci: string) => {
    const m = matchRef.current;
    if (!m) return;
    wsRef.current?.send(
      JSON.stringify({ type: "move", gameId: m.gameId, uci })
    );
  }, []);

  const resign = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "resign" }));
  }, []);

  const offerDraw = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "draw_offer" }));
  }, []);

  const acceptDraw = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "draw_accept" }));
    patch({ drawOffered: false });
  }, [patch]);

  const resetToLobby = useCallback(() => {
    matchRef.current = null;
    patch({
      phase: "idle",
      match: null,
      result: null,
      endReason: null,
      drawOffered: false,
      error: null,
    });
  }, [patch]);

  const clearTransientError = useCallback(() => {
    setState((s) =>
      s.phase === "playing" ? { ...s, error: null } : s
    );
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
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
    clearTransientError,
  };
}
