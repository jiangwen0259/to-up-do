import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "@/stores";
import "@/assets/main.css";
import Popup from "@/pages/Popup";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <Popup />
    </AppProvider>
  </StrictMode>
);
