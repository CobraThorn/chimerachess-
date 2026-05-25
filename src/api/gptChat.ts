import { resolveApiBase } from "../config/productionApi";
import { getByokOpenAiKey } from "./openaiKey";
import { sessionHeaders } from "./session";

function chimeraOpenAiUrl(): string {
  const base = resolveApiBase();
  return base
    ? `${base}/api/chimera/openai/chat`
    : "/api/chimera/openai/chat";
}

function byokOpenAiUrl(): string {
  return import.meta.env.DEV
    ? "/api/openai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
}

async function postChat(
  body: Record<string, unknown>
): Promise<Response | null> {
  const byok = getByokOpenAiKey();
  if (byok) {
    return fetch(byokOpenAiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${byok}`,
      },
      body: JSON.stringify(body),
    });
  }

  return fetch(chimeraOpenAiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders(),
    },
    body: JSON.stringify(body),
  });
}

export async function chatCompletionJson<T>(
  system: string,
  user: string,
  options?: { temperature?: number }
): Promise<T | null> {
  const res = await postChat({
    model: "gpt-4o-mini",
    temperature: options?.temperature ?? 0.45,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  if (!res?.ok) return null;

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function chatCompletionText(
  system: string,
  user: string,
  options?: { temperature?: number }
): Promise<string | null> {
  const res = await postChat({
    model: "gpt-4o-mini",
    temperature: options?.temperature ?? 0.5,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  if (!res?.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}
