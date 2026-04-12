import { registerSW } from "virtual:pwa-register";
import { toast } from "@/components/ui/sonner";

const updateSW = registerSW({
  onNeedRefresh() {
    toast("Update available", {
      description: "Reload to get the latest version.",
      action: {
        label: "Reload",
        onClick: () => updateSW(true),
      },
      duration: Infinity,
    });
  },
  onOfflineReady() {
    toast("App ready offline", {
      description: "You can keep using Today Little Log without a connection.",
    });
  },
});
