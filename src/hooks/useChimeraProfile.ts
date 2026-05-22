import { useCallback, useEffect, useState } from "react";
import { loadMemory } from "../ai";
import { CHIMERA_MEMORY_EVENT, CHIMERA_STORAGE_KEY } from "../ai/types";
import type { ChimeraMemory } from "../ai";
import { getDisplayName, PROFILE_NAME_KEY } from "../components/profile/profileUtils";

export function useChimeraProfile() {
  const [memory, setMemory] = useState<ChimeraMemory>(() => loadMemory());
  const [displayName, setDisplayNameState] = useState(getDisplayName);

  const refresh = useCallback(() => {
    setMemory(loadMemory());
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHIMERA_STORAGE_KEY || e.key === PROFILE_NAME_KEY) {
        refresh();
      }
    };
    const onMemory = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHIMERA_MEMORY_EVENT, onMemory);
    const id = setInterval(refresh, 2500);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHIMERA_MEMORY_EVENT, onMemory);
      clearInterval(id);
    };
  }, [refresh]);

  return { memory, displayName, refresh };
}
