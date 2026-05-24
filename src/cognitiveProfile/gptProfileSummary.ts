import { chatCompletionText } from "../api/gptChat";
import { hasOpenAiApiKey } from "../api/openaiKey";
import type { CognitivePlayerProfile } from "./types";

export async function generateProfileGptSummary(
  profile: CognitivePlayerProfile
): Promise<string | undefined> {
  if (!hasOpenAiApiKey()) return undefined;

  const top = profile.identity.currentIdentity[0];
  const events = profile.timeline.slice(0, 5).map((e) => e.title).join("; ");

  const system = `You are CHIMERA's longitudinal analyst. Write 3 analytical sentences summarizing this player's chess cognitive evolution.
Tone: observant, premium, no hype, no gamification, no "great job". Reference evidence only.`;

  const user = `Identity: ${top?.label} (${top?.weight}%)
Drift: ${profile.identity.driftSummary ?? "—"}
Maturity: ${profile.maturity.headline}
Recent timeline: ${events || "building baseline"}
Improvements: ${profile.insights.biggestImprovements.map((i) => i.title).join(", ") || "—"}
Weakness cycles: ${profile.insights.biggestWeaknessCycles.map((i) => i.title).join(", ") || "—"}`;

  return (await chatCompletionText(system, user, { temperature: 0.45 })) ?? undefined;
}
