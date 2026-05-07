import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Target, Heart, Loader2, Phone, Users, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import PaymentProcessingModal, { PaymentStatus } from './PaymentProcessingModal';

interface CampaignSectionProps {
  creatorId: string;
  creatorName: string;
  themeColor?: string;
}

const CampaignSection: React.FC<CampaignSectionProps> = ({ creatorId, creatorName, themeColor = '#E07B4C' }) => {
  const queryClient = useQueryClient();
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
      // Defaulting layer: ensure numeric fields are always safe to render.
      return (data || []).map((c: any) => ({
        ...c,
        current_amount: Number(c?.current_amount ?? 0) || 0,
        goal_amount: Number(c?.goal_amount ?? 0) || 0,
        supporter_count: Number(c?.supporter_count ?? 0) || 0,
      }));
    },
    enabled: !!creatorId
  });

  // Fetch real contribution counts for accuracy
  const { data: contributionStats } = useQuery({
    queryKey: ['campaign-contribution-stats', creatorId],
    queryFn: async () => {
      if (!campaigns?.length) return {};
      const stats: Record<string, { total: number; supporters: number }> = {};
      for (const campaign of campaigns) {
        const { data } = await supabase
          .from('campaign_contributions')
          .select('amount, donor_phone')
          .eq('campaign_id', campaign.id)
          .eq('status', 'completed');
        
        const total = (data || []).reduce((sum, c) => sum + Number(c.amount), 0);
        const uniquePhones = new Set((data || []).map(c => c.donor_phone).filter(Boolean));
        stats[campaign.id] = { total, supporters: uniquePhones.size || (data?.length || 0) };
      }
      return stats;
    },
    enabled: !!campaigns?.length
  });

  const contribute = useMutation({
    mutationFn: async () => {
      if (!selectedCampaign || !amount || !phone) {
        throw new Error('Please fill all required fields');
      }
      const parsedAmount = parseInt(amount);
      if (isNaN(parsedAmount) || parsedAmount < 10) {
        throw new Error('Minimum contribution is KSh 10');
      }
      if (!/^(?:254|0)\d{9}$/.test(phone.replace(/\s/g, ''))) {
        throw new Error('Enter a valid M-PESA number (e.g. 0712345678)');
      }

      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: phone.replace(/\s/g, ''),
          amount: parsedAmount,
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
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
    }
  });

  const handleContribute = () => {
    setPaymentStatus('processing');
    contribute.mutate();
  };

  // Poll the campaign_contributions row directly to detect success/failure.
  // The modal's onComplete is best-effort; this is the source of truth.
  useEffect(() => {
    if (paymentStatus !== 'polling' || !recordId) return;
    const poll = setInterval(async () => {
      const { data } = await supabase.functions.invoke('check-payment', {
        body: { recordId, type: 'campaign' },
      });
      const s = (data as any)?.status;
      if (s === 'completed') { setPaymentStatus('success'); clearInterval(poll); }
      else if (s === 'failed' || s === 'cancelled') { setPaymentStatus('failed'); clearInterval(poll); }
    }, 3000);
    const timeout = setTimeout(() => {
      clearInterval(poll);
      setPaymentStatus((cur) => (cur === 'polling' ? 'failed' : cur));
    }, 120000);
    return () => { clearInterval(poll); clearTimeout(timeout); };
  }, [paymentStatus, recordId]);

  const resetPayment = () => {
    if (paymentStatus === 'success') {
      queryClient.invalidateQueries({ queryKey: ['public-campaigns', creatorId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-contribution-stats', creatorId] });
      setAmount('');
      setPhone('');
      setDonorName('');
      setSelectedCampaign(null);
    }
    setPaymentStatus('idle');
    setRecordId('');
  };

  if (isLoading || !campaigns || campaigns.length === 0) return null;

  const getRealAmount = (campaign: any | null | undefined) => {
    if (!campaign) return 0;
    return contributionStats?.[campaign.id]?.total ?? Number(campaign.current_amount || 0);
  };

  const getRealSupporters = (campaign: any | null | undefined) => {
    if (!campaign) return 0;
    return contributionStats?.[campaign.id]?.supporters ?? (campaign.supporter_count || 0);
  };

  const getProgress = (current: number, goal: number) => {
    if (goal <= 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const getDaysLeft = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const selectedAmountRaised = getRealAmount(selectedCampaign);
  const selectedGoalAmount = Number(selectedCampaign?.goal_amount || 0);

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: themeColor }} />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5" style={{ color: themeColor }} />
          <h3 className="font-semibold">Active Campaigns</h3>
          <Badge variant="secondary">{campaigns.length}</Badge>
        </div>

        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const realAmount = getRealAmount(campaign);
            const realSupporters = getRealSupporters(campaign);
            const progress = getProgress(realAmount, campaign.goal_amount);
            const daysLeft = getDaysLeft(campaign.end_date);
            
            return (
              <div key={campaign.id} className="rounded-lg border overflow-hidden">
                {campaign.banner_url && (
                  <img 
                    src={campaign.banner_url} 
                    alt={campaign.title} 
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold">{campaign.title}</h4>
                    {progress >= 100 && (
                      <Badge className="bg-green-600 text-white shrink-0">Goal Reached! 🎉</Badge>
                    )}
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{campaign.description}</p>
                  )}
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold" style={{ color: themeColor }}>
                        KSh {realAmount.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        of KSh {Number(campaign.goal_amount).toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2.5" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {realSupporters} supporter{realSupporters !== 1 ? 's' : ''}
                      </span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                      {daysLeft !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Ended'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full gap-2 text-white"
                    style={{ backgroundColor: themeColor }}
                    onClick={() => setSelectedCampaign(campaign)}
                    disabled={daysLeft === 0}
                  >
                    <Heart className="w-4 h-4" />
                    {daysLeft === 0 ? 'Campaign Ended' : 'Contribute'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Contribution Dialog */}
      <Dialog open={!!selectedCampaign && paymentStatus === 'idle'} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-sm">
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
                  KSh {selectedAmountRaised.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  Goal: KSh {selectedGoalAmount.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={getProgress(selectedAmountRaised, selectedGoalAmount || 1)} 
                className="h-2"
              />
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span>{getRealSupporters(selectedCampaign)} supporters so far</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset.toString() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
                >
                  {preset >= 1000 ? `${preset/1000}K` : preset}
                </Button>
              ))}
            </div>

            <Input
              type="number"
              placeholder="Custom amount (min KSh 10)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
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
              disabled={contribute.isPending || !amount || !phone || parseInt(amount) < 10}
            >
              {contribute.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className="w-4 h-4" />
              )}
              Contribute KSh {parseInt(amount) >= 10 ? parseInt(amount).toLocaleString() : '0'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentProcessingModal
        isOpen={paymentStatus !== 'idle'}
        status={paymentStatus}
        recordId={recordId}
        type="campaign"
        themeColor={themeColor}
        amount={parseInt(amount) || 0}
        onComplete={(success) => setPaymentStatus(success ? 'success' : 'failed')}
        onClose={resetPayment}
        successMessage={`Your contribution to "${selectedCampaign?.title}" has been received! Thank you!`}
      />
    </Card>
  );
};

export default CampaignSection;
