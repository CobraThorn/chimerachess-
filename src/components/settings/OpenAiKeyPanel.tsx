import { useState } from "react";
import {
  getOpenAiApiKey,
  hasOpenAiApiKey,
  setOpenAiApiKey,
} from "../../api/openaiKey";

export default function OpenAiKeyPanel() {
  const [key, setKey] = useState(() => getOpenAiApiKey() ?? "");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setOpenAiApiKey(key);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mt-10 border-t border-[rgba(232,197,71,0.1)] pt-10">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-gold-glow">
        ChatGPT coach
      </h3>
      <p className="mt-2 max-w-xl font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
        Opening training uses OpenAI to explain every move with arrows and heat-map
        hints. Your key stays in this browser only (localStorage). You can also set{" "}
        <code className="text-[rgba(0,229,255,0.6)]">VITE_OPENAI_API_KEY</code> in
        .env for dev.
      </p>
      <div className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.35)]">
            OPENAI API KEY
          </span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
            className="mt-1 w-full rounded-sm border border-[rgba(255,255,255,0.1)] bg-[rgba(5,5,12,0.6)] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[rgba(0,229,255,0.4)]"
          />
        </label>
        <button
          type="button"
          onClick={save}
          className="rounded-sm border border-[rgba(232,197,71,0.35)] px-4 py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-gold-glow"
        >
          {saved ? "Saved" : "Save key"}
        </button>
      </div>
      <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.25)]">
        Status: {hasOpenAiApiKey() ? "Connected" : "Not set — local explanations only"}
      </p>
    </div>
  );
}
