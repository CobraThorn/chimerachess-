import { useCallback, useEffect, useState } from "react";
import { ACCOUNT_EVENT } from "./account/types";
import { needsChimeraSetup } from "./account/storage";
import LandingPage from "./components/LandingPage";
import ChimeraCustomisePage from "./components/chimera/ChimeraCustomisePage";
import { CHIMERA_SETUP_EVENT, CHIMERA_OPEN_SETUP_EVENT } from "./chimeraSetup";

export default function App() {
  const [showSetup, setShowSetup] = useState(() => needsChimeraSetup());

  const refreshSetupGate = useCallback(() => {
    setShowSetup(needsChimeraSetup());
  }, []);

  useEffect(() => {
    refreshSetupGate();
    const onAccount = () => refreshSetupGate();
    const onSetup = () => refreshSetupGate();
    const openSetup = () => setShowSetup(true);
    window.addEventListener(ACCOUNT_EVENT, onAccount);
    window.addEventListener(CHIMERA_SETUP_EVENT, onSetup);
    window.addEventListener(CHIMERA_OPEN_SETUP_EVENT, openSetup);
    return () => {
      window.removeEventListener(ACCOUNT_EVENT, onAccount);
      window.removeEventListener(CHIMERA_SETUP_EVENT, onSetup);
      window.removeEventListener(CHIMERA_OPEN_SETUP_EVENT, openSetup);
    };
  }, [refreshSetupGate]);

  return (
    <>
      <LandingPage />
      {showSetup && (
        <ChimeraCustomisePage onComplete={() => setShowSetup(false)} />
      )}
    </>
  );
}
