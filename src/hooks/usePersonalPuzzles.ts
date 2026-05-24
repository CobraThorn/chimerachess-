import { useCallback, useEffect, useState } from "react";
import type { ChimeraMemory } from "../ai/types";
import { loadMemory, saveMemory } from "../ai/memory";
import { CHIMERA_MEMORY_EVENT } from "../ai/types";
import { getIntelligenceArchive, attachIntelligenceToMemory } from "../intelligence/storage";
import {
  getPersonalPuzzleDeck,
  rebuildPersonalPuzzleDeck,
  attachPersonalPuzzleDeck,
} from "../personalPuzzles/engine";
import type { PersonalPuzzleDeck } from "../personalPuzzles/types";

export function usePersonalPuzzles(memory?: ChimeraMemory) {
  const [deck, setDeck] = useState<PersonalPuzzleDeck>(() =>
    getPersonalPuzzleDeck(memory ?? loadMemory())
  );

  const sync = useCallback((mem: ChimeraMemory) => {
    setDeck(getPersonalPuzzleDeck(mem));
  }, []);

  useEffect(() => {
    if (memory) sync(memory);
  }, [memory, sync]);

  useEffect(() => {
    const onUpdate = () => sync(loadMemory());
    window.addEventListener(CHIMERA_MEMORY_EVENT, onUpdate);
    return () => window.removeEventListener(CHIMERA_MEMORY_EVENT, onUpdate);
  }, [sync]);

  const refreshDeck = useCallback(() => {
    const mem = loadMemory();
    const archive = getIntelligenceArchive(mem);
    const nextDeck = rebuildPersonalPuzzleDeck(mem);
    const nextMem = attachIntelligenceToMemory(
      mem,
      attachPersonalPuzzleDeck(archive, nextDeck)
    );
    saveMemory(nextMem);
    window.dispatchEvent(new Event(CHIMERA_MEMORY_EVENT));
    setDeck(nextDeck);
  }, []);

  return { deck, refreshDeck };
}
