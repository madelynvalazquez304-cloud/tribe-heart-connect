import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Heart } from 'lucide-react';
import { format } from 'date-fns';

const CreatorDonations = () => {
  const { data: creator } = useMyCreator();

  const { data: donations, isLoading } = useQuery({
    queryKey: ['creator-donations', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Donations</h1>
          <p className="text-muted-foreground mt-1">View all donations you've received</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : donations?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No donations yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>You Get</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations?.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>
                        <p className="font-medium">{donation.donor_name || 'Anonymous'}</p>
                        {donation.donor_phone && (
                          <p className="text-xs text-muted-foreground">{donation.donor_phone}</p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {donation.message || '-'}
                      </TableCell>
                      <TableCell>KSh {Number(donation.amount).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        KSh {Number(donation.creator_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{format(new Date(donation.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={donation.status === 'completed' ? 'default' : 'outline'}>
                          {donation.status}
                        </Badge>
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

export default CreatorDonations;
