import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./pwa";
import { installBrowserMonitoring } from "./lib/monitoring";

installBrowserMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
