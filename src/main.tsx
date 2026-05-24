import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyStorageGenerationReset } from "./storage/reset";
import { CustomisationProvider } from "./customisation";
import "./index.css";
import App from "./App";

applyStorageGenerationReset();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomisationProvider>
      <App />
    </CustomisationProvider>
  </StrictMode>
);
