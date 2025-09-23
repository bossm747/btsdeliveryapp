import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show install instructions
    if (isIOSDevice && !(window.navigator as any).standalone) {
      setTimeout(() => setShowInstallBanner(true), 2000);
      return;
    }

    // For Android/Chrome, listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install banner after a delay
      setTimeout(() => setShowInstallBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if should show install prompt
    try {
      const lastPromptTime = localStorage.getItem('pwa-install-prompt-time');
      if (!lastPromptTime || Date.now() - parseInt(lastPromptTime) > 7 * 24 * 60 * 60 * 1000) {
        // Show every 7 days
        setTimeout(() => setShowInstallBanner(true), 5000);
      }
    } catch (error) {
      // Show banner if localStorage check fails
      setTimeout(() => setShowInstallBanner(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallBanner(false);
    
    // Save prompt time
    try {
      localStorage.setItem('pwa-install-prompt-time', Date.now().toString());
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem('pwa-install-prompt-time', Date.now().toString());
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  };

  if (isInstalled || !showInstallBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up md:left-auto md:right-4 md:max-w-sm">
      <Card className="shadow-lg border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Install BTS Delivery</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Install this app on your iPhone for quick access and offline use!
              </p>
              <ol className="text-xs text-gray-600 space-y-1 ml-4">
                <li>1. Tap the <span className="font-semibold">Share</span> button</li>
                <li>2. Scroll down and tap <span className="font-semibold">Add to Home Screen</span></li>
                <li>3. Tap <span className="font-semibold">Add</span></li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Add to your home screen for a faster, app-like experience!
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleInstallClick}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Install App
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  size="sm"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}