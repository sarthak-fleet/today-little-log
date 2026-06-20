import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./pwa";
createRoot(document.getElementById("root")!).render(<App />);

const scheduleMonitoring = () => {
  void import("./lib/monitoring").then((m) => m.installBrowserMonitoring());
};
if ("requestIdleCallback" in window) {
  requestIdleCallback(scheduleMonitoring, { timeout: 3000 });
} else {
  setTimeout(scheduleMonitoring, 1);
}
