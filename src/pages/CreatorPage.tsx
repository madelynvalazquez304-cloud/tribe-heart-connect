import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Share2, Check, ExternalLink, Phone, Gift, Wallet, Link2 } from 'lucide-react';
import GiftingPanel from '@/components/GiftingPanel';
import GiftAnimationOverlay from '@/components/GiftAnimationOverlay';
import ProfileLoadingSpinner from '@/components/ProfileLoadingSpinner';
import CampaignSection from '@/components/CampaignSection';
import MerchandiseStore from '@/components/MerchandiseStore';
import EventsSection from '@/components/EventsSection';
import PaymentProcessingModal, { PaymentStatus } from '@/components/PaymentProcessingModal';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NotFound from './NotFound';
import { toast } from 'sonner';

const donationAmounts = [100, 300, 500, 1000];

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

  const themeColor = creator.theme_primary || '#E07B4C';

  return (
    <div style={themeStyles}>
      <Header />
      <GiftAnimationOverlay creatorId={creator.id} />
      <main className="min-h-screen pt-16">
        {/* Banner with floating action icons */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          {creator.banner_url ? (
            <img src={creator.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div 
              className="w-full h-full" 
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${creator.theme_secondary || '#8B9A6B'})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          
          {/* Floating action icons on banner */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {creator.mpesa_phone && (
              <div 
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                title="Payouts enabled"
              >
                <Wallet className="w-5 h-5" style={{ color: themeColor }} />
              </div>
            )}
            {links && links.length > 0 && (
              <div 
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                title={`${links.length} links`}
              >
                <Link2 className="w-5 h-5" style={{ color: themeColor }} />
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShare} 
              className="gap-2 bg-white/90 backdrop-blur border-0 shadow-lg hover:scale-105 transition-transform"
            >
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>
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
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-primary/10 shadow-lg ring-4 ring-background">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ color: themeColor }}>
                            {creator.display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      {creator.is_verified && (
                        <div 
                          className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md" 
                          style={{ backgroundColor: creator.theme_secondary || '#8B9A6B' }}
                        >
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
                      </div>

                      {creator.tribe_name && (
                        <Badge variant="secondary" className="mb-3">{creator.tribe_name}</Badge>
                      )}

                      <p className="text-muted-foreground mb-4">{creator.bio || 'Welcome to my page!'}</p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" style={{ color: themeColor }} />
                          <span className="font-semibold">{creator.total_supporters || 0}</span>
                          <span className="text-muted-foreground">supporters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4" style={{ color: themeColor }} />
                          <span className="font-semibold">KSh {Number(creator.total_raised || 0).toLocaleString()}</span>
                          <span className="text-muted-foreground">raised</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Links - Horizontal scroll */}
              {links && links.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border shadow-sm hover:shadow-md transition-all whitespace-nowrap"
                    >
                      <span className="text-lg">{link.icon || '🔗'}</span>
                      <span className="font-medium text-sm">{link.title}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}

              {/* Events Section */}
              <EventsSection 
                creatorId={creator.id}
                creatorName={creator.display_name}
                themeColor={themeColor}
              />

              {/* Campaigns */}
              <CampaignSection 
                creatorId={creator.id}
                creatorName={creator.display_name}
                themeColor={themeColor}
              />

              {/* Merchandise Store */}
              <MerchandiseStore 
                creatorId={creator.id}
                creatorName={creator.display_name}
                themeColor={themeColor}
              />
            </div>

            {/* Support Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Gifting Panel */}
              <GiftingPanel 
                creatorId={creator.id} 
                creatorName={creator.display_name}
                themeColor={themeColor}
              />
              
              {/* Donation Card */}
              <div className="sticky top-24">
                <Card className="shadow-lg overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: themeColor }} />
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div 
                        className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" 
                        style={{ backgroundColor: themeColor }}
                      >
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
                          style={selectedAmount === amount ? { backgroundColor: themeColor } : undefined}
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
                      style={{ backgroundColor: themeColor }}
                      onClick={handleDonate}
                      disabled={initiateDonation.isPending}
                    >
                      <Heart className="w-5 h-5" />
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

      {/* Payment Processing Modal */}
      <PaymentProcessingModal
        open={paymentDialog}
        onClose={resetPayment}
        status={paymentStatus}
        type="donation"
        creatorName={creator.display_name}
        amount={customAmount ? parseInt(customAmount) : selectedAmount || 0}
        themeColor={themeColor}
      />
    </div>
  );
};

export default CreatorPage;
