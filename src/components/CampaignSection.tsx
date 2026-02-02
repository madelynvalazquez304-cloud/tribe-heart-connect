import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Target, Heart, Loader2, Phone, CheckCircle2, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

interface CampaignSectionProps {
  creatorId: string;
  creatorName: string;
  themeColor?: string;
}

type PaymentStatus = 'idle' | 'processing' | 'polling' | 'success' | 'failed';

const CampaignSection: React.FC<CampaignSectionProps> = ({ creatorId, creatorName, themeColor = '#E07B4C' }) => {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [donorName, setDonorName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [recordId, setRecordId] = useState('');

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['public-campaigns', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId
  });

  const contribute = useMutation({
    mutationFn: async () => {
      if (!selectedCampaign || !amount || !phone) {
        throw new Error('Please fill all required fields');
      }

      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone,
          amount: parseInt(amount),
          creatorId,
          donorName: donorName || undefined,
          type: 'campaign',
          campaignId: selectedCampaign.id
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      setRecordId(data.recordId);
      setPaymentStatus('polling');
      
      // Start polling
      const pollInterval = setInterval(async () => {
        const response = await supabase.functions.invoke('check-payment', {
          body: { recordId: data.recordId, type: 'campaign' }
        });

        if (response.data?.status === 'completed') {
          setPaymentStatus('success');
          clearInterval(pollInterval);
        } else if (response.data?.status === 'failed') {
          setPaymentStatus('failed');
          clearInterval(pollInterval);
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (paymentStatus === 'polling') {
          setPaymentStatus('failed');
        }
      }, 120000);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
    }
  });

  const handleContribute = () => {
    if (parseInt(amount) < 10) {
      toast.error('Minimum amount is KSh 10');
      return;
    }
    setPaymentStatus('processing');
    contribute.mutate();
  };

  const resetPayment = () => {
    setPaymentStatus('idle');
    if (paymentStatus === 'success') {
      setAmount('');
      setPhone('');
      setDonorName('');
      setSelectedCampaign(null);
    }
  };

  if (isLoading || !campaigns || campaigns.length === 0) return null;

  const getProgress = (current: number, goal: number) => Math.min((current / goal) * 100, 100);

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: themeColor }} />
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5" style={{ color: themeColor }} />
          <h3 className="font-semibold">Active Campaigns</h3>
        </div>

        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-lg border overflow-hidden">
              {campaign.banner_url && (
                <img 
                  src={campaign.banner_url} 
                  alt={campaign.title} 
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-4">
                <h4 className="font-semibold mb-2">{campaign.title}</h4>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{campaign.description}</p>
                )}
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium" style={{ color: themeColor }}>
                      KSh {Number(campaign.current_amount || 0).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      of KSh {Number(campaign.goal_amount).toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={getProgress(campaign.current_amount || 0, campaign.goal_amount)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {campaign.supporter_count || 0} supporters
                    </span>
                    <span>{Math.round(getProgress(campaign.current_amount || 0, campaign.goal_amount))}%</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full gap-2 text-white"
                  style={{ backgroundColor: themeColor }}
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  <Heart className="w-4 h-4" />
                  Contribute
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Contribution Dialog */}
      <Dialog open={!!selectedCampaign && paymentStatus === 'idle'} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Support {selectedCampaign?.title}</DialogTitle>
            <DialogDescription>
              Help {creatorName} reach their goal!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">
                  KSh {Number(selectedCampaign?.current_amount || 0).toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  Goal: KSh {Number(selectedCampaign?.goal_amount || 0).toLocaleString()}
                </span>
              </div>
              <Progress 
                value={getProgress(selectedCampaign?.current_amount || 0, selectedCampaign?.goal_amount || 1)} 
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset.toString() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
                >
                  {preset}
                </Button>
              ))}
            </div>

            <Input
              type="number"
              placeholder="Custom amount (KSh)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="M-PESA number (07...)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
              />
            </div>

            <Input
              placeholder="Your name (optional)"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />

            <Button 
              className="w-full gap-2 text-white"
              style={{ backgroundColor: themeColor }}
              onClick={handleContribute}
              disabled={contribute.isPending || !amount || !phone}
            >
              {contribute.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className="w-4 h-4" />
              )}
              Contribute KSh {amount || 0}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Status Dialog */}
      <Dialog open={paymentStatus !== 'idle' && paymentStatus !== 'processing'} onOpenChange={() => resetPayment()}>
        <DialogContent>
          <div className="py-8 text-center">
            {paymentStatus === 'polling' && (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: themeColor }} />
                <p className="text-muted-foreground">Check your phone for M-PESA prompt</p>
              </>
            )}
            {paymentStatus === 'success' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Thank You!</h3>
                <p className="text-muted-foreground">Your contribution has been received!</p>
              </>
            )}
            {paymentStatus === 'failed' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Payment Failed</h3>
                <p className="text-muted-foreground">Please try again</p>
              </>
            )}
          </div>
          {(paymentStatus === 'success' || paymentStatus === 'failed') && (
            <Button onClick={resetPayment} className="w-full">
              {paymentStatus === 'success' ? 'Done' : 'Try Again'}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CampaignSection;
