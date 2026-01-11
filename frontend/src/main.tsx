import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./api-client.ts";

import App from "./App.tsx";

import "./reset.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
