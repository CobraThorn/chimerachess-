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

const LandingPage = lazy(() => import("./components/LandingPage"));
const ChimeraCustomisePage = lazy(
  () => import("./components/chimera/ChimeraCustomisePage")
);

export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn);
  const [setupRequired, setSetupRequired] = useState(needsChimeraSetup);
  const [setupOptional, setSetupOptional] = useState(false);

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
    return () => {
      window.removeEventListener(ACCOUNT_EVENT, onAccount);
      window.removeEventListener(CHIMERA_SETUP_EVENT, onSetup);
      window.removeEventListener(CHIMERA_OPEN_SETUP_EVENT, openSetup);
    };
  }, [refreshGates]);

  return (
    <AppErrorBoundary>
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
