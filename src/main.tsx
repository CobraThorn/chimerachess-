import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CustomisationProvider } from "./customisation";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomisationProvider>
      <App />
    </CustomisationProvider>
  </StrictMode>
);
