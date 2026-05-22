import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "@/stores";
import "@/assets/main.css";
import SidePanel from "@/pages/SidePanel";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <SidePanel />
    </AppProvider>
  </StrictMode>
);
