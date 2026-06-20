import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./pwa";
import { installBrowserMonitoring } from "./lib/monitoring";

createRoot(document.getElementById("root")!).render(<App />);

const scheduleMonitoring = () => installBrowserMonitoring();
if ("requestIdleCallback" in window) {
  requestIdleCallback(scheduleMonitoring, { timeout: 3000 });
} else {
  setTimeout(scheduleMonitoring, 1);
}
