import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, DollarSign, Users, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const CreatorGifts = () => {
  const { user } = useAuth();

  const { data: creator } = useQuery({
    queryKey: ['my-creator-gifts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: gifts, isLoading } = useQuery({
    queryKey: ['creator-gifts', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          *,
          gift_type:gift_type_id(name, icon, price)
        `)
        .eq('creator_id', creator!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const completedGifts = gifts?.filter(g => g.status === 'completed') || [];
  const totalEarnings = completedGifts.reduce((sum, g) => sum + Number(g.creator_amount), 0);
  const totalGifts = completedGifts.reduce((sum, g) => sum + (g.quantity || 1), 0);
  const uniqueSupporters = new Set(completedGifts.map(g => g.sender_phone || g.sender_email)).size;

  // Group gifts by type
  const giftsByType = completedGifts.reduce((acc, gift) => {
    const typeName = gift.gift_type?.name || 'Unknown';
    if (!acc[typeName]) {
      acc[typeName] = { count: 0, icon: gift.gift_type?.icon || '🎁' };
    }
    acc[typeName].count += gift.quantity || 1;
    return acc;
  }, {} as Record<string, { count: number; icon: string }>);

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Gifts Received</h1>
          <p className="text-muted-foreground">Virtual gifts from your supporters</p>
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
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gifts</p>
                  <p className="text-xl font-bold">{totalGifts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unique Gifters</p>
                  <p className="text-xl font-bold">{uniqueSupporters}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg per Gift</p>
                  <p className="text-xl font-bold">
                    KSh {totalGifts > 0 ? Math.round(totalEarnings / totalGifts) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gift Types Summary */}
        {Object.keys(giftsByType).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gift Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(giftsByType)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([name, data]) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary"
                    >
                      <span className="text-xl">{data.icon}</span>
                      <span className="font-medium">{name}</span>
                      <Badge variant="secondary">{data.count}x</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gifts List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Gifts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !gifts || gifts.length === 0 ? (
              <div className="p-8 text-center">
                <Gift className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No gifts yet</h3>
                <p className="text-sm text-muted-foreground">
                  When supporters send you gifts, they'll appear here
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {gifts.map((gift) => (
                  <div key={gift.id} className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                      <span className="text-2xl">{gift.gift_type?.icon || '🎁'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {gift.sender_name || 'Anonymous'}
                        </p>
                        <span className="text-muted-foreground">sent</span>
                        <span className="font-medium">
                          {gift.quantity}x {gift.gift_type?.name}
                        </span>
                      </div>
                      {gift.message && (
                        <p className="text-sm text-muted-foreground mt-1">
                          "{gift.message}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(gift.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        +KSh {Number(gift.creator_amount).toLocaleString()}
                      </p>
                      <Badge variant={gift.status === 'completed' ? 'default' : 'secondary'}>
                        {gift.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreatorGifts;
