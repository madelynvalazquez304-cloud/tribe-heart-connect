import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, Heart, Phone, CreditCard, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const AdminDonations = () => {
  const [search, setSearch] = useState('');

  const { data: donations, isLoading } = useQuery({
    queryKey: ['admin-donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          creator:creators(display_name, username)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['donation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('amount, status, platform_fee');
      
      if (error) throw error;
      
      const completed = data.filter(d => d.status === 'completed');
      return {
        total: completed.reduce((sum, d) => sum + Number(d.amount), 0),
        count: completed.length,
        fees: completed.reduce((sum, d) => sum + Number(d.platform_fee || 0), 0)
      };
    }
  });

  const filteredDonations = donations?.filter(d =>
    d.donor_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.creator?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.creator?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      pending: { variant: 'outline', className: 'text-amber-600 border-amber-600' },
      completed: { variant: 'default', className: 'bg-green-600' },
      failed: { variant: 'destructive', className: '' }
    };
    const v = variants[status] || variants.pending;
    return <Badge variant={v.variant} className={v.className}>{status}</Badge>;
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">All Donations</h1>
          <p className="text-muted-foreground mt-1">View all platform donations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                  <p className="text-2xl font-bold text-green-600">
                    KSh {stats?.total.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Donation Count</p>
                  <p className="text-2xl font-bold">{stats?.count || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Platform Fees</p>
                  <p className="text-2xl font-bold">
                    KSh {stats?.fees.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by donor or creator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredDonations?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No donations found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>To Creator</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Creator Gets</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations?.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{donation.donor_name || 'Anonymous'}</p>
                          {donation.donor_phone && (
                            <p className="text-xs text-muted-foreground">{donation.donor_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{donation.creator?.display_name}</p>
                          <p className="text-xs text-muted-foreground">@{donation.creator?.username}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        KSh {Number(donation.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        KSh {Number(donation.platform_fee || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        KSh {Number(donation.creator_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {donation.payment_provider === 'mpesa' ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="text-sm">M-PESA</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">PayPal</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(donation.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(donation.status || 'pending')}
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

export default AdminDonations;
