import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
createRoot(document.getElementById("root")!).render(<App />);

const schedulePwa = () => {
  // Fire-and-forget: a navigation that cancels this idle import must not
  // surface as an unhandled rejection ("Importing a module script failed").
  void import("./pwa").catch(() => {});
};
if ("requestIdleCallback" in window) {
  requestIdleCallback(schedulePwa, { timeout: 5000 });
} else {
  setTimeout(schedulePwa, 1);
}

const scheduleMonitoring = () => {
  void import("./lib/monitoring").then((m) => m.installBrowserMonitoring()).catch(() => {});
};
if ("requestIdleCallback" in window) {
  requestIdleCallback(scheduleMonitoring, { timeout: 3000 });
} else {
  setTimeout(scheduleMonitoring, 1);
}

const scheduleVitals = () => {
  void import("./lib/vitals").then((m) => m.initVitals()).catch(() => {});
};
if ("requestIdleCallback" in window) {
  requestIdleCallback(scheduleVitals, { timeout: 3000 });
} else {
  setTimeout(scheduleVitals, 1);
}
