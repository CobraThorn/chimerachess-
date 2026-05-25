import { useEffect, useState } from "react";
import {
  getByokOpenAiKey,
  hasOpenAiApiKey,
  probeServerOpenAiCoach,
  setOpenAiApiKey,
  usesServerOpenAiCoach,
} from "../../api/openaiKey";

export default function OpenAiKeyPanel() {
  const [key, setKey] = useState(() => getByokOpenAiKey() ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void probeServerOpenAiCoach();
  }, []);

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
        Optional bring-your-own-key. When the host sets{" "}
        <span className="font-mono text-[rgba(255,255,255,0.55)]">CHIMERA_OPENAI_API_KEY</span>
        , coach features use the server proxy while you are signed in. A personal key
        stays on this device only.
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
        Status:{" "}
        {usesServerOpenAiCoach()
          ? "Server coach enabled (signed-in sessions)"
          : hasOpenAiApiKey()
            ? "BYOK connected — GPT coach active"
            : "Not set — local coach notes only"}
      </p>
    </div>
  );
}
