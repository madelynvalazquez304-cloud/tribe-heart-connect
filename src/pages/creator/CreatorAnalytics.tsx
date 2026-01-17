import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Users, Heart, Eye, DollarSign, Calendar } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

const CreatorAnalytics = () => {
  const { data: creator } = useMyCreator();

  const { data: donationStats, isLoading } = useQuery({
    queryKey: ['creator-donation-stats', creator?.id],
    queryFn: async () => {
      if (!creator) return null;
      
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data: donations, error } = await supabase
        .from('donations')
        .select('amount, creator_amount, created_at, status')
        .eq('creator_id', creator.id)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at');
      
      if (error) throw error;

      // Calculate daily totals
      const dailyTotals: Record<string, number> = {};
      donations?.forEach(d => {
        const day = format(new Date(d.created_at), 'MMM d');
        dailyTotals[day] = (dailyTotals[day] || 0) + Number(d.creator_amount || d.amount);
      });

      return {
        donations: donations || [],
        totalAmount: donations?.reduce((sum, d) => sum + Number(d.creator_amount || d.amount), 0) || 0,
        count: donations?.length || 0,
        dailyTotals,
        avgDonation: donations?.length ? 
          donations.reduce((sum, d) => sum + Number(d.creator_amount || d.amount), 0) / donations.length : 0
      };
    },
    enabled: !!creator
  });

  const { data: linkClicks } = useQuery({
    queryKey: ['creator-link-clicks', creator?.id],
    queryFn: async () => {
      if (!creator) return 0;
      const { data, error } = await supabase
        .from('creator_links')
        .select('clicks')
        .eq('creator_id', creator.id);
      if (error) throw error;
      return data?.reduce((sum, l) => sum + (l.clicks || 0), 0) || 0;
    },
    enabled: !!creator
  });

  if (isLoading) {
    return (
      <DashboardLayout type="creator">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your performance over the last 30 days</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">30-Day Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                KSh {donationStats?.totalAmount.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {donationStats?.count || 0} donations
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Donation</CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KSh {Math.round(donationStats?.avgDonation || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per donation</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Supporters</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creator?.total_supporters || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Link Clicks</CardTitle>
              <Eye className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{linkClicks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total clicks</p>
            </CardContent>
          </Card>
        </div>

        {/* Simple Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Donation Trend
            </CardTitle>
            <CardDescription>Daily earnings over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(donationStats?.dailyTotals || {}).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No donation data yet</p>
                <p className="text-sm">Share your page to start receiving donations!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(donationStats?.dailyTotals || {}).slice(-7).map(([day, amount]) => (
                  <div key={day} className="flex items-center gap-4">
                    <span className="w-16 text-sm text-muted-foreground">{day}</span>
                    <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                        style={{ 
                          width: `${Math.min(100, (amount / Math.max(...Object.values(donationStats?.dailyTotals || {}))) * 100)}%` 
                        }}
                      />
                    </div>
                    <span className="w-24 text-sm font-medium text-right">
                      KSh {amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Lifetime Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">Total Raised</span>
                <span className="font-bold">KSh {Number(creator?.total_raised || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">Total Supporters</span>
                <span className="font-bold">{creator?.total_supporters || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">Total Votes</span>
                <span className="font-bold">{creator?.total_votes || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="font-medium text-sm">Share Regularly</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creators who share their page 3+ times a week see 40% more donations.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="font-medium text-sm">Update Your Bio</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A compelling bio helps fans connect with you and your mission.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="font-medium text-sm">Add Social Links</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connect all your platforms so fans can follow you everywhere.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreatorAnalytics;
