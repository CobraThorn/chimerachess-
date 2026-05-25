import { useCallback, useEffect, useState } from "react";
import { probeServerOpenAiCoach } from "./api/openaiKey";
import { ACCOUNT_EVENT } from "./account/types";
import {
  hasCompletedChimeraSetup,
  isLoggedIn,
  needsChimeraSetup,
} from "./account/storage";
import ChimeraAuthGate from "./components/auth/ChimeraAuthGate";
import ChimeraCustomisePage from "./components/chimera/ChimeraCustomisePage";
import LandingPage from "./components/LandingPage";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";
import { CHIMERA_SETUP_EVENT, CHIMERA_OPEN_SETUP_EVENT } from "./chimeraSetup";

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
    void probeServerOpenAiCoach();
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
        <ChimeraCustomisePage required onComplete={refreshGates} />
      ) : (
        <>
          <LandingPage />
          {setupOptional && (
            <ChimeraCustomisePage
              required={false}
              onComplete={() => setSetupOptional(false)}
              onDismiss={() => setSetupOptional(false)}
            />
          )}
        </>
      )}
    </AppErrorBoundary>
  );
}
