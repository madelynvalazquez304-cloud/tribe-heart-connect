import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Users, Wallet, Trophy, Loader2, ExternalLink, Copy, TrendingUp, ShoppingBag, Ticket, Gift, ArrowUpRight, Sparkles, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

const CreatorDashboard = () => {
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

  const { data: earningsChart } = useQuery({
    queryKey: ['creator-earnings-chart', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const since = subDays(new Date(), 14).toISOString();
      const { data, error } = await supabase
        .from('transactions')
        .select('net_amount, created_at')
        .eq('creator_id', creator.id)
        .eq('status', 'completed')
        .gte('created_at', since)
        .in('type', ['donation', 'merchandise', 'ticket', 'vote']);
      if (error) throw error;

      const days: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const day = format(subDays(new Date(), i), 'MMM d');
        days[day] = 0;
      }
      (data || []).forEach(t => {
        const day = format(new Date(t.created_at), 'MMM d');
        if (days[day] !== undefined) days[day] += Number(t.net_amount);
      });
      return Object.entries(days).map(([date, amount]) => ({ date, amount }));
    },
    enabled: !!creator
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['creator-activity', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('creator_id', creator.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const copyLink = () => {
    if (creator) {
      navigator.clipboard.writeText(`${window.location.origin}/${creator.username}`);
      toast.success('Link copied!');
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
          <h2 className="text-xl md:text-2xl font-bold mb-4">Complete Your Creator Profile</h2>
          <p className="text-muted-foreground mb-6 text-sm">You need to set up your creator profile first.</p>
          <Link to="/become-creator"><Button>Set Up Profile</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'donation': return <Heart className="w-4 h-4 text-primary" />;
      case 'merchandise': return <ShoppingBag className="w-4 h-4 text-accent" />;
      case 'ticket': return <Ticket className="w-4 h-4 text-gold" />;
      case 'vote': return <Trophy className="w-4 h-4 text-primary" />;
      default: return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'donation': return 'Donation';
      case 'merchandise': return 'Store Sale';
      case 'ticket': return 'Ticket Sale';
      case 'vote': return 'Vote';
      default: return type;
    }
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground truncate">
                Welcome, {creator.display_name.split(' ')[0]}! 👋
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">@{creator.username}</span>
              {creator.status === 'pending' && (
                <Badge variant="outline" className="text-amber-600 border-amber-600 text-[10px]">Pending</Badge>
              )}
              {creator.is_verified && (
                <Badge className="bg-accent text-accent-foreground text-[10px]">✓ Verified</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5 rounded-xl text-xs h-9">
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </Button>
            <a href={`/${creator.username}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs h-9">
                <ExternalLink className="w-3.5 h-3.5" /> View Page
              </Button>
            </a>
          </div>
        </div>

        {creator.status === 'pending' && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-amber-800 text-sm">⏳ Your creator profile is pending approval.</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="pt-4 pb-3 px-3 sm:px-4">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mb-1.5" />
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Balance</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600 font-display">KSh {Number(balance || 0).toLocaleString()}</p>
              <Link to="/dashboard/withdrawals" className="text-[10px] sm:text-xs text-green-600 hover:underline flex items-center gap-1 mt-1">
                Withdraw <ArrowUpRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-4 pb-3 px-3 sm:px-4">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary mb-1.5" />
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total Raised</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground font-display">KSh {Number(creator.total_raised || 0).toLocaleString()}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Lifetime</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-accent/10 to-accent/5">
            <CardContent className="pt-4 pb-3 px-3 sm:px-4">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent mb-1.5" />
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Supporters</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground font-display">{creator.total_supporters || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">People</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-gold/10 to-gold/5">
            <CardContent className="pt-4 pb-3 px-3 sm:px-4">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-gold mb-1.5" />
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Votes</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground font-display">{creator.total_votes || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Awards</p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Chart */}
        {earningsChart && earningsChart.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    Earnings (14 days)
                  </CardTitle>
                  <CardDescription className="text-xs">Daily income</CardDescription>
                </div>
                <Link to="/dashboard/analytics">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs h-8">
                    Details <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <div className="h-36 sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earningsChart}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(350, 78%, 55%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(350, 78%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(215, 12%, 48%)" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 12%, 48%)" width={40} />
                    <Tooltip formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Earnings']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(220, 15%, 90%)', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(350, 78%, 55%)" fill="url(#earningsGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="px-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4">
                {(!recentActivity || recentActivity.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-sm">No activity yet</p>
                    <p className="text-xs mt-1">Share your page to start receiving support!</p>
                    <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={copyLink}>
                      <Copy className="w-3 h-3 mr-1.5" /> Copy Your Link
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center shadow-sm flex-shrink-0">
                          {getActivityIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-xs sm:text-sm truncate">{tx.description || getActivityLabel(tx.type)}</p>
                            <Badge variant="secondary" className="text-[9px] sm:text-[10px] shrink-0 hidden sm:inline-flex">{getActivityLabel(tx.type)}</Badge>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <p className="font-semibold text-green-600 text-xs sm:text-sm whitespace-nowrap">
                          +KSh {Number(tx.net_amount).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="h-fit">
            <CardHeader className="px-4 pb-2">
              <CardTitle className="text-sm sm:text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-3 sm:px-4">
              {[
                { label: 'Customize Page', icon: Sparkles, href: '/dashboard/customize', color: 'text-primary' },
                { label: 'Social Links', icon: ExternalLink, href: '/dashboard/links', color: 'text-accent' },
                { label: 'Withdraw Funds', icon: Wallet, href: '/dashboard/withdrawals', color: 'text-green-600' },
                { label: 'Create Event', icon: Ticket, href: '/dashboard/events', color: 'text-gold' },
                { label: 'Manage Merch', icon: ShoppingBag, href: '/dashboard/merchandise', color: 'text-primary' },
                { label: 'New Campaign', icon: Gift, href: '/dashboard/campaigns', color: 'text-accent' },
                { label: 'View Analytics', icon: BarChart3, href: '/dashboard/analytics', color: 'text-muted-foreground' },
              ].map((action) => (
                <Link key={action.href} to={action.href} className="block">
                  <Button variant="ghost" className="w-full justify-start gap-2.5 h-10 rounded-xl hover:bg-secondary/80 text-xs sm:text-sm">
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                    {action.label}
                    <ArrowUpRight className="w-3 h-3 ml-auto text-muted-foreground" />
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreatorDashboard;
