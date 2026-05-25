const PREFIX = "[CHIMERA review]";

export type ReviewDiagStage =
  | "trigger"
  | "engine_boot"
  | "engine_ready"
  | "engine_fail"
  | "run_start"
  | "build_start"
  | "build_move"
  | "build_skip"
  | "build_done"
  | "complete"
  | "error";

export function reviewDiag(
  stage: ReviewDiagStage,
  detail?: Record<string, unknown>
): void {
  if (import.meta.env.PROD) {
    if (stage === "error" || stage === "engine_fail" || stage === "build_skip") {
      console.warn(PREFIX, stage, detail ?? "");
    }
    return;
  }
  console.info(PREFIX, stage, detail ?? "");
}
