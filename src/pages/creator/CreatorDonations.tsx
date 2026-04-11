import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Donations</h1>
          <p className="text-sm text-muted-foreground mt-1">View all donations you've received</p>
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
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Donor</th>
                        <th className="text-left p-3 font-medium">Message</th>
                        <th className="text-left p-3 font-medium">Amount</th>
                        <th className="text-left p-3 font-medium">You Get</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations?.map((donation) => (
                        <tr key={donation.id} className="border-b last:border-0">
                          <td className="p-3">
                            <p className="font-medium">{donation.donor_name || 'Anonymous'}</p>
                            {donation.donor_phone && <p className="text-xs text-muted-foreground">{donation.donor_phone}</p>}
                          </td>
                          <td className="p-3 max-w-[200px] truncate text-muted-foreground">{donation.message || '-'}</td>
                          <td className="p-3">KSh {Number(donation.amount).toLocaleString()}</td>
                          <td className="p-3 font-semibold text-green-600">KSh {Number(donation.creator_amount || 0).toLocaleString()}</td>
                          <td className="p-3">{format(new Date(donation.created_at), 'MMM d, yyyy')}</td>
                          <td className="p-3">
                            <Badge variant={donation.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                              {donation.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden divide-y">
                  {donations?.map((donation) => (
                    <div key={donation.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{donation.donor_name || 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(donation.created_at), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-sm">+KSh {Number(donation.creator_amount || 0).toLocaleString()}</p>
                          <Badge variant={donation.status === 'completed' ? 'default' : 'outline'} className="text-[10px] mt-1">
                            {donation.status}
                          </Badge>
                        </div>
                      </div>
                      {donation.message && (
                        <p className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg line-clamp-2">"{donation.message}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreatorDonations;
