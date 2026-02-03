import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Phone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentStatus = 'idle' | 'processing' | 'polling' | 'success' | 'failed';

interface PaymentProcessingModalProps {
  open: boolean;
  onClose: () => void;
  status: PaymentStatus;
  type: 'donation' | 'gift' | 'campaign' | 'purchase';
  creatorName?: string;
  amount?: number;
  giftIcon?: string;
  themeColor?: string;
}

const PaymentProcessingModal: React.FC<PaymentProcessingModalProps> = ({
  open,
  onClose,
  status,
  type,
  creatorName = 'Creator',
  amount = 0,
  giftIcon,
  themeColor = '#E07B4C'
}) => {
  const typeLabels = {
    donation: { title: 'Support', success: 'Thank You!', icon: '💚' },
    gift: { title: 'Gift', success: 'Gift Sent!', icon: giftIcon || '🎁' },
    campaign: { title: 'Contribution', success: 'Contribution Received!', icon: '🎯' },
    purchase: { title: 'Purchase', success: 'Order Confirmed!', icon: '🛍️' }
  };

  const currentType = typeLabels[type];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${themeColor} 0%, transparent 70%)` }}
        />
        
        <DialogHeader className="relative z-10">
          <DialogTitle className="text-center text-xl">
            {status === 'processing' && `Initiating ${currentType.title}...`}
            {status === 'polling' && 'Waiting for Payment...'}
            {status === 'success' && currentType.success}
            {status === 'failed' && 'Payment Failed'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {status === 'processing' && 'Sending STK Push to your phone...'}
            {status === 'polling' && 'Please complete the payment on your phone'}
            {status === 'success' && `Your ${type} means everything to ${creatorName}!`}
            {status === 'failed' && 'The payment could not be completed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 relative z-10">
          {/* Processing / Polling Animation */}
          {(status === 'processing' || status === 'polling') && (
            <div className="flex flex-col items-center">
              {/* Main spinner with icon */}
              <div className="relative">
                {/* Outer ring */}
                <div 
                  className="w-28 h-28 rounded-full border-4 border-muted animate-pulse"
                  style={{ borderTopColor: themeColor }}
                />
                {/* Middle spinner */}
                <div 
                  className="absolute inset-2 rounded-full border-4 border-transparent animate-spin"
                  style={{ 
                    borderTopColor: themeColor, 
                    borderRightColor: themeColor,
                    animationDuration: '1.5s'
                  }}
                />
                {/* Inner icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl animate-bounce">{currentType.icon}</span>
                </div>
                
                {/* Sparkle particles */}
                {status === 'polling' && (
                  <>
                    <Sparkles 
                      className="absolute -top-2 -right-2 w-5 h-5 animate-ping" 
                      style={{ color: themeColor }} 
                    />
                    <Sparkles 
                      className="absolute -bottom-1 -left-1 w-4 h-4 animate-ping" 
                      style={{ color: themeColor, animationDelay: '0.5s' }} 
                    />
                  </>
                )}
              </div>

              {/* Phone prompt indicator */}
              {status === 'polling' && (
                <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 animate-pulse">
                  <Phone className="w-4 h-4" style={{ color: themeColor }} />
                  <span className="text-sm font-medium">Check your phone for M-PESA prompt</span>
                </div>
              )}

              {/* Amount display */}
              <div 
                className="mt-4 px-6 py-2 rounded-full font-bold text-lg"
                style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
              >
                KSh {amount.toLocaleString()}
              </div>
            </div>
          )}

          {/* Success Animation */}
          {status === 'success' && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#22c55e20' }}
                >
                  <CheckCircle2 className="w-14 h-14 text-green-500 animate-[scaleIn_0.3s_ease-out]" />
                </div>
                {/* Celebration sparkles */}
                <div className="absolute -inset-4">
                  {[...Array(8)].map((_, i) => (
                    <Sparkles
                      key={i}
                      className="absolute w-4 h-4 text-yellow-400 animate-ping"
                      style={{
                        top: `${Math.sin(i * 45 * Math.PI / 180) * 40 + 40}%`,
                        left: `${Math.cos(i * 45 * Math.PI / 180) * 40 + 40}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '1s'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-3xl mb-2">{currentType.icon}</p>
                <p className="text-lg font-semibold" style={{ color: themeColor }}>
                  KSh {amount.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-14 h-14 text-destructive" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground text-center max-w-xs">
                The M-PESA payment was cancelled or timed out. Please try again.
              </p>
            </div>
          )}
        </div>

        {(status === 'success' || status === 'failed') && (
          <Button 
            onClick={onClose} 
            className="w-full relative z-10"
            style={status === 'success' ? { backgroundColor: themeColor } : undefined}
          >
            {status === 'success' ? 'Done' : 'Try Again'}
          </Button>
        )}
      </DialogContent>

      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </Dialog>
  );
};

export default PaymentProcessingModal;
