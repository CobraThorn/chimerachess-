import { getOpenAiApiKey } from "./openaiKey";

export function openAiChatUrl(): string {
  return import.meta.env.DEV
    ? "/api/openai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
}

export async function chatCompletionJson<T>(
  system: string,
  user: string,
  options?: { temperature?: number; apiKey?: string }
): Promise<T | null> {
  const apiKey = options?.apiKey ?? getOpenAiApiKey();
  if (!apiKey) return null;

  const res = await fetch(openAiChatUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: options?.temperature ?? 0.45,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return null;

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
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return null;

  const res = await fetch(openAiChatUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: options?.temperature ?? 0.5,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}
