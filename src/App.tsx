import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ACCOUNT_EVENT } from "./account/types";
import {
  hasCompletedChimeraSetup,
  isLoggedIn,
  needsChimeraSetup,
} from "./account/storage";
import ChimeraAuthGate from "./components/auth/ChimeraAuthGate";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";
import { CHIMERA_SETUP_EVENT, CHIMERA_OPEN_SETUP_EVENT } from "./chimeraSetup";
import { scheduleCloudBackup } from "./api/cloudBackup";
import {
  CHIMERA_MEMORY_SAVE_FAILED,
  CHIMERA_MEMORY_SAVED,
} from "./ai/memory";

const LandingPage = lazy(() => import("./components/LandingPage"));
const ChimeraCustomisePage = lazy(
  () => import("./components/chimera/ChimeraCustomisePage")
);

export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn);
  const [setupRequired, setSetupRequired] = useState(needsChimeraSetup);
  const [setupOptional, setSetupOptional] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const refreshGates = useCallback(() => {
    setAuthenticated(isLoggedIn());
    setSetupRequired(needsChimeraSetup());
    if (!needsChimeraSetup()) {
      setSetupOptional(false);
    }
  }, []);

  useEffect(() => {
    refreshGates();
    const onAccount = () => refreshGates();
    const onSetup = () => refreshGates();
    const openSetup = () => {
      if (hasCompletedChimeraSetup()) {
        setSetupOptional(true);
      }
    };
    window.addEventListener(ACCOUNT_EVENT, onAccount);
    window.addEventListener(CHIMERA_SETUP_EVENT, onSetup);
    window.addEventListener(CHIMERA_OPEN_SETUP_EVENT, openSetup);
    const onMemorySaved = () => scheduleCloudBackup();
    const onMemoryFailed = () =>
      setStorageWarning(
        "Could not save progress locally — storage may be full. Export data from Account if needed."
      );
    window.addEventListener(CHIMERA_MEMORY_SAVED, onMemorySaved);
    window.addEventListener(CHIMERA_MEMORY_SAVE_FAILED, onMemoryFailed);
    return () => {
      window.removeEventListener(ACCOUNT_EVENT, onAccount);
      window.removeEventListener(CHIMERA_SETUP_EVENT, onSetup);
      window.removeEventListener(CHIMERA_OPEN_SETUP_EVENT, openSetup);
      window.removeEventListener(CHIMERA_MEMORY_SAVED, onMemorySaved);
      window.removeEventListener(CHIMERA_MEMORY_SAVE_FAILED, onMemoryFailed);
    };
  }, [refreshGates]);

  return (
    <AppErrorBoundary>
      {storageWarning && authenticated && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[300] mx-auto max-w-lg rounded-sm border border-[rgba(255,100,100,0.35)] bg-[rgba(20,8,8,0.95)] px-4 py-3 text-center text-sm text-[rgba(255,200,200,0.9)]"
          role="alert"
        >
          {storageWarning}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setStorageWarning(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {!authenticated ? (
        <ChimeraAuthGate onAuthenticated={refreshGates} />
      ) : setupRequired ? (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-void text-[rgba(255,255,255,0.4)]">
              Loading…
            </div>
          }
        >
          <ChimeraCustomisePage required onComplete={refreshGates} />
        </Suspense>
      ) : (
        <>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-void text-[rgba(255,255,255,0.4)]">
                Loading CHIMERA…
              </div>
            }
          >
            <LandingPage />
          </Suspense>
          {setupOptional && (
            <Suspense fallback={null}>
              <ChimeraCustomisePage
                required={false}
                onComplete={() => setSetupOptional(false)}
                onDismiss={() => setSetupOptional(false)}
              />
            </Suspense>
          )}
        </>
      )}
    </AppErrorBoundary>
  );
}
