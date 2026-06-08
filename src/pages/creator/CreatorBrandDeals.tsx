import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Briefcase, ShieldCheck, Check, X, FileSignature, PackageCheck, Wallet } from 'lucide-react';
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

  const signContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_deals').update({
        contract_accepted_creator_at: new Date().toISOString(),
        status: 'accepted',
      }).eq('id', id);
      if (error) throw error;
      await supabase.from('brand_deal_events').insert({ deal_id: id, event_type: 'contract_signed_creator' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-brand-deals'] }); toast.success('Contract signed'); },
    onError: (e: any) => toast.error(e.message),
  });

  const markDelivered = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const auto = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('brand_deals').update({
        delivered_at: new Date().toISOString(),
        delivery_notes: notes,
        auto_release_at: auto,
        status: 'delivered',
      }).eq('id', id);
      if (error) throw error;
      await supabase.from('brand_deal_events').insert({ deal_id: id, event_type: 'delivered', details: { notes } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-brand-deals'] }); toast.success('Marked delivered — 7-day auto-release started'); },
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
            <DealCard key={d.id} deal={d}
              onAccept={() => updateStatus.mutate({ id: d.id, status: 'accepted' })}
              onDecline={() => updateStatus.mutate({ id: d.id, status: 'cancelled' })}
              onSign={() => signContract.mutate(d.id)}
              onStart={() => updateStatus.mutate({ id: d.id, status: 'in_progress' })}
              onDelivered={(notes) => markDelivered.mutate({ id: d.id, notes })}
            />
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

const DealCard = ({ deal: d, onAccept, onDecline, onSign, onStart, onDelivered }: any) => {
  const [notes, setNotes] = useState('');
  const [contractOpen, setContractOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const escrowPct = d.gross_amount ? Math.min(100, Math.round((Number(d.escrow_amount || 0) / Number(d.gross_amount)) * 100)) : 0;
  const funded = d.payment_status === 'funded' || d.payment_status === 'released';
  const released = !!d.released_at;
  const autoReleaseIn = d.auto_release_at ? Math.max(0, Math.ceil((new Date(d.auto_release_at).getTime() - Date.now()) / 86400000)) : null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-lg">{d.campaign_title}</h3>
              <Badge className={statusColors[d.status]}>{d.status}</Badge>
              <Badge variant="outline"><ShieldCheck className="w-3 h-3 mr-1" />escrow: {d.payment_status}</Badge>
              {released && <Badge className="bg-emerald-600/10 text-emerald-700">paid out</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{d.brand_name} · Invoice {d.invoice_number || d.id.slice(0,8)}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{d.currency} {Number(d.creator_amount).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">your earning</div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium flex items-center gap-1"><Wallet className="w-3 h-3" /> Escrow funded by brand</span>
            <span>{d.currency} {Number(d.escrow_amount||0).toLocaleString()} / {Number(d.gross_amount).toLocaleString()}</span>
          </div>
          <div className="h-2 rounded bg-background overflow-hidden"><div className="h-full bg-primary" style={{ width: `${escrowPct}%` }} /></div>
          {!funded && <p className="text-xs text-amber-600 mt-1">Brand has not fully funded escrow yet — you'll be notified once funds clear.</p>}
          {funded && !released && d.delivered_at && autoReleaseIn !== null && (
            <p className="text-xs text-emerald-600 mt-1">Delivered — auto-release in {autoReleaseIn} day{autoReleaseIn === 1 ? '' : 's'} if no rejection.</p>
          )}
        </div>

        {d.brief && <p className="text-sm whitespace-pre-line mb-2">{d.brief}</p>}
        {d.deliverables && <p className="text-sm mb-3"><span className="font-medium">Deliverables:</span> {d.deliverables}</p>}
        {(d.start_date || d.end_date) && (
          <p className="text-xs text-muted-foreground mb-3">{d.start_date} → {d.end_date}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {d.contract_html && (
            <Dialog open={contractOpen} onOpenChange={setContractOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><FileSignature className="w-4 h-4 mr-1" /> {d.contract_accepted_creator_at ? 'View contract' : 'Review & sign'}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Brand Deal Contract</DialogTitle></DialogHeader>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: d.contract_html }} />
                {!d.contract_accepted_creator_at && (
                  <Button onClick={() => { onSign(); setContractOpen(false); }} className="w-full mt-3">I agree & e-sign</Button>
                )}
                {d.contract_accepted_creator_at && <p className="text-xs text-emerald-600 mt-2">Signed by you on {new Date(d.contract_accepted_creator_at).toLocaleString()}</p>}
              </DialogContent>
            </Dialog>
          )}

          {d.status === 'offered' && (
            <>
              <Button size="sm" onClick={onAccept}><Check className="w-4 h-4 mr-1" /> Accept offer</Button>
              <Button size="sm" variant="outline" onClick={onDecline}><X className="w-4 h-4 mr-1" /> Decline</Button>
            </>
          )}
          {d.status === 'accepted' && funded && <Button size="sm" onClick={onStart}>Start work</Button>}
          {d.status === 'in_progress' && (
            <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><PackageCheck className="w-4 h-4 mr-1" /> Mark delivered</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit deliverables</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Add links / notes. Brand has 7 days to approve or reject; otherwise funds auto-release to you.</p>
                <Textarea rows={5} placeholder="Links to posts, files, summary…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button onClick={() => { if (!notes.trim()) return toast.error('Add delivery notes'); onDelivered(notes); setDeliverOpen(false); }} className="w-full">Confirm delivery</Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatorBrandDeals;