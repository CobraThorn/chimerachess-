import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  EMPTY_CONSENTS,
  hasStoredAccount,
  logDataEvent,
  loginWithPassword,
  maskEmail,
  registerUser,
  storedAccountEmail,
  type DataConsents,
} from "../../account";
import { friendlyCloudError } from "../../utils/userFacingError";

type Tab = "signin" | "register";

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(232,197,71,0.6)] uppercase">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 w-full rounded-sm border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.35)] px-3 py-2.5 font-[family-name:var(--font-body)] text-sm text-white outline-none focus:border-[rgba(0,229,255,0.35)]"
      />
      {hint && (
        <span className="mt-1 block font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.3)]">
          {hint}
        </span>
      )}
    </label>
  );
}

function ConsentToggles({
  consents,
  onChange,
  disabled,
}: {
  consents: DataConsents;
  onChange: (c: DataConsents) => void;
  disabled?: boolean;
}) {
  const items: { key: keyof DataConsents; label: string }[] = [
    { key: "analytics", label: "Gameplay & training data (required)" },
    { key: "cognitiveResearch", label: "Cognitive research (anonymised)" },
    { key: "marketing", label: "Product updates" },
  ];
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <label
          key={item.key}
          className={`flex cursor-pointer gap-3 rounded-sm border border-[rgba(255,255,255,0.06)] p-3 ${
            disabled ? "opacity-50" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={consents[item.key]}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...consents, [item.key]: e.target.checked })
            }
            className="mt-0.5 accent-[#e8c547]"
          />
          <span className="font-[family-name:var(--font-body)] text-sm text-white">
            {item.label}
          </span>
        </label>
      ))}
    </div>
  );
}

interface ChimeraAuthGateProps {
  onAuthenticated: () => void;
}

/** Full-screen gate — sign in or register required before using CHIMERA. */
export default function ChimeraAuthGate({ onAuthenticated }: ChimeraAuthGateProps) {
  const [tab, setTab] = useState<Tab>(() =>
    hasStoredAccount() ? "signin" : "register"
  );
  const [authBusy, setAuthBusy] = useState(false);
  const [email, setEmail] = useState(() => storedAccountEmail() ?? "");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consents, setConsents] = useState<DataConsents>({ ...EMPTY_CONSENTS });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleRegister = async () => {
    setError(null);
    setAuthBusy(true);
    const result = await registerUser({
      email,
      password,
      phone: null,
      displayName: displayName.trim() || "Player",
      consents,
    });
    setAuthBusy(false);
    if (!result.ok) {
      setError(friendlyCloudError(result.error));
      return;
    }
    logDataEvent("sign_up", { analytics: consents.analytics });
    onAuthenticated();
  };

  const handleSignIn = async () => {
    setError(null);
    setAuthBusy(true);
    const result = await loginWithPassword(email, password);
    setAuthBusy(false);
    if (!result.ok) {
      setError(friendlyCloudError(result.error));
      if (result.error.includes("Register")) setTab("register");
      return;
    }
    logDataEvent("sign_in");
    onAuthenticated();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-[rgba(4,4,8,0.98)] p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel relative w-full max-w-xl rounded-sm p-6 md:p-10"
      >
        <span className="hud-corner hud-corner--tl" />
        <span className="hud-corner hud-corner--tr" />
        <span className="hud-corner hud-corner--bl" />
        <span className="hud-corner hud-corner--br" />

        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.4em] text-[rgba(232,197,71,0.55)] uppercase">
          Access required
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-gold-glow md:text-3xl">
          Sign in to enter CHIMERA
        </h1>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
          An account is required to play, train, and sync your adaptive CHIMERA.
          New users customise their opponent right after registering.
        </p>

        {hasStoredAccount() && storedAccountEmail() && tab === "signin" && (
          <p className="mt-4 rounded-sm border border-[rgba(232,197,71,0.2)] bg-[rgba(232,197,71,0.05)] px-4 py-3 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.55)]">
            Welcome back — use{" "}
            <span className="text-gold-glow">{maskEmail(storedAccountEmail()!)}</span>
          </p>
        )}

        <div className="mt-6 flex gap-2">
          {(["signin", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-sm px-4 py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] ${
                tab === t
                  ? "border border-[rgba(232,197,71,0.4)] text-gold-glow"
                  : "text-[rgba(255,255,255,0.35)]"
              }`}
            >
              {t === "signin" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="you@example.com"
            required
          />
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="At least 8 characters"
            required
            hint="Required for cloud backup and sign-in on other devices."
          />
          {tab === "register" && (
            <Field
              label="Display name"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Your name"
            />
          )}
          {tab === "register" && (
            <div>
              <p className="mb-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.35)] uppercase">
                Consent
              </p>
              <ConsentToggles consents={consents} onChange={setConsents} />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-[rgba(255,100,100,0.9)]">{error}</p>
        )}

        <button
          type="button"
          disabled={authBusy}
          onClick={() => void (tab === "signin" ? handleSignIn() : handleRegister())}
          className="mt-6 w-full rounded-sm border border-[rgba(232,197,71,0.4)] bg-[rgba(232,197,71,0.1)] py-3 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-gold-glow disabled:opacity-50"
        >
          {authBusy
            ? "Please wait…"
            : tab === "signin"
              ? "Sign in"
              : "Create account & continue"}
        </button>
      </motion.div>
    </div>
  );
}
