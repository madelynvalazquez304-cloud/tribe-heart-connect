import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  Copy, 
  Check, 
  Link as LinkIcon, 
  TrendingUp,
  Award,
  Sparkles,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CreatorPartners = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: creator } = useQuery({
    queryKey: ['my-creator-partner', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: referrals } = useQuery({
    queryKey: ['my-referrals', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', creator!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch referred creators separately
      const referredIds = data.map(r => r.referred_id);
      const { data: creators } = await supabase
        .from('creators')
        .select('id, display_name, username, avatar_url, total_raised')
        .in('id', referredIds);
      
      return data.map(r => ({
        ...r,
        referred: creators?.find(c => c.id === r.referred_id)
      }));
    },
    enabled: !!creator
  });

  const { data: earnings } = useQuery({
    queryKey: ['my-referral-earnings', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_earnings')
        .select('*')
        .eq('referrer_id', creator!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      
      // Fetch source creators separately
      const sourceIds = [...new Set(data.map(e => e.source_creator_id))];
      const { data: creators } = await supabase
        .from('creators')
        .select('id, display_name, username')
        .in('id', sourceIds);
      
      return data.map(e => ({
        ...e,
        source_creator: creators?.find(c => c.id === e.source_creator_id)
      }));
    },
    enabled: !!creator
  });

  const referralLink = creator?.referral_code 
    ? `${window.location.origin}/become-creator?ref=${creator.referral_code}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join TribeYangu',
        text: 'Start earning from your content! Use my referral link to join TribeYangu.',
        url: referralLink
      });
    } else {
      handleCopyLink();
    }
  };

  const directReferrals = referrals?.filter(r => r.level === 1) || [];
  const tier2Referrals = referrals?.filter(r => r.level === 2) || [];
  const tier3Referrals = referrals?.filter(r => r.level === 3) || [];

  const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Partner Program</h1>
            <p className="text-muted-foreground">Earn forever from creators you refer</p>
          </div>
          {!creator?.is_partner && (
            <Badge variant="secondary" className="px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Join the Partner Program to start earning
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-xl font-bold">KSh {totalEarnings.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Direct Referrals</p>
                  <p className="text-xl font-bold">{directReferrals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tier 2 Referrals</p>
                  <p className="text-xl font-bold">{tier2Referrals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tier 3 Referrals</p>
                  <p className="text-xl font-bold">{tier3Referrals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link to invite creators and earn 5% from their earnings forever!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={handleCopyLink} className="gap-2 shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button onClick={handleShare} className="gap-2 shrink-0">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>

            {/* Commission Tiers */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                <p className="text-2xl font-bold text-green-600">5%</p>
                <p className="text-sm text-muted-foreground">Direct Referrals</p>
                <p className="text-xs text-muted-foreground">(Level 1)</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                <p className="text-2xl font-bold text-blue-600">2.5%</p>
                <p className="text-sm text-muted-foreground">Their Referrals</p>
                <p className="text-xs text-muted-foreground">(Level 2)</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                <p className="text-2xl font-bold text-purple-600">1%</p>
                <p className="text-sm text-muted-foreground">3rd Level</p>
                <p className="text-xs text-muted-foreground">(Level 3)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="referrals">
          <TabsList>
            <TabsTrigger value="referrals">Referrals ({referrals?.length || 0})</TabsTrigger>
            <TabsTrigger value="earnings">Earnings History</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {!referrals || referrals.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold mb-2">No referrals yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Share your referral link to start earning!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {referrals.map((ref) => (
                      <div key={ref.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {ref.referred?.display_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{ref.referred?.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{ref.referred?.username}</p>
                        </div>
                        <Badge variant={ref.level === 1 ? 'default' : ref.level === 2 ? 'secondary' : 'outline'}>
                          Level {ref.level}
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            KSh {Number(ref.referred?.total_raised || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Total raised</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {!earnings || earnings.length === 0 ? (
                  <div className="p-8 text-center">
                    <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold mb-2">No earnings yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Earnings will appear here when your referrals make money
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {earnings.map((earning) => (
                      <div key={earning.id} className="p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          earning.level === 1 ? 'bg-green-100' : 
                          earning.level === 2 ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          <DollarSign className={`w-5 h-5 ${
                            earning.level === 1 ? 'text-green-600' : 
                            earning.level === 2 ? 'text-blue-600' : 'text-purple-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            From @{earning.source_creator?.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {earning.percentage}% commission (Level {earning.level})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            +KSh {Number(earning.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(earning.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CreatorPartners;
