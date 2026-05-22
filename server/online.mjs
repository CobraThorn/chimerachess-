/**
 * Real-time matchmaking and rated-style pool games (bullet / blitz / rapid).
 */
import { WebSocketServer } from "ws";
import { Chess } from "chess.js";
import { getTimeControl, TIME_CONTROLS } from "./timeControls.mjs";

/** @type {Map<string, { playerId: string, name: string, ws: import('ws').WebSocket, joinedAt: number }[]>} */
const queues = new Map();

/** @type {Map<string, import('./online.mjs').OnlineGame>} */
const games = new Map();

/** @type {Map<string, { gameId: string | null, tcId: string | null, playerId: string, name: string }>} */
const clients = new Map();

let stats = { activeGames: 0, queued: 0 };

export function getOnlineStats() {
  let queued = 0;
  for (const q of queues.values()) queued += q.length;
  stats = { activeGames: games.size, queued };
  return { ...stats, pools: Object.keys(TIME_CONTROLS) };
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function uciToChessMove(uci) {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  return { from, to, promotion };
}

function nowClock(game) {
  const elapsed = Date.now() - game.turnStartedAt;
  const w =
    game.turn === "w"
      ? Math.max(0, game.clock.w - elapsed)
      : game.clock.w;
  const b =
    game.turn === "b"
      ? Math.max(0, game.clock.b - elapsed)
      : game.clock.b;
  return { w, b };
}

function applyElapsedToMover(game) {
  const elapsed = Date.now() - game.turnStartedAt;
  if (game.turn === "w") {
    game.clock.w = Math.max(0, game.clock.w - elapsed);
  } else {
    game.clock.b = Math.max(0, game.clock.b - elapsed);
  }
}

function checkTimeout(game) {
  const c = nowClock(game);
  if (c.w <= 0) return "black-win";
  if (c.b <= 0) return "white-win";
  return null;
}

function resultForWinner(winner) {
  if (winner === "w") return "white-win";
  if (winner === "b") return "black-win";
  return "draw";
}

function endGame(game, result, reason) {
  game.status = "ended";
  game.result = result;
  game.endReason = reason;
  const payload = {
    type: "game_over",
    gameId: game.id,
    result,
    reason,
    fen: game.fen,
  };
  send(game.white.ws, payload);
  send(game.black.ws, payload);
  games.delete(game.id);
  const wClient = clients.get(game.white.ws);
  const bClient = clients.get(game.black.ws);
  if (wClient) wClient.gameId = null;
  if (bClient) bClient.gameId = null;
  getOnlineStats();
}

function broadcastGame(game, msg, exceptWs = null) {
  for (const side of [game.white, game.black]) {
    if (side.ws !== exceptWs) send(side.ws, msg);
  }
}

function removeFromQueue(ws) {
  for (const [tcId, list] of queues) {
    const idx = list.findIndex((e) => e.ws === ws);
    if (idx >= 0) list.splice(idx, 1);
  }
  getOnlineStats();
}

function leaveQueue(ws) {
  removeFromQueue(ws);
  const client = clients.get(ws);
  if (client) client.tcId = null;
  send(ws, { type: "left_queue" });
}

function pairPlayers(tcId, a, b) {
  const tc = getTimeControl(tcId);
  if (!tc) return;

  const gameId = crypto.randomUUID();
  const chess = new Chess();
  const whiteFirst = Math.random() < 0.5;
  const white = whiteFirst ? a : b;
  const black = whiteFirst ? b : a;

  const game = {
    id: gameId,
    tcId,
    incrementMs: tc.incrementMs,
    fen: chess.fen(),
    turn: "w",
    status: "active",
    result: null,
    endReason: null,
    turnStartedAt: Date.now(),
    clock: { w: tc.initialMs, b: tc.initialMs },
    white: { playerId: white.playerId, name: white.name, ws: white.ws },
    black: { playerId: black.playerId, name: black.name, ws: black.ws },
    chess,
  };

  games.set(gameId, game);

  const wClient = clients.get(white.ws);
  const bClient = clients.get(black.ws);
  if (wClient) {
    wClient.gameId = gameId;
    wClient.tcId = null;
  }
  if (bClient) {
    bClient.gameId = gameId;
    bClient.tcId = null;
  }

  const base = {
    type: "matched",
    gameId,
    tc: tcId,
    tcLabel: tc.label,
    fen: game.fen,
    incrementMs: tc.incrementMs,
    clock: { ...game.clock },
    turnStartedAt: game.turnStartedAt,
  };

  send(white.ws, {
    ...base,
    color: "w",
    opponent: { id: black.playerId, name: black.name },
  });
  send(black.ws, {
    ...base,
    color: "b",
    opponent: { id: white.playerId, name: white.name },
  });

  getOnlineStats();
}

function tryMatch(tcId) {
  const q = queues.get(tcId);
  if (!q || q.length < 2) return;
  while (q.length >= 2) {
    const a = q.shift();
    const b = q.shift();
    if (a.ws.readyState === a.ws.OPEN && b.ws.readyState === b.ws.OPEN) {
      pairPlayers(tcId, a, b);
    }
  }
  getOnlineStats();
}

function joinQueue(ws, tcId, playerId, name) {
  const tc = getTimeControl(tcId);
  if (!tc) {
    send(ws, { type: "error", message: "Unknown time control" });
    return;
  }

  leaveQueue(ws);
  const client = clients.get(ws) ?? {
    gameId: null,
    tcId: null,
    playerId: "",
    name: "",
  };
  if (client.gameId) {
    send(ws, { type: "error", message: "Already in a game" });
    return;
  }

  client.playerId = playerId;
  client.name = name;
  clients.set(ws, client);

  if (!queues.has(tcId)) queues.set(tcId, []);
  const list = queues.get(tcId);
  if (list.some((e) => e.playerId === playerId)) {
    send(ws, { type: "error", message: "Already queued" });
    return;
  }

  list.push({ playerId, name, ws, joinedAt: Date.now() });
  client.tcId = tcId;

  send(ws, {
    type: "queued",
    tc: tcId,
    label: tc.label,
    tagline: tc.tagline,
    position: list.length,
  });

  tryMatch(tcId);
}

function handleMove(ws, msg) {
  const client = clients.get(ws);
  if (!client?.gameId) return;
  const game = games.get(client.gameId);
  if (!game || game.status !== "active") return;

  const color = game.white.ws === ws ? "w" : "b";
  if (game.turn !== color) {
    send(ws, { type: "error", message: "Not your turn" });
    return;
  }

  const timeout = checkTimeout(game);
  if (timeout) {
    endGame(game, timeout, "timeout");
    return;
  }

  applyElapsedToMover(game);
  const moverClock = color === "w" ? game.clock.w : game.clock.b;
  if (moverClock <= 0) {
    endGame(game, color === "w" ? "black-win" : "white-win", "timeout");
    return;
  }

  const moveInput = uciToChessMove(msg.uci);
  if (!moveInput) {
    send(ws, { type: "error", message: "Invalid move format" });
    return;
  }

  let applied;
  try {
    applied = game.chess.move(moveInput);
  } catch {
    applied = null;
  }
  if (!applied) {
    send(ws, { type: "error", message: "Illegal move" });
    return;
  }

  if (game.incrementMs > 0) {
    if (color === "w") game.clock.w += game.incrementMs;
    else game.clock.b += game.incrementMs;
  }

  game.fen = game.chess.fen();
  game.turn = game.chess.turn() === "w" ? "w" : "b";
  game.turnStartedAt = Date.now();

  const payload = {
    type: "move",
    gameId: game.id,
    uci: msg.uci,
    fen: game.fen,
    turn: game.turn,
    clock: { ...game.clock },
    turnStartedAt: game.turnStartedAt,
    san: applied.san,
  };

  send(game.white.ws, payload);
  send(game.black.ws, payload);

  if (game.chess.isCheckmate()) {
    endGame(game, resultForWinner(color), "checkmate");
    return;
  }
  if (game.chess.isStalemate() || game.chess.isDraw()) {
    endGame(game, "draw", "draw");
    return;
  }

  const afterMoveTimeout = checkTimeout(game);
  if (afterMoveTimeout) {
    endGame(game, afterMoveTimeout, "timeout");
  }
}

function handleResign(ws) {
  const client = clients.get(ws);
  if (!client?.gameId) return;
  const game = games.get(client.gameId);
  if (!game || game.status !== "active") return;
  const color = game.white.ws === ws ? "w" : "b";
  endGame(game, color === "w" ? "black-win" : "white-win", "resign");
}

function handleDrawOffer(ws) {
  const client = clients.get(ws);
  if (!client?.gameId) return;
  const game = games.get(client.gameId);
  if (!game || game.status !== "active") return;
  const other = game.white.ws === ws ? game.black.ws : game.white.ws;
  send(other, { type: "draw_offered", gameId: game.id });
}

function handleDrawAccept(ws) {
  const client = clients.get(ws);
  if (!client?.gameId) return;
  const game = games.get(client.gameId);
  if (!game || game.status !== "active") return;
  endGame(game, "draw", "draw");
}

function onMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    send(ws, { type: "error", message: "Bad JSON" });
    return;
  }

  switch (msg.type) {
    case "join":
      joinQueue(ws, msg.tc, msg.playerId, msg.name || "Guest");
      break;
    case "leave":
      leaveQueue(ws);
      break;
    case "move":
      handleMove(ws, msg);
      break;
    case "resign":
      handleResign(ws);
      break;
    case "draw_offer":
      handleDrawOffer(ws);
      break;
    case "draw_accept":
      handleDrawAccept(ws);
      break;
    case "ping":
      send(ws, { type: "pong", stats: getOnlineStats() });
      break;
    default:
      send(ws, { type: "error", message: `Unknown type: ${msg.type}` });
  }
}

function onClose(ws) {
  removeFromQueue(ws);
  const client = clients.get(ws);
  if (client?.gameId) {
    const game = games.get(client.gameId);
    if (game && game.status === "active") {
      const color = game.white.ws === ws ? "w" : "b";
      endGame(game, color === "w" ? "black-win" : "white-win", "disconnect");
      const other = game.white.ws === ws ? game.black.ws : game.white.ws;
      send(other, { type: "opponent_disconnected" });
    }
  }
  clients.delete(ws);
  getOnlineStats();
}

/**
 * @param {import('node:http').Server} httpServer
 */
export function attachOnlinePlay(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname !== "/api/chimera/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    clients.set(ws, { gameId: null, tcId: null, playerId: "", name: "" });
    send(ws, { type: "hello", stats: getOnlineStats(), pools: TIME_CONTROLS });
    ws.on("message", (data) => onMessage(ws, data));
    ws.on("close", () => onClose(ws));
  });

  setInterval(() => {
    for (const game of games.values()) {
      if (game.status !== "active") continue;
      const timeout = checkTimeout(game);
      if (timeout) endGame(game, timeout, "timeout");
    }
  }, 500);

  console.log("  Online: WS /api/chimera/ws (bullet, blitz, rapid)");
}
