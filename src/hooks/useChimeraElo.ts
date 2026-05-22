import { useEffect, useState } from "react";
import { loadMemory } from "../ai";
import {
  CHIMERA_MEMORY_EVENT,
  CHIMERA_STORAGE_KEY,
  INITIAL_CHIMERA_ELO,
  INITIAL_USER_ELO,
} from "../ai/types";

export function useChimeraElo() {
  const [userElo, setUserElo] = useState(INITIAL_USER_ELO);
  const [chimeraElo, setChimeraElo] = useState(INITIAL_CHIMERA_ELO);

  const refresh = () => {
    const m = loadMemory();
    setUserElo(m.userStyle?.elo ?? INITIAL_USER_ELO);
    setChimeraElo(m.chimeraElo ?? INITIAL_CHIMERA_ELO);
  };

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHIMERA_STORAGE_KEY) refresh();
    };
    const onMemory = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHIMERA_MEMORY_EVENT, onMemory);
    const id = setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHIMERA_MEMORY_EVENT, onMemory);
      clearInterval(id);
    };
  }, []);

  return { userElo, chimeraElo, refresh };
}
