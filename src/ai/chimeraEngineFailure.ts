import { logDataEvent } from "../account/events";

/** Why CHIMERA could not complete a move (telemetry only — not shown to players). */
export type ChimeraFailureReason =
  | "move_timeout"
  | "no_legal_move"
  | "engine_load_failed"
  | "engine_not_ready"
  | "apply_move_failed"
  | "recovery_exhausted"
  | "watchdog_timeout"
  | "repeated_failed_move"
  | "invalid_position"
  | "recovery_retry";

export const CHIMERA_RESIGN_TERMINATION = "chimera_resigned_engine_failure";

export const MAX_CHIMERA_MOVE_ATTEMPTS = 3;

const PREFIX = "[CHIMERA engine]";

export function logChimeraEngineFailure(
  reason: ChimeraFailureReason,
  detail?: Record<string, string | number | boolean>
): void {
  const payload = { reason, ...(detail ?? {}) };
  if (!import.meta.env.PROD) {
    console.info(PREFIX, payload);
  } else {
    console.warn(PREFIX, reason);
  }
  logDataEvent("chimera_engine_failure", payload);
}

export function logChimeraRecoveryAttempt(
  attempt: number,
  strategy: string
): void {
  logChimeraEngineFailure("recovery_retry", { attempt, strategy });
}
