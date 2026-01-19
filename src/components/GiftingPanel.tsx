import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Phone, Gift, Sparkles, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GiftingPanelProps {
  creatorId: string;
  creatorName: string;
  themeColor?: string;
}

type PaymentStatus = 'idle' | 'processing' | 'polling' | 'success' | 'failed';

const GiftingPanel: React.FC<GiftingPanelProps> = ({ creatorId, creatorName, themeColor = '#E07B4C' }) => {
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [animatingGift, setAnimatingGift] = useState<{ icon: string; x: number } | null>(null);

  const { data: giftTypes, isLoading } = useQuery({
    queryKey: ['gift-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    }
  });

  const selectedGiftData = giftTypes?.find(g => g.id === selectedGift);
  const totalAmount = selectedGiftData ? selectedGiftData.price * quantity : 0;

  const sendGift = useMutation({
    mutationFn: async () => {
      if (!selectedGift || !phoneNumber) throw new Error('Please select a gift and enter phone number');
      
      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: phoneNumber,
          amount: totalAmount,
          creatorId,
          donorName: senderName || undefined,
          message: message || undefined,
          type: 'gift',
          giftTypeId: selectedGift,
          quantity
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: (data) => {
      setRecordId(data.recordId);
      setPaymentStatus('polling');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
      setPaymentDialog(false);
    }
  });

  // Poll for payment status
  useEffect(() => {
    if (paymentStatus !== 'polling' || !recordId) return;

    const pollInterval = setInterval(async () => {
      const response = await supabase.functions.invoke('check-payment', {
        body: { recordId, type: 'gift' }
      });

      if (response.data?.status === 'completed') {
        setPaymentStatus('success');
        clearInterval(pollInterval);
        // Trigger celebration animation
        if (selectedGiftData) {
          setAnimatingGift({ icon: selectedGiftData.icon, x: Math.random() * 80 + 10 });
          setShowAnimation(true);
          setTimeout(() => setShowAnimation(false), 3000);
        }
      } else if (response.data?.status === 'failed') {
        setPaymentStatus('failed');
        clearInterval(pollInterval);
      }
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'polling') {
        setPaymentStatus('failed');
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [paymentStatus, recordId, selectedGiftData]);

  const handleSendGift = () => {
    if (!selectedGift) {
      toast.error('Please select a gift');
      return;
    }
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }
    setPaymentDialog(true);
    setPaymentStatus('processing');
    sendGift.mutate();
  };

  const resetPayment = () => {
    setPaymentDialog(false);
    setPaymentStatus('idle');
    setRecordId('');
    if (paymentStatus === 'success') {
      setPhoneNumber('');
      setSenderName('');
      setMessage('');
      setSelectedGift(null);
      setQuantity(1);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Floating animation */}
      {showAnimation && animatingGift && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-bounce"
              style={{
                left: `${Math.random() * 80 + 10}%`,
                bottom: '-50px',
                animation: `floatUp ${2 + Math.random()}s ease-out forwards`,
                animationDelay: `${i * 0.1}s`
              }}
            >
              {animatingGift.icon}
            </div>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="h-1" style={{ backgroundColor: themeColor }} />
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5" style={{ color: themeColor }} />
            <h3 className="font-semibold">Send a Gift</h3>
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>

          {/* Gift Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {giftTypes?.map((gift) => (
              <button
                key={gift.id}
                onClick={() => setSelectedGift(gift.id)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-xl transition-all hover:scale-105",
                  selectedGift === gift.id
                    ? "bg-primary/20 ring-2 ring-primary shadow-lg"
                    : "bg-secondary/50 hover:bg-secondary"
                )}
              >
                <span className="text-2xl mb-1">{gift.icon}</span>
                <span className="text-xs font-medium">{gift.name}</span>
                <span className="text-xs text-muted-foreground">KSh {gift.price}</span>
              </button>
            ))}
          </div>

          {selectedGift && (
            <>
              {/* Quantity */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Quantity:</span>
                <div className="flex items-center gap-1">
                  {[1, 5, 10, 20].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuantity(q)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                        quantity === q
                          ? "text-white"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                      style={quantity === q ? { backgroundColor: themeColor } : undefined}
                    >
                      {q}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 mb-3">
                <span className="font-medium">Total</span>
                <span className="text-lg font-bold" style={{ color: themeColor }}>
                  KSh {totalAmount.toLocaleString()}
                </span>
              </div>

              {/* Phone */}
              <div className="relative mb-3">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="M-PESA number (07...)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Name */}
              <Input
                placeholder="Your name (optional)"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="mb-3"
              />

              {/* Message */}
              <Input
                placeholder="Add a message... 💝"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mb-4"
              />

              <Button
                className="w-full gap-2 text-white"
                style={{ backgroundColor: themeColor }}
                onClick={handleSendGift}
                disabled={sendGift.isPending}
              >
                {sendGift.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    Send {quantity}x {selectedGiftData?.icon}
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={(open) => !open && resetPayment()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {paymentStatus === 'success' ? '🎉 Gift Sent!' : 
               paymentStatus === 'failed' ? 'Payment Failed' : 'Processing Payment'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {paymentStatus === 'processing' && 'Initiating M-PESA payment...'}
              {paymentStatus === 'polling' && 'Check your phone for the M-PESA prompt'}
              {paymentStatus === 'success' && `Your ${quantity}x ${selectedGiftData?.icon} has been sent to ${creatorName}!`}
              {paymentStatus === 'failed' && 'The payment could not be completed. Please try again.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6">
            {(paymentStatus === 'processing' || paymentStatus === 'polling') && (
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl">{selectedGiftData?.icon}</span>
                </div>
              </div>
            )}
            {paymentStatus === 'success' && (
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            )}
            {paymentStatus === 'failed' && (
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
            )}
          </div>

          {(paymentStatus === 'success' || paymentStatus === 'failed') && (
            <Button onClick={resetPayment} className="w-full">
              {paymentStatus === 'success' ? 'Send Another Gift' : 'Try Again'}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1.5) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default GiftingPanel;
