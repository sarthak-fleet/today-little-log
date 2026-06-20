import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
createRoot(document.getElementById("root")!).render(<App />);

const schedulePwa = () => {
  void import("./pwa");
};
if ("requestIdleCallback" in window) {
  requestIdleCallback(schedulePwa, { timeout: 5000 });
} else {
  setTimeout(schedulePwa, 1);
}

const scheduleMonitoring = () => {
  void import("./lib/monitoring").then((m) => m.installBrowserMonitoring());
};
if ("requestIdleCallback" in window) {
  requestIdleCallback(scheduleMonitoring, { timeout: 3000 });
} else {
  setTimeout(scheduleMonitoring, 1);
}
