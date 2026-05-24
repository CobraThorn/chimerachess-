import { useCallback, useEffect, useState } from "react";
import { ACCOUNT_EVENT } from "./account/types";
import { needsChimeraSetup } from "./account/storage";
import LandingPage from "./components/LandingPage";
import ChimeraCustomisePage from "./components/chimera/ChimeraCustomisePage";
import { CHIMERA_SETUP_EVENT, CHIMERA_OPEN_SETUP_EVENT } from "./chimeraSetup";

type SetupOverlay = false | "required" | "optional";

export default function App() {
  const [setupOverlay, setSetupOverlay] = useState<SetupOverlay>(() =>
    needsChimeraSetup() ? "required" : false
  );

  const refreshSetupGate = useCallback(() => {
    if (needsChimeraSetup()) {
      setSetupOverlay("required");
    } else {
      setSetupOverlay((prev) => (prev === "required" ? false : prev));
    }
  }, []);

  useEffect(() => {
    refreshSetupGate();
    const onAccount = () => refreshSetupGate();
    const onSetup = () => refreshSetupGate();
    const openSetup = () => setSetupOverlay("optional");
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
      {setupOverlay && (
        <ChimeraCustomisePage
          required={setupOverlay === "required"}
          onComplete={() => setSetupOverlay(false)}
          onDismiss={
            setupOverlay === "optional"
              ? () => setSetupOverlay(false)
              : undefined
          }
        />
      )}
    </>
  );
}
