import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Heart, Users, Share2, Check, ExternalLink, Loader2, Phone, AlertCircle, CheckCircle2, XCircle, Gift } from 'lucide-react';
import GiftingPanel from '@/components/GiftingPanel';
import GiftAnimationOverlay from '@/components/GiftAnimationOverlay';
import ProfileLoadingSpinner from '@/components/ProfileLoadingSpinner';
import CampaignSection from '@/components/CampaignSection';
import MerchandiseStore from '@/components/MerchandiseStore';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NotFound from './NotFound';
import { toast } from 'sonner';

const donationAmounts = [100, 300, 500, 1000];

type PaymentStatus = 'idle' | 'processing' | 'polling' | 'success' | 'failed';

const CreatorPage = () => {
  const { username } = useParams();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(300);
  const [customAmount, setCustomAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [recordId, setRecordId] = useState('');

  const { data: creator, isLoading, error } = useQuery({
    queryKey: ['creator', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select(`
          *,
          category:creator_categories(name, icon)
        `)
        .eq('username', username)
        .eq('status', 'approved')
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!username
  });

  const { data: links } = useQuery({
    queryKey: ['creator-links', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_links')
        .select('*')
        .eq('creator_id', creator!.id)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const { data: recentDonations } = useQuery({
    queryKey: ['recent-public-donations', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('donor_name, amount, message, created_at, is_anonymous')
        .eq('creator_id', creator!.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const initiateDonation = useMutation({
    mutationFn: async () => {
      const amount = customAmount ? parseInt(customAmount) : selectedAmount;
      if (!amount || amount < 10) throw new Error('Minimum amount is KSh 10');
      if (!phoneNumber) throw new Error('Phone number is required');

      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: phoneNumber,
          amount,
          creatorId: creator!.id,
          donorName: donorName || undefined,
          message: message || undefined,
          type: 'donation'
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: (data) => {
      setCheckoutRequestId(data.checkoutRequestId);
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
        body: { recordId, type: 'donation' }
      });

      if (response.data?.status === 'completed') {
        setPaymentStatus('success');
        clearInterval(pollInterval);
      } else if (response.data?.status === 'failed') {
        setPaymentStatus('failed');
        clearInterval(pollInterval);
      }
    }, 3000);

    // Stop polling after 2 minutes
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
  }, [paymentStatus, recordId]);

  const handleDonate = () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;
    if (!amount || amount < 10) {
      toast.error('Minimum amount is KSh 10');
      return;
    }
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }
    setPaymentDialog(true);
    setPaymentStatus('processing');
    initiateDonation.mutate();
  };

  const resetPayment = () => {
    setPaymentDialog(false);
    setPaymentStatus('idle');
    setCheckoutRequestId('');
    setRecordId('');
    if (paymentStatus === 'success') {
      setPhoneNumber('');
      setDonorName('');
      setMessage('');
      setSelectedAmount(300);
      setCustomAmount('');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Support ${creator?.display_name} on TribeYangu`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-20">
          <ProfileLoadingSpinner color={undefined} />
        </div>
        <Footer />
      </>
    );
  }

  if (error || !creator) {
    return <NotFound />;
  }

  // Apply creator theme
  const themeStyles = {
    '--creator-primary': creator.theme_primary || '#E07B4C',
    '--creator-secondary': creator.theme_secondary || '#8B9A6B',
    '--creator-accent': creator.theme_accent || '#D4A853',
  } as React.CSSProperties;

  return (
    <div style={themeStyles}>
      <Header />
      <GiftAnimationOverlay creatorId={creator.id} />
      <main className="min-h-screen pt-16">
        {/* Banner */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          {creator.banner_url ? (
            <img src={creator.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div 
              className="w-full h-full" 
              style={{ background: `linear-gradient(135deg, ${creator.theme_primary || '#E07B4C'}, ${creator.theme_secondary || '#8B9A6B'})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-primary/10 shadow-lg">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary">
                            {creator.display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      {creator.is_verified && (
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: creator.theme_secondary || '#8B9A6B' }}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h1 className="font-display text-2xl md:text-3xl font-bold">{creator.display_name}</h1>
                          <p className="text-muted-foreground">@{creator.username}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                          <Share2 className="w-4 h-4" /> Share
                        </Button>
                      </div>

                      {creator.tribe_name && (
                        <Badge variant="secondary" className="mb-3">{creator.tribe_name}</Badge>
                      )}

                      <p className="text-muted-foreground mb-4">{creator.bio || 'Welcome to my page!'}</p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" style={{ color: creator.theme_primary }} />
                          <span className="font-semibold">{creator.total_supporters || 0}</span>
                          <span className="text-muted-foreground">supporters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4" style={{ color: creator.theme_primary }} />
                          <span className="font-semibold">KSh {Number(creator.total_raised || 0).toLocaleString()}</span>
                          <span className="text-muted-foreground">raised</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Links */}
              {links && links.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-semibold mb-4">Links</h2>
                    <div className="space-y-2">
                      {links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <span className="text-xl">{link.icon || '🔗'}</span>
                          <span className="font-medium flex-1">{link.title}</span>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Supporters */}
              {recentDonations && recentDonations.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-semibold mb-4">Recent Supporters</h2>
                    <div className="space-y-3">
                      {recentDonations.map((donation, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: creator.theme_primary + '20', color: creator.theme_primary }}>
                            {donation.is_anonymous ? '?' : (donation.donor_name?.charAt(0) || '?')}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{donation.is_anonymous ? 'Anonymous' : (donation.donor_name || 'Someone')}</p>
                              <p className="font-semibold" style={{ color: creator.theme_primary }}>KSh {Number(donation.amount).toLocaleString()}</p>
                            </div>
                            {donation.message && (
                              <p className="text-sm text-muted-foreground mt-1">"{donation.message}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Donation & Gifting Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Gifting Panel */}
              <GiftingPanel 
                creatorId={creator.id} 
                creatorName={creator.display_name}
                themeColor={creator.theme_primary || '#E07B4C'}
              />

              {/* Campaigns */}
              <CampaignSection 
                creatorId={creator.id}
                creatorName={creator.display_name}
                themeColor={creator.theme_primary || '#E07B4C'}
              />

              {/* Merchandise Store */}
              <MerchandiseStore 
                creatorId={creator.id}
                creatorName={creator.display_name}
                themeColor={creator.theme_primary || '#E07B4C'}
              />
              
              <div className="sticky top-24">
                <Card className="shadow-lg overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: creator.theme_primary }} />
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: creator.theme_primary }}>
                        <Heart className="w-7 h-7 text-white" />
                      </div>
                      <h2 className="font-display text-xl font-bold">
                        Support {creator.display_name.split(' ')[0]}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your support means everything
                      </p>
                    </div>

                    {/* Amount Selection */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {donationAmounts.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                          className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                            selectedAmount === amount
                              ? 'text-white shadow-lg'
                              : 'bg-secondary text-foreground hover:bg-secondary/80'
                          }`}
                          style={selectedAmount === amount ? { backgroundColor: creator.theme_primary } : undefined}
                        >
                          KSh {amount}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount */}
                    <Input
                      type="number"
                      placeholder="Custom amount (KSh)"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                      className="mb-3"
                    />

                    {/* Phone Number */}
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
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="mb-3"
                    />

                    {/* Message */}
                    <Textarea
                      placeholder="Leave a message... 💚 (optional)"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="mb-4"
                    />

                    {/* Submit */}
                    <Button
                      className="w-full gap-2 text-white"
                      size="lg"
                      style={{ backgroundColor: creator.theme_primary }}
                      onClick={handleDonate}
                      disabled={initiateDonation.isPending}
                    >
                      {initiateDonation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Heart className="w-5 h-5" />
                      )}
                      Support with KSh {customAmount || selectedAmount || 0}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground mt-4">
                      Secure payment via M-PESA STK Push
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={(open) => !open && resetPayment()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentStatus === 'processing' && 'Initiating Payment...'}
              {paymentStatus === 'polling' && 'Waiting for Payment...'}
              {paymentStatus === 'success' && 'Payment Successful!'}
              {paymentStatus === 'failed' && 'Payment Failed'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-8 text-center">
            {(paymentStatus === 'processing' || paymentStatus === 'polling') && (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  {paymentStatus === 'processing' 
                    ? 'Sending STK Push to your phone...'
                    : 'Please complete the payment on your phone'}
                </p>
                {paymentStatus === 'polling' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Check your phone for the M-PESA prompt
                  </p>
                )}
              </>
            )}

            {paymentStatus === 'success' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Thank You!</h3>
                <p className="text-muted-foreground">
                  Your support means everything to {creator.display_name}! 💚
                </p>
              </>
            )}

            {paymentStatus === 'failed' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Payment Failed</h3>
                <p className="text-muted-foreground">
                  The payment was not completed. Please try again.
                </p>
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
    </div>
  );
};

export default CreatorPage;
