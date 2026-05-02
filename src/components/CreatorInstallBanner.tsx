import React, { useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, UNSAFE_LocationContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone, Share, PlusSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CreatorInstallBanner = () => {
  const { isCreator } = useAuth();
  // Defensive: only call useLocation when inside a Router context to avoid
  // crashing the entire app if this component is ever rendered outside one.
  const hasRouter = React.useContext(UNSAFE_LocationContext as any) != null;
  const location = hasRouter ? useLocation() : ({ pathname: typeof window !== 'undefined' ? window.location.pathname : '/' } as any);
  const isCreatorArea = location.pathname.startsWith('/dashboard');
  const { isInstallable, isInstalled, isIOS, isIOSSafari, promptInstall, dismiss, dismissed } = useInstallPrompt({ enabled: isCreator && isCreatorArea });
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Only show for creators who haven't installed.
  // We show on every creator page but it is most prominent on the dashboard.
  if (!isCreator || isInstalled || dismissed || !isInstallable) return null;
  const onDashboard = isCreatorArea;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await promptInstall();
    }
  };

  return (
    <>
      {/* Floating install banner */}
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-500">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl shadow-primary/10">
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          
          <button 
            onClick={dismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Smartphone className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">
                  {isIOSSafari ? 'Add TribeYangu to Home Screen' : 'Install TribeYangu'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isIOSSafari
                    ? 'Tap the Share icon in Safari, then "Add to Home Screen" for one-tap access to earnings & notifications.'
                    : onDashboard
                      ? 'One-tap access to your creator dashboard, M-PESA payouts, and live fan alerts.'
                      : 'Install the app for instant access to your dashboard, notifications and earnings.'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button 
                onClick={handleInstall}
                size="sm"
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground gap-2 rounded-xl"
              >
                {isIOSSafari ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {isIOSSafari ? 'Show me how' : 'Install Now'}
              </Button>
              <Button
                onClick={dismiss}
                variant="ghost"
                size="sm"
                className="text-muted-foreground rounded-xl"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS installation guide */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Install on iOS</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Follow these steps to add TribeYangu to your home screen
            </div>
            
            <div className="space-y-4">
              <Step 
                number={1}
                icon={<Share className="w-5 h-5 text-primary" />}
                title="Tap the Share button"
                description="Find it at the bottom of Safari"
              />
              <Step 
                number={2}
                icon={<PlusSquare className="w-5 h-5 text-primary" />}
                title='Tap "Add to Home Screen"'
                description="Scroll down in the share menu to find it"
              />
              <Step 
                number={3}
                icon={<Download className="w-5 h-5 text-primary" />}
                title='Tap "Add"'
                description="TribeYangu will appear on your home screen"
              />
            </div>

            <Button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Step = ({ number, icon, title, description }: { number: number; icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex items-center gap-4">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <div className="font-medium text-sm text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  </div>
);

export default CreatorInstallBanner;
