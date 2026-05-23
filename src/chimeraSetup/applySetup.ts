import { loadMemory, saveMemory } from "../ai/memory";
import {
  applyOpponentPhenotype,
  normalizePhenotype,
} from "../ai/learning/phenotype";
import { ensureLearning } from "../ai/learning/learn";
import { createInitialEvolution } from "../ai/cognition/personalityEvolution";
import type { CounterStyleId } from "../ai/learning/types";
import { refreshOpponentCognitiveIdentity } from "../ai/cognition/identity";
import { saveCustomisation } from "../customisation/storage";
import type { ChimeraUserSetup } from "./types";
import { saveChimeraSetup } from "./storage";

export function applyChimeraSetup(setup: ChimeraUserSetup): void {
  const phenotype = normalizePhenotype(setup.phenotype);
  const normalizedSetup = { ...setup, phenotype };
  saveChimeraSetup(normalizedSetup);
  saveCustomisation({
    boardThemeId: setup.boardThemeId,
    pieceSetId: setup.pieceSetId,
  });

  let memory = loadMemory();
  memory = applyOpponentPhenotype(memory, phenotype);

  const learning = ensureLearning(memory);
  const counterStyle: CounterStyleId =
    setup.preferredCounter === "auto" ? learning.counterStyle : setup.preferredCounter;

  memory = {
    ...memory,
    learning: {
      ...learning,
      phenotype,
      counterStyle,
      evolution: phenotype.personalityId
        ? createInitialEvolution(phenotype.personalityId, memory)
        : learning.evolution,
    },
    adaptation: learning.adaptationScore,
  };

  memory = refreshOpponentCognitiveIdentity(memory);
  saveMemory(memory);
}
