import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Briefcase, ShieldCheck, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  offered: 'bg-blue-500/10 text-blue-600',
  accepted: 'bg-emerald-500/10 text-emerald-600',
  in_progress: 'bg-amber-500/10 text-amber-600',
  delivered: 'bg-purple-500/10 text-purple-600',
  paid: 'bg-emerald-600/10 text-emerald-700',
  cancelled: 'bg-destructive/10 text-destructive',
};

const CreatorBrandDeals = () => {
  const qc = useQueryClient();

  const { data: deals, isLoading } = useQuery({
    queryKey: ['my-brand-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_deals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { error } = await supabase.from('brand_deals').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-brand-deals'] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Brand Deals</h1>
            <p className="text-sm text-muted-foreground">Paid partnerships matched to you. Payment is held in escrow until you deliver.</p>
          </div>
        </div>

        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : !deals || deals.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No brand deals yet</h3>
              <p className="text-sm text-muted-foreground">Once advertisers match with you, contracts will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          deals.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{d.campaign_title}</h3>
                      <Badge className={statusColors[d.status]}>{d.status}</Badge>
                      <Badge variant="outline"><ShieldCheck className="w-3 h-3 mr-1" />escrow: {d.payment_status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{d.brand_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{d.currency} {Number(d.creator_amount).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">your earning</div>
                  </div>
                </div>
                {d.brief && <p className="text-sm whitespace-pre-line mb-2">{d.brief}</p>}
                {d.deliverables && <p className="text-sm mb-3"><span className="font-medium">Deliverables:</span> {d.deliverables}</p>}
                {(d.start_date || d.end_date) && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {d.start_date} → {d.end_date}
                  </p>
                )}
                {d.status === 'offered' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: d.id, status: 'accepted' })}>
                      <Check className="w-4 h-4" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: d.id, status: 'cancelled' })}>
                      <X className="w-4 h-4" /> Decline
                    </Button>
                  </div>
                )}
                {d.status === 'accepted' && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ id: d.id, status: 'in_progress' })}>Mark in progress</Button>
                )}
                {d.status === 'in_progress' && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ id: d.id, status: 'delivered' })}>Mark delivered</Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreatorBrandDeals;