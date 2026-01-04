import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Share, Plus, Check, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone (already installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
    
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || isInstalled) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            App Installed!
          </h1>
          <p className="text-muted-foreground">
            Today is now installed on your device. You can access it from your home screen.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Install Today
          </h1>
          <p className="text-muted-foreground">
            Add Today to your home screen for quick access and offline support.
          </p>
        </div>

        {/* Android / Chrome install button */}
        {deferredPrompt && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="h-5 w-5" />
                Install App
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS instructions */}
        {isIOS && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-4">How to install on iPhone/iPad:</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Share className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Tap the Share button</p>
                    <p className="text-sm text-muted-foreground">
                      In Safari, tap the share icon at the bottom of the screen
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Add to Home Screen</p>
                    <p className="text-sm text-muted-foreground">
                      Scroll down and tap "Add to Home Screen"
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Confirm</p>
                    <p className="text-sm text-muted-foreground">
                      Tap "Add" in the top right corner
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">Benefits of installing:</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              Works offline - journal anytime, anywhere
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              Faster loading - instant access from home screen
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              Full-screen experience - no browser UI
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              Works like a native app
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
