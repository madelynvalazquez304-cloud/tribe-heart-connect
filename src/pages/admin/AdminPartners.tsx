import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, DollarSign, Search, Loader2, Award, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminPartners = () => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: creators, isLoading } = useQuery({
    queryKey: ['admin-partner-creators', search],
    queryFn: async () => {
      let query = supabase
        .from('creators')
        .select('*')
        .order('total_referral_earnings', { ascending: false });

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,referral_code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['partner-stats'],
    queryFn: async () => {
      const { data: partners } = await supabase
        .from('creators')
        .select('id')
        .eq('is_partner', true);

      const { data: totalEarnings } = await supabase
        .from('referral_earnings')
        .select('amount');

      const { data: referrals } = await supabase
        .from('referrals')
        .select('id');

      return {
        totalPartners: partners?.length || 0,
        totalReferrals: referrals?.length || 0,
        totalEarnings: totalEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
      };
    }
  });

  const togglePartner = useMutation({
    mutationFn: async ({ id, isPartner }: { id: string; isPartner: boolean }) => {
      const { error } = await supabase
        .from('creators')
        .update({ is_partner: isPartner })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-creators'] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
      toast.success('Partner status updated');
    },
    onError: () => {
      toast.error('Failed to update partner status');
    }
  });

  const partners = creators?.filter(c => c.is_partner) || [];
  const nonPartners = creators?.filter(c => !c.is_partner) || [];

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Partner Program</h1>
          <p className="text-muted-foreground">Manage creator partners and referrals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Partners</p>
                  <p className="text-xl font-bold">{stats?.totalPartners || 0}</p>
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
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-xl font-bold">{stats?.totalReferrals || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid Out</p>
                  <p className="text-xl font-bold">
                    KSh {(stats?.totalEarnings || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Creators</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Partner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creators?.map((creator) => (
                    <TableRow key={creator.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {creator.display_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{creator.display_name}</p>
                            <p className="text-sm text-muted-foreground">@{creator.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-secondary rounded text-sm">
                          {creator.referral_code || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {/* Would need a count query */}
                          -
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          KSh {Number(creator.total_referral_earnings || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={creator.is_partner || false}
                          onCheckedChange={(checked) => 
                            togglePartner.mutate({ id: creator.id, isPartner: checked })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminPartners;
