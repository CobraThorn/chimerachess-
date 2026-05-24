import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  getTopPatterns,
  resetAllStats,
  userStyleToRadar,
} from "../../ai";
import { effectiveChimeraElo } from "../../ai/chimeraStrength";
import { logDataEvent } from "../../account/events";
import { maskEmail } from "../../account/validation";
import { useAccount } from "../../hooks/useAccount";
import { useChimeraProfile } from "../../hooks/useChimeraProfile";
import CognitiveArchetypePanel from "../chess/CognitiveArchetypePanel";
import ChimeraLearningPanel from "../chess/ChimeraLearningPanel";
import ChimeraPhenotypeProfile from "../chimera/ChimeraPhenotypeProfile";
import MistakeLabPanel from "../intelligence/MistakeLabPanel";
import CognitiveProfileSection from "./cognitive/CognitiveProfileSection";
import ChimeraMemoryRadar from "../chess/ChimeraMemoryRadar";
import EloBadge from "../chess/EloBadge";
import {
  computeAvgAccuracyFromMemory,
  computeBlunderRateFromMemory,
  ensureCrsState,
} from "../../crs/profile";
import CrsProfileSection from "../crs/CrsProfileSection";
import {
  archetypeHeadline,
  avgCpLoss,
  cognitiveSnapshot,
  computeAchievements,
  formatDate,
  formatResult,
  getRankTitle,
  setDisplayName,
  winRate,
} from "./profileUtils";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="glass-panel rounded-sm border border-[rgba(255,255,255,0.06)] px-4 py-4">
      <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(255,255,255,0.35)] uppercase">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-gold-glow">
        {value}
      </p>
      {sub && (
        <p className="mt-1 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.35)]">
          {sub}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { memory, displayName, refresh } = useChimeraProfile();
  const { account, isLoggedIn } = useAccount();

  useEffect(() => {
    logDataEvent("profile_view");
  }, []);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName]);

  const crs = ensureCrsState(memory);
  const userElo = crs.chimeraRating;
  const chimeraElo = effectiveChimeraElo(memory);
  const rank = getRankTitle(userElo);
  const wr = winRate(memory);
  const recentGames = [...memory.games].reverse().slice(0, 8);
  const patterns = getTopPatterns(memory, 5);
  const achievements = computeAchievements(memory);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const snapshot = cognitiveSnapshot(memory);
  const mirror = memory.mirrorStats;

  const saveName = () => {
    setDisplayName(nameDraft);
    setEditingName(false);
    refresh();
  };

  const handleResetStats = () => {
    resetAllStats();
    setConfirmReset(false);
    setResetDone(true);
    refresh();
    window.setTimeout(() => setResetDone(false), 4000);
  };

  return (
    <div className="mt-12 space-y-12">
      {!isLoggedIn ? (
        <div className="rounded-sm border border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.05)] px-4 py-3">
          <p className="font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.5)]">
            Link your email in{" "}
            <a href="#account" className="text-[rgba(0,229,255,0.75)] underline">
              Settings → Account
            </a>{" "}
            to save your profile and game history.
          </p>
        </div>
      ) : (
        account && (
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(52,211,153,0.55)]">
            SIGNED IN · {maskEmail(account.email)}
          </p>
        )
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col gap-8 border-b border-[rgba(232,197,71,0.1)] pb-10 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-center gap-6">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[rgba(232,197,71,0.45)] bg-gradient-to-br from-[rgba(232,197,71,0.15)] to-[rgba(8,8,14,0.95)]">
            <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-gold-glow">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="absolute bottom-0 left-0 right-0 bg-[rgba(0,229,255,0.15)] py-0.5 text-center font-[family-name:var(--font-hud)] text-[7px] tracking-widest text-[rgba(0,229,255,0.8)]">
              {rank}
            </span>
          </div>
          <div>
            {editingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={24}
                  className="rounded-sm border border-[rgba(232,197,71,0.35)] bg-[rgba(5,5,10,0.8)] px-3 py-1.5 font-[family-name:var(--font-display)] text-xl text-gold-glow outline-none focus:border-[rgba(232,197,71,0.6)]"
                />
                <button
                  type="button"
                  onClick={saveName}
                  className="nav-link rounded-sm px-3 py-1 text-[9px]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(displayName);
                    setEditingName(false);
                  }}
                  className="text-[9px] text-[rgba(255,255,255,0.35)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(displayName);
                  setEditingName(true);
                }}
                className="group text-left"
              >
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-gold-glow transition-colors group-hover:text-[#ffe566] md:text-3xl">
                  {displayName}
                </h3>
                <p className="mt-1 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(255,255,255,0.35)] group-hover:text-[rgba(232,197,71,0.5)]">
                  Tap to edit callsign
                </p>
              </button>
            )}
            <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
              {archetypeHeadline(memory)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.25em] text-gold-glow uppercase">
            {rank}
          </p>
          <EloBadge label="CHIMERA strength" elo={chimeraElo} variant="cyan" size="md" />
          <a
            href="#play"
            className="btn-cta rounded-sm border border-[rgba(232,197,71,0.45)] px-5 py-3 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[#ffe566]"
          >
            Play rated
          </a>
        </div>
      </motion.div>

      <CrsProfileSection
        crs={crs}
        gamesPlayed={memory.stats.totalGames}
        winRatePct={wr}
        blunderRate={computeBlunderRateFromMemory(memory)}
        avgAccuracy={computeAvgAccuracyFromMemory(memory)}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Games" value={memory.stats.totalGames} />
        <StatCard label="Wins" value={memory.stats.userWins} sub={`${winRate(memory)}% win rate`} />
        <StatCard label="Losses" value={memory.stats.chimeraWins} />
        <StatCard label="Draws" value={memory.stats.draws} />
        <StatCard label="Moves logged" value={memory.stats.totalMoves} />
        <StatCard
          label="CHIMERA knows you"
          value={`${memory.adaptation}%`}
          sub="Adaptation"
        />
      </div>

      <ChimeraLearningPanel memory={memory} />

      <ChimeraPhenotypeProfile memory={memory} />

      <MistakeLabPanel memory={memory} />

      <CognitiveProfileSection memory={memory} />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Cognitive identity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel rounded-sm p-6"
        >
          <CognitiveArchetypePanel memory={memory} />
        </motion.div>

        {/* Play style radar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel flex flex-col items-center rounded-sm p-6"
        >
          <p className="mb-4 w-full font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.45)] uppercase">
            Play style fingerprint
          </p>
          <ChimeraMemoryRadar
            title="Your DNA"
            elo={userElo}
            axes={userStyleToRadar(memory)}
            accent="gold"
            subtitle="Behavioural axes from your moves"
          />
          {memory.userStyle && memory.userStyle.moves > 0 && (
            <p className="mt-4 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.35)]">
              Avg loss per move:{" "}
              <span className="text-[rgba(232,197,71,0.75)]">{avgCpLoss(memory)} cp</span>
            </p>
          )}
        </motion.div>
      </div>

      {/* Cognitive metrics */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-panel rounded-sm p-6"
      >
        <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(232,197,71,0.65)] uppercase">
          Cognitive metrics
        </h4>
        <p className="mt-2 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.38)]">
          Tactical, positional, and psychological signals CHIMERA uses to model your
          decision-making.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.4)]">
                <span>{item.label}</span>
                <span className="text-[rgba(232,197,71,0.7)]">{item.value}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[rgba(232,197,71,0.5)] to-[rgba(0,229,255,0.4)]"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent games */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel rounded-sm p-6"
        >
          <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(232,197,71,0.65)] uppercase">
            Recent games
          </h4>
          {recentGames.length === 0 ? (
            <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.38)]">
              No rated games yet.{" "}
              <a href="#play" className="text-[rgba(0,229,255,0.6)] hover:underline">
                Play CHIMERA
              </a>{" "}
              to build your profile.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[rgba(255,255,255,0.06)]">
              {recentGames.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0"
                >
                  <div className="min-w-0">
                    <p
                      className={`font-[family-name:var(--font-hud)] text-[10px] tracking-[0.15em] ${
                        g.result === "user-win"
                          ? "text-[rgba(0,229,255,0.75)]"
                          : g.result === "chimera-win"
                            ? "text-[rgba(255,120,120,0.75)]"
                            : "text-[rgba(255,255,255,0.45)]"
                      }`}
                    >
                      {formatResult(g.result)}
                    </p>
                    <p className="mt-0.5 truncate font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.32)]">
                      {g.moves.length} moves · {g.mistakes.length} flagged
                    </p>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.28)]">
                    {formatDate(g.endedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Weaknesses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel rounded-sm p-6"
        >
          <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(232,197,71,0.65)] uppercase">
            Recurring weaknesses
          </h4>
          <p className="mt-2 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.38)]">
            Patterns CHIMERA exploits when you repeat the same mistakes.
          </p>
          {patterns.length === 0 ? (
            <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.35)]">
              No patterns stored yet — play more rated games.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {patterns.map((p) => (
                <li
                  key={`${p.positionKey}-${p.typicalBadMove}`}
                  className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-3"
                >
                  <span className="font-[family-name:var(--font-hud)] text-[9px] text-[rgba(232,197,71,0.7)]">
                    ×{p.occurrences}
                  </span>
                  <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.45)]">
                    Plays <span className="text-gold-glow">{p.typicalBadMove}</span> —
                    refuted by{" "}
                    <span className="text-[rgba(0,229,255,0.65)]">{p.refutation}</span>
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.25)]">
                    Avg −{Math.round(p.avgCpLoss)} cp
                  </p>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-panel rounded-sm p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(232,197,71,0.65)] uppercase">
              Achievements
            </h4>
            <p className="mt-2 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.38)]">
              {unlockedCount} of {achievements.length} unlocked
            </p>
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
            <div
              className="h-full rounded-full bg-[rgba(232,197,71,0.5)]"
              style={{
                width: `${(unlockedCount / achievements.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={[
                "rounded-sm border px-4 py-4 transition-colors",
                a.unlocked
                  ? "border-[rgba(232,197,71,0.25)] bg-[rgba(232,197,71,0.06)]"
                  : "border-[rgba(255,255,255,0.05)] opacity-50",
              ].join(" ")}
            >
              <p
                className={`font-[family-name:var(--font-display)] text-sm ${
                  a.unlocked ? "text-gold-glow" : "text-[rgba(255,255,255,0.35)]"
                }`}
              >
                {a.title}
              </p>
              <p className="mt-1 font-[family-name:var(--font-body)] text-[10px] leading-snug text-[rgba(255,255,255,0.35)]">
                {a.description}
              </p>
              {a.progress && (
                <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(0,229,255,0.45)]">
                  {a.progress}
                </p>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Mirror + settings links */}
      {(mirror?.total ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel rounded-sm p-6"
        >
          <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(0,229,255,0.5)] uppercase">
            Mirror duels observed
          </h4>
          <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
            {mirror!.total} spectator games · White {mirror!.whiteWins} · Black{" "}
            {mirror!.blackWins} · Draws {mirror!.draws}
          </p>
          <a
            href="#play"
            className="mt-4 inline-block font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(0,229,255,0.55)] hover:text-[rgba(0,229,255,0.85)]"
          >
            Watch CHIMERA vs CHIMERA →
          </a>
        </motion.div>
      )}

      <div className="border-t border-[rgba(232,197,71,0.08)] pt-8">
        <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(255,100,100,0.55)] uppercase">
          Danger zone
        </h4>
        <p className="mt-2 max-w-xl font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.38)]">
          Resets Elo, game history, mistake patterns, cognitive archetype, CHIMERA
          adaptation, and mirror stats. Your callsign and board customisation are
          kept.
        </p>
        {resetDone && (
          <p className="mt-3 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.15em] text-[rgba(0,229,255,0.65)]">
            Stats reset — profile cleared.
          </p>
        )}
        {confirmReset ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="font-[family-name:var(--font-body)] text-sm text-[rgba(255,200,200,0.75)]">
              This cannot be undone. Reset everything?
            </p>
            <button
              type="button"
              onClick={handleResetStats}
              className="rounded-sm border border-[rgba(255,80,80,0.5)] bg-[rgba(255,60,60,0.12)] px-4 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(255,160,160,0.95)] hover:bg-[rgba(255,60,60,0.2)]"
            >
              Yes, reset all stats
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="nav-link rounded-sm px-4 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.15em]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="mt-4 rounded-sm border border-[rgba(255,80,80,0.35)] px-4 py-2.5 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(255,140,140,0.85)] transition-colors hover:border-[rgba(255,80,80,0.55)] hover:bg-[rgba(255,60,60,0.08)]"
          >
            Reset all stats
          </button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <a
          href="#settings"
          className="nav-link rounded-sm px-4 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.15em]"
        >
          Customisation
        </a>
        <a
          href="#analyze"
          className="nav-link rounded-sm px-4 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.15em]"
        >
          Analysis (coming soon)
        </a>
      </div>
    </div>
  );
}
