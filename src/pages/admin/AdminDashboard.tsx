import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Heart, DollarSign, Trophy, Loader2, TrendingUp, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [creators, donations, withdrawals, votes] = await Promise.all([
        supabase.from('creators').select('id, status', { count: 'exact' }),
        supabase.from('donations').select('amount, status', { count: 'exact' }),
        supabase.from('withdrawals').select('amount, status', { count: 'exact' }),
        supabase.from('votes').select('amount_paid, status', { count: 'exact' })
      ]);

      const pendingCreators = creators.data?.filter(c => c.status === 'pending').length || 0;
      const pendingWithdrawals = withdrawals.data?.filter(w => w.status === 'pending').length || 0;
      
      const totalDonations = donations.data
        ?.filter(d => d.status === 'completed')
        .reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      
      const totalVotes = votes.data
        ?.filter(v => v.status === 'confirmed')
        .reduce((sum, v) => sum + Number(v.amount_paid), 0) || 0;

      return {
        totalCreators: creators.count || 0,
        pendingCreators,
        totalDonations,
        pendingWithdrawals,
        totalVotes,
        donationCount: donations.count || 0
      };
    }
  });

  const { data: recentDonations } = useQuery({
    queryKey: ['recent-donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          creator:creators(display_name, username)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: pendingCreatorsList } = useQuery({
    queryKey: ['pending-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <DashboardLayout type="admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage your platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Creators</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCreators}</div>
              {stats?.pendingCreators ? (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {stats.pendingCreators} pending approval
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Donations</CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {stats?.totalDonations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.donationCount} donations
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Withdrawals</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingWithdrawals}</div>
              {stats?.pendingWithdrawals ? (
                <Link to="/admin/withdrawals" className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline">
                  Review now
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">All caught up!</p>
              )}
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Voting Revenue</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {stats?.totalVotes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From all awards
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Creators */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Creators waiting for review</CardDescription>
              </div>
              <Link to="/admin/creators">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pendingCreatorsList?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No pending creators</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingCreatorsList?.map((creator) => (
                    <div key={creator.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {creator.display_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{creator.display_name}</p>
                          <p className="text-xs text-muted-foreground">@{creator.username}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Donations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Donations</CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </div>
              <Link to="/admin/donations">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentDonations?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No donations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDonations?.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium text-foreground">
                          {donation.donor_name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          to @{donation.creator?.username}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          KSh {Number(donation.amount).toLocaleString()}
                        </p>
                        <Badge 
                          variant={donation.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {donation.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin/creators">
                <Button variant="outline" className="gap-2">
                  <Users className="w-4 h-4" />
                  Manage Creators
                </Button>
              </Link>
              <Link to="/admin/awards">
                <Button variant="outline" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Manage Awards
                </Button>
              </Link>
              <Link to="/admin/payments">
                <Button variant="outline" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment Config
                </Button>
              </Link>
              <Link to="/admin/settings">
                <Button variant="outline" className="gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Platform Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
