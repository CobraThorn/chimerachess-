import { useEffect, useState } from "react";
import { loadMemory } from "../ai";
import { ensureCrsState } from "../crs/profile";
import {
  CHIMERA_MEMORY_EVENT,
  CHIMERA_STORAGE_KEY,
  INITIAL_CHIMERA_ELO,
} from "../ai/types";

export function useChimeraElo() {
  const [userCrs, setUserCrs] = useState(100);
  const [chimeraElo, setChimeraElo] = useState(INITIAL_CHIMERA_ELO);

  const refresh = () => {
    const m = loadMemory();
    const crs = ensureCrsState(m);
    setUserCrs(crs.chimeraRating);
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

  return { userCrs, userElo: userCrs, chimeraElo, refresh };
}