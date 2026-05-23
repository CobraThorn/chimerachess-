import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { rollRandomPhenotype, phenotypeDisplayName } from "../../ai/learning/phenotype";
import type { CounterStyleId } from "../../ai/learning/types";
import type { ChimeraPhenotype } from "../../ai/learning/types";
import type { PersonalityTypeDef } from "../../ai/cognition/personality400";
import { counterStyleLabel } from "../../ai/learning/apply";
import { markChimeraSetupComplete, loadAccount } from "../../account/storage";
import { logDataEvent } from "../../account/events";
import { uploadUserBackup } from "../../api/saveBackup";
import { scheduleSync } from "../../api/chimeraBackend";
import { applyChimeraSetup } from "../../chimeraSetup/applySetup";
import { persistBackupAfterSetup } from "../../chimeraSetup/backup";
import { CHIMERA_SETUP_EVENT } from "../../chimeraSetup";
import type {
  ChimeraAccentId,
  ChimeraCoachingTone,
  ChimeraUserSetup,
} from "../../chimeraSetup/types";
import { BOARD_THEMES, PIECE_SETS } from "../../customisation/presets";
import { useCustomisation } from "../../customisation";
import ChimeraPersonalityPicker from "./ChimeraPersonalityPicker";

const COUNTERS: { id: CounterStyleId | "auto"; label: string }[] = [
  { id: "auto", label: "Auto (adapts every 3 games)" },
  { id: "solid", label: "Solid counter" },
  { id: "tactical", label: "Tactical trap" },
  { id: "squeeze", label: "Positional squeeze" },
  { id: "chaotic", label: "Chaotic mix" },
];

const TONES: { id: ChimeraCoachingTone; label: string }[] = [
  { id: "calm", label: "Calm coach" },
  { id: "sharp", label: "Sharp analyst" },
  { id: "chaotic", label: "Chaotic rival" },
];

const ACCENTS: { id: ChimeraAccentId; color: string }[] = [
  { id: "gold", color: "rgba(232,197,71,0.9)" },
  { id: "cyan", color: "rgba(0,229,255,0.9)" },
  { id: "crimson", color: "rgba(255,100,100,0.9)" },
  { id: "violet", color: "rgba(160,120,255,0.9)" },
  { id: "emerald", color: "rgba(120,200,140,0.9)" },
];

interface ChimeraCustomisePageProps {
  onComplete: () => void;
}

export default function ChimeraCustomisePage({ onComplete }: ChimeraCustomisePageProps) {
  const { setBoardTheme, setPieceSet } = useCustomisation();
  const [step, setStep] = useState(0);
  const [codename, setCodename] = useState("CHIMERA");
  const [phenotype, setPhenotype] = useState<ChimeraPhenotype>(() => rollRandomPhenotype());
  const [personalityDef, setPersonalityDef] = useState<PersonalityTypeDef | null>(null);
  const [preferredCounter, setPreferredCounter] = useState<CounterStyleId | "auto">("auto");
  const [coachingTone, setCoachingTone] = useState<ChimeraCoachingTone>("sharp");
  const [accent, setAccent] = useState<ChimeraAccentId>("gold");
  const [boardThemeId, setBoardThemeId] = useState("chimera");
  const [pieceSetId, setPieceSetId] = useState("classic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phenotypeLabel = useMemo(
    () => phenotypeDisplayName(phenotype),
    [phenotype]
  );

  const finish = async () => {
    const account = loadAccount();
    if (!account) {
      setError("Sign in first to save your CHIMERA.");
      return;
    }
    setBusy(true);
    setError(null);

    const setup: ChimeraUserSetup = {
      version: 1,
      codename: codename.trim() || "CHIMERA",
      phenotype,
      preferredCounter,
      coachingTone,
      accent,
      boardThemeId,
      pieceSetId,
      completedAt: Date.now(),
    };

    applyChimeraSetup(setup);
    setBoardTheme(boardThemeId);
    setPieceSet(pieceSetId);

    const bundle = persistBackupAfterSetup(account.id, setup, {
      boardThemeId,
      pieceSetId,
    });

    const cloud = await uploadUserBackup(account.id, bundle, account);
    markChimeraSetupComplete();
    scheduleSync(400);
    logDataEvent("page_view", { page: "chimera_setup_complete" });
    window.dispatchEvent(new Event(CHIMERA_SETUP_EVENT));

    setBusy(false);
    if (!cloud.ok) {
      setError(
        "CHIMERA saved on this device. Cloud backup will retry when you're online."
      );
      setTimeout(onComplete, 1200);
      return;
    }
    onComplete();
  };

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[rgba(4,4,8,0.96)] p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel relative w-full max-w-2xl rounded-sm p-6 md:p-10"
      >
        <span className="hud-corner hud-corner--tl" />
        <span className="hud-corner hud-corner--tr" />
        <span className="hud-corner hud-corner--bl" />
        <span className="hud-corner hud-corner--br" />

        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.4em] text-[rgba(0,229,255,0.55)] uppercase">
          Identity protocol
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-gold-glow md:text-3xl">
          Customise your CHIMERA
        </h1>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
          Your choices are saved to the cloud with your account — same CHIMERA on
          any device after sign-in.
        </p>

        <div className="mt-4 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[rgba(0,229,255,0.55)]" : "bg-[rgba(255,255,255,0.08)]"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="mt-8"
            >
              <label className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(232,197,71,0.6)] uppercase">
                Your CHIMERA callsign
              </label>
              <input
                value={codename}
                onChange={(e) => setCodename(e.target.value.slice(0, 24))}
                className="mt-2 w-full rounded-sm border border-[rgba(232,197,71,0.2)] bg-[rgba(0,0,0,0.35)] px-4 py-3 font-[family-name:var(--font-display)] text-lg text-white outline-none focus:border-[rgba(0,229,255,0.4)]"
                placeholder="CHIMERA"
              />
              <p className="mt-3 text-[11px] text-[rgba(255,255,255,0.35)]">
                Next: choose from 400 personality types (16 cores × 25 facets).
              </p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="mt-8"
            >
              <ChimeraPersonalityPicker
                value={phenotype}
                onChange={(p, def) => {
                  setPhenotype(p);
                  setPersonalityDef(def);
                }}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="mt-8 space-y-6"
            >
              <div>
                <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(0,229,255,0.5)] uppercase">
                  Learning style
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COUNTERS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPreferredCounter(c.id)}
                      className={`rounded-sm border px-2 py-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.08em] ${
                        preferredCounter === c.id
                          ? "border-[rgba(0,229,255,0.45)] text-[rgba(0,229,255,0.9)]"
                          : "border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.45)]"
                      }`}
                    >
                      {c.id === "auto" ? c.label : counterStyleLabel(c.id)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(0,229,255,0.5)] uppercase">
                  Coach voice
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCoachingTone(t.id)}
                      className={`rounded-sm border px-3 py-1.5 text-[10px] ${
                        coachingTone === t.id
                          ? "border-[rgba(232,197,71,0.4)] text-gold-glow"
                          : "border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.45)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(0,229,255,0.5)] uppercase">
                  HUD accent
                </p>
                <div className="mt-2 flex gap-3">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccent(a.id)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        accent === a.id
                          ? "border-white scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: a.color }}
                      aria-label={a.id}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="mt-8"
            >
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(0,229,255,0.5)] uppercase">
                Arena look
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] text-[rgba(255,255,255,0.4)]">Board</p>
                  <select
                    value={boardThemeId}
                    onChange={(e) => setBoardThemeId(e.target.value)}
                    className="w-full rounded-sm border border-[rgba(255,255,255,0.1)] bg-black/40 px-3 py-2 text-sm text-white"
                  >
                    {BOARD_THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-2 text-[10px] text-[rgba(255,255,255,0.4)]">Pieces</p>
                  <select
                    value={pieceSetId}
                    onChange={(e) => setPieceSetId(e.target.value)}
                    className="w-full rounded-sm border border-[rgba(255,255,255,0.1)] bg-black/40 px-3 py-2 text-sm text-white"
                  >
                    {PIECE_SETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 rounded-sm border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.04)] p-4">
                <p className="font-[family-name:var(--font-display)] text-lg text-[rgba(0,229,255,0.9)]">
                  {codename.trim() || "CHIMERA"}
                </p>
                <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.5)]">
                  {phenotypeLabel}
                </p>
                {personalityDef && (
                  <p className="mt-1 text-[10px] text-[rgba(255,255,255,0.35)]">
                    {personalityDef.role} · {personalityDef.tagline.slice(0, 72)}…
                  </p>
                )}
                <p className="mt-2 text-[10px] text-[rgba(255,255,255,0.35)]">
                  Adapts every 3 games · cloud backup enabled
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="mt-4 text-center text-xs text-[rgba(255,180,120,0.9)]">{error}</p>
        )}

        <div className="mt-8 flex justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || busy}
            className="rounded-sm border border-[rgba(255,255,255,0.12)] px-4 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(255,255,255,0.5)] disabled:opacity-30"
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-sm border border-[rgba(0,229,255,0.35)] bg-[rgba(0,229,255,0.08)] px-6 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-[rgba(0,229,255,0.9)]"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={busy}
              className="rounded-sm border border-[rgba(232,197,71,0.4)] bg-[rgba(232,197,71,0.1)] px-6 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-gold-glow disabled:opacity-50"
            >
              {busy ? "Saving…" : "Deploy CHIMERA"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
