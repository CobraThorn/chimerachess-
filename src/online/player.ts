import { loadAccount } from "../account/storage";

const PLAYER_ID_KEY = "chimera-online-player-id";

export function getOnlinePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getOnlineDisplayName(): string {
  const account = loadAccount();
  if (account?.displayName?.trim()) return account.displayName.trim();
  return `Guest-${getOnlinePlayerId().slice(0, 6)}`;
}
