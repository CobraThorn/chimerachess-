const ALLOWED_MODELS = new Set(["gpt-4o-mini", "gpt-4o"]);
const MAX_MESSAGES = 24;
const MAX_CONTENT_LEN = 12_000;

/**
 * @param {Record<string, unknown>} body
 */
export function sanitizeChatBody(body) {
  const model =
    typeof body.model === "string" && ALLOWED_MODELS.has(body.model)
      ? body.model
      : "gpt-4o-mini";
  const temperature =
    typeof body.temperature === "number"
      ? Math.min(1, Math.max(0, body.temperature))
      : 0.45;
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const trimmed = messages.slice(0, MAX_MESSAGES).map((m) => {
    const role =
      m?.role === "system" || m?.role === "user" || m?.role === "assistant"
        ? m.role
        : "user";
    const content = String(m?.content ?? "").slice(0, MAX_CONTENT_LEN);
    return { role, content };
  });
  if (!trimmed.length) {
    throw new Error("messages required");
  }
  const payload = {
    model,
    temperature,
    messages: trimmed,
  };
  if (body.response_format?.type === "json_object") {
    payload.response_format = { type: "json_object" };
  }
  return payload;
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function forwardOpenAiChat(payload) {
  const apiKey = process.env.CHIMERA_OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error("OpenAI not configured on server");
    err.status = 503;
    throw err;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text.slice(0, 500) };
  }

  return { status: res.status, data };
}
