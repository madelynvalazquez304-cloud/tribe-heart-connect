import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Users, Wallet, Trophy, Loader2, ExternalLink, Copy, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const CreatorDashboard = () => {
  const { user } = useAuth();
  const { data: creator, isLoading } = useMyCreator();

  const { data: balance } = useQuery({
    queryKey: ['creator-balance', creator?.id],
    queryFn: async () => {
      if (!creator) return 0;
      const { data, error } = await supabase.rpc('get_creator_balance', { _creator_id: creator.id });
      if (error) throw error;
      return data || 0;
    },
    enabled: !!creator
  });

  const { data: recentDonations } = useQuery({
    queryKey: ['recent-creator-donations', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('creator_id', creator.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const copyLink = () => {
    if (creator) {
      navigator.clipboard.writeText(`${window.location.origin}/${creator.username}`);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout type="creator">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!creator) {
    return (
      <DashboardLayout type="creator">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Complete Your Creator Profile</h2>
          <p className="text-muted-foreground mb-6">You need to set up your creator profile first.</p>
          <Link to="/become-creator">
            <Button>Set Up Profile</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Welcome, {creator.display_name}!
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">@{creator.username}</span>
              {creator.status === 'pending' && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">Pending Approval</Badge>
              )}
              {creator.status === 'approved' && creator.is_verified && (
                <Badge className="bg-blue-600">Verified</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
            <a href={`/${creator.username}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View Page
              </Button>
            </a>
          </div>
        </div>

        {creator.status === 'pending' && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <p className="text-amber-800">
                Your creator profile is pending approval. You'll be notified once it's reviewed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">KSh {Number(balance || 0).toLocaleString()}</div>
              <Link to="/dashboard/withdrawals" className="text-xs text-primary hover:underline">
                Withdraw funds →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Raised</CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {Number(creator.total_raised || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Supporters</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creator.total_supporters || 0}</div>
              <p className="text-xs text-muted-foreground">People who donated</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Votes</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creator.total_votes || 0}</div>
              <p className="text-xs text-muted-foreground">From awards</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Latest support from your fans</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDonations?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No donations yet</p>
                  <p className="text-sm">Share your page to start receiving support!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDonations?.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium">{donation.donor_name || 'Anonymous'}</p>
                        {donation.message && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            "{donation.message}"
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-green-600">
                        +KSh {Number(donation.creator_amount || donation.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your creator profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/dashboard/customize" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Customize Your Page
                </Button>
              </Link>
              <Link to="/dashboard/links" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Manage Social Links
                </Button>
              </Link>
              <Link to="/dashboard/withdrawals" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Wallet className="w-4 h-4" />
                  Request Withdrawal
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreatorDashboard;
