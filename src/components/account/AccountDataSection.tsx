import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  clearDataEvents,
  exportDataEventsJson,
  isValidEmail,
  isValidPhone,
  loadAccount,
  logDataEvent,
  maskEmail,
  normalizeEmail,
  normalizePhone,
  registerAccount,
  signInAccount,
  signOut,
  updateAccount,
  EMPTY_CONSENTS,
  type DataConsents,
} from "../../account";
import {
  checkBackendHealth,
  getSyncMeta,
  syncToBackend,
} from "../../api/chimeraBackend";
import { useAccount } from "../../hooks/useAccount";
import { friendlyCloudError } from "../../utils/userFacingError";

type Tab = "signin" | "register";

const CONSENT_COPY: {
  key: keyof DataConsents;
  label: string;
  detail: string;
}[] = [
  {
    key: "analytics",
    label: "Gameplay & training data",
    detail:
      "Moves, accuracy, cognitive map usage, opening drills, and session patterns.",
  },
  {
    key: "cognitiveResearch",
    label: "Cognitive research (anonymised)",
    detail:
      "Aggregated blind-spot and tilt patterns — no raw games sold or shared.",
  },
  {
    key: "marketing",
    label: "Product updates",
    detail: "Email or SMS about features, training plans, and CHIMERA releases.",
  },
];

function ConsentToggles({
  consents,
  onChange,
  disabled,
}: {
  consents: DataConsents;
  onChange: (c: DataConsents) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      {CONSENT_COPY.map((item) => (
        <label
          key={item.key}
          className={`flex cursor-pointer gap-3 rounded-sm border border-[rgba(255,255,255,0.06)] p-3 ${
            disabled ? "opacity-50" : "hover:border-[rgba(232,197,71,0.15)]"
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
          <span>
            <span className="font-[family-name:var(--font-body)] text-sm text-white">
              {item.label}
            </span>
            <span className="mt-0.5 block font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.38)]">
              {item.detail}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

export default function AccountDataSection() {
  const { account, isLoggedIn, eventCount, refresh } = useAccount();
  const [tab, setTab] = useState<Tab>("register");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consents, setConsents] = useState<DataConsents>({ ...EMPTY_CONSENTS });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editContact, setEditContact] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMeta, setSyncMeta] = useState(getSyncMeta);

  useEffect(() => {
    void checkBackendHealth().then(setApiOnline);
    const id = setInterval(() => {
      setSyncMeta(getSyncMeta());
      void checkBackendHealth().then(setApiOnline);
    }, 4000);
    return () => clearInterval(id);
  }, [account, eventCount]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    const result = await syncToBackend();
    setSyncing(false);
    setSyncMeta(getSyncMeta());
    refresh();
    if (result.ok) {
      setSuccess(
        `Synced to server${result.eventsAppended != null ? ` · ${result.eventsAppended} new events` : ""}.`
      );
    } else {
      setError(friendlyCloudError(result.error ?? "Sync failed"));
    }
  };

  useEffect(() => {
    const a = loadAccount();
    if (a) {
      setEmail(a.email);
      setPhone(a.phone ?? "");
      setDisplayName(a.displayName);
      setConsents(a.consents);
    }
  }, [account]);

  const handleRegister = () => {
    setError(null);
    setSuccess(null);
    const normEmail = normalizeEmail(email);
    if (!isValidEmail(normEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setError("Enter a valid phone number (10+ digits) or leave blank.");
      return;
    }
    if (!consents.analytics) {
      setError("Enable gameplay & training data to create an account.");
      return;
    }
    registerAccount({
      email: normEmail,
      phone: phone.trim() ? normalizePhone(phone) : null,
      displayName: displayName.trim() || "Player",
      consents,
    });
    logDataEvent("sign_up", { analytics: consents.analytics });
    logDataEvent("consent_update", {
      analytics: consents.analytics,
      marketing: consents.marketing,
      research: consents.cognitiveResearch,
    });
    setSuccess("Account created — data collection active on this device.");
    refresh();
  };

  const handleSignIn = () => {
    setError(null);
    setSuccess(null);
    const normEmail = normalizeEmail(email);
    if (!isValidEmail(normEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    const existing = loadAccount();
    if (!existing || existing.email !== normEmail) {
      setError("No account for this email — register first.");
      setTab("register");
      return;
    }
    signInAccount(normEmail);
    logDataEvent("sign_in");
    setSuccess("Signed in.");
    refresh();
  };

  const handleSignOut = () => {
    logDataEvent("sign_out");
    signOut();
    setSuccess("Signed out — local session ended.");
    refresh();
  };

  const handleSaveContact = () => {
    if (phone.trim() && !isValidPhone(phone)) {
      setError("Invalid phone number.");
      return;
    }
    updateAccount({
      phone: phone.trim() ? normalizePhone(phone) : null,
      displayName: displayName.trim() || "Player",
      consents,
    });
    logDataEvent("consent_update", {
      analytics: consents.analytics,
      marketing: consents.marketing,
      research: consents.cognitiveResearch,
    });
    setEditContact(false);
    setSuccess("Contact and consent preferences saved.");
    refresh();
  };

  const handleExport = () => {
    const json = exportDataEventsJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chimera-data-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess("Data export downloaded.");
  };

  return (
    <div
      id="account"
      className="mt-10 border-t border-[rgba(232,197,71,0.1)] pt-10 scroll-mt-28"
    >
      <div className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(0,229,255,0.5)]">
        ACCOUNT & PRIVACY
      </div>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-gold-glow">
        Your account
      </h3>
      <p className="mt-2 max-w-2xl font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
        Sign in with email and optional phone to save progress and sync your
        games across devices.
      </p>

      {error && (
        <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[rgba(255,100,100,0.9)]">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[rgba(52,211,153,0.85)]">
          {success}
        </p>
      )}

      {isLoggedIn && account ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 space-y-8"
        >
          <div className="glass-panel rounded-sm p-6">
            <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(52,211,153,0.6)]">
              SIGNED IN
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-white">
              {account.displayName}
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
              {maskEmail(account.email)}
              {account.phone ? ` · ${account.phone}` : ""}
            </p>
            <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.25)]">
              {eventCount} events on this device
              {syncMeta.pendingCount > 0
                ? ` · ${syncMeta.pendingCount} waiting to sync`
                : ""}
            </p>
            <div className="mt-3 rounded-sm border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.04)] px-3 py-2">
              <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(0,229,255,0.6)]">
                CLOUD SYNC{" "}
                {apiOnline === null
                  ? "…"
                  : apiOnline
                    ? "CONNECTED"
                    : "UNAVAILABLE"}
              </p>
              <p className="mt-1 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.4)]">
                {syncMeta.lastOk && syncMeta.lastSyncedAt
                  ? `Last synced ${new Date(syncMeta.lastSyncedAt).toLocaleString()}`
                  : friendlyCloudError(syncMeta.lastError) ?? "Not synced yet"}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSyncNow()}
                disabled={syncing || apiOnline === false}
                className="rounded-sm border border-[rgba(0,229,255,0.35)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.12em] text-[rgba(0,229,255,0.85)] disabled:opacity-40"
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <button
                type="button"
                onClick={() => setEditContact((v) => !v)}
                className="nav-link rounded-sm px-3 py-1.5 text-[8px]"
              >
                {editContact ? "Cancel edit" : "Edit contact"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="nav-link rounded-sm px-3 py-1.5 text-[8px]"
              >
                Export data
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-sm border border-[rgba(255,100,100,0.3)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,120,120,0.9)]"
              >
                Sign out
              </button>
            </div>
          </div>

          {editContact && (
            <div className="glass-panel space-y-4 rounded-sm p-6">
              <Field label="Display name" value={displayName} onChange={setDisplayName} />
              <Field
                label="Phone"
                value={phone}
                onChange={setPhone}
                type="tel"
                placeholder="+1 555 000 0000"
                hint="Optional — for SMS alerts when enabled"
              />
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.3)]">
                CONSENT
              </p>
              <ConsentToggles consents={consents} onChange={setConsents} />
              <button
                type="button"
                onClick={handleSaveContact}
                className="rounded-sm border border-[rgba(232,197,71,0.35)] px-4 py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-gold-glow"
              >
                Save
              </button>
            </div>
          )}

          <DataCollectionAreas />
        </motion.div>
      ) : (
        <div className="mt-8">
          <div className="mb-6 flex gap-2">
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

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="glass-panel space-y-4 rounded-sm p-6">
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="you@example.com"
                required
              />
              <Field
                label="Phone"
                value={phone}
                onChange={setPhone}
                type="tel"
                placeholder="+1 555 000 0000"
                hint="Optional"
              />
              {tab === "register" && (
                <Field
                  label="Display name"
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="Your name"
                />
              )}
              <button
                type="button"
                onClick={tab === "signin" ? handleSignIn : handleRegister}
                className="w-full rounded-sm border border-[rgba(232,197,71,0.35)] py-3 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-gold-glow"
              >
                {tab === "signin" ? "Sign in" : "Create account"}
              </button>
            </div>

            <div className="glass-panel rounded-sm p-6">
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(255,255,255,0.35)]">
                DATA COLLECTION CONSENT
              </p>
              <p className="mt-2 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
                Required to register. You can change preferences anytime in
                Settings.
              </p>
              <div className="mt-4">
                <ConsentToggles
                  consents={consents}
                  onChange={setConsents}
                  disabled={tab === "signin"}
                />
              </div>
            </div>
          </div>

          <DataCollectionAreas />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.35)]">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-sm border border-[rgba(255,255,255,0.1)] bg-[rgba(5,5,12,0.6)] px-3 py-2 font-[family-name:var(--font-body)] text-sm text-white outline-none focus:border-[rgba(0,229,255,0.4)]"
      />
      {hint && (
        <span className="mt-1 block font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.3)]">
          {hint}
        </span>
      )}
    </label>
  );
}

function DataCollectionAreas() {
  const areas = [
    {
      title: "Identity",
      fields: "Email, phone, display name, session timestamps",
    },
    {
      title: "Gameplay",
      fields: "Moves, results, Elo, mistakes, opening lines practiced",
    },
    {
      title: "Cognition",
      fields: "Archetype scores, tilt events, cognitive map modes, blind spots",
    },
    {
      title: "Product usage",
      fields: "Analyze depth, coach refreshes, customisation choices",
    },
  ];

  return (
    <div className="glass-panel rounded-sm p-6">
      <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.5)]">
        DATA COLLECTION AREAS
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {areas.map((a) => (
          <div
            key={a.title}
            className="rounded-sm border border-[rgba(255,255,255,0.05)] p-4"
          >
            <p className="font-[family-name:var(--font-display)] text-sm text-gold-glow">
              {a.title}
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
              {a.fields}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          clearDataEvents();
          window.dispatchEvent(new Event("chimera-account-update"));
        }}
        className="mt-4 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.12em] text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,120,120,0.7)]"
      >
        Clear saved activity on this device
      </button>
    </div>
  );
}
