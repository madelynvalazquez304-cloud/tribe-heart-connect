import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Briefcase, Plus, ShieldCheck, FileSignature, Wallet, Send, RotateCcw, Link as LinkIcon, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generateContractHtml } from '@/lib/brandContract';

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600',
  reviewing: 'bg-amber-500/10 text-amber-600',
  matched: 'bg-emerald-500/10 text-emerald-600',
  closed: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive/10 text-destructive',
  offered: 'bg-blue-500/10 text-blue-600',
  accepted: 'bg-emerald-500/10 text-emerald-600',
  in_progress: 'bg-amber-500/10 text-amber-600',
  delivered: 'bg-purple-500/10 text-purple-600',
  paid: 'bg-emerald-600/10 text-emerald-700',
  cancelled: 'bg-destructive/10 text-destructive',
};

const AdminBrandDeals = () => {
  const qc = useQueryClient();

  const { data: requests, isLoading: lr } = useQuery({
    queryKey: ['brand-deal-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_deal_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: deals, isLoading: ld } = useQuery({
    queryKey: ['brand-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_deals')
        .select('*, creator:creators(display_name, username, avatar_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: creators } = useQuery({
    queryKey: ['creators-min'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, username, display_name')
        .eq('status', 'approved')
        .order('display_name');
      if (error) throw error;
      return data;
    },
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status, admin_notes }: any) => {
      const { error } = await supabase
        .from('brand_deal_requests')
        .update({ status, admin_notes })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand-deal-requests'] });
      toast.success('Request updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createDeal = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from('brand_deals').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand-deals'] });
      toast.success('Brand deal created and offered to creator');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await supabase.from('brand_deals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand-deals'] });
      toast.success('Deal updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generateContract = useMutation({
    mutationFn: async (d: any) => {
      const inv = d.invoice_number || `TY-BD-${new Date().getFullYear()}-${d.id.slice(0,6).toUpperCase()}`;
      const html = generateContractHtml({
        brand_name: d.brand_name, brand_contact_name: d.brand_contact_name, brand_email: d.brand_email,
        creator_display_name: d.creator?.display_name || '', creator_username: d.creator?.username,
        campaign_title: d.campaign_title, brief: d.brief, deliverables: d.deliverables,
        gross_amount: d.gross_amount, creator_amount: d.creator_amount, platform_fee: d.platform_fee,
        currency: d.currency, start_date: d.start_date, end_date: d.end_date, invoice_number: inv,
      });
      const { error } = await supabase.from('brand_deals').update({
        contract_html: html, invoice_number: inv,
        contract_accepted_brand_at: new Date().toISOString(),
      }).eq('id', d.id);
      if (error) throw error;
      await supabase.from('brand_deal_events').insert({ deal_id: d.id, event_type: 'contract_generated', details: { invoice_number: inv } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand-deals'] }); toast.success('Contract generated & invoice issued'); },
    onError: (e: any) => toast.error(e.message),
  });

  const release = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('release_brand_deal', { _deal_id: id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand-deals'] }); toast.success('Funds released to creator'); },
    onError: (e: any) => toast.error(e.message),
  });

  const refund = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_deals').update({ status: 'cancelled', payment_status: 'refunded' }).eq('id', id);
      if (error) throw error;
      await supabase.from('brand_deal_events').insert({ deal_id: id, event_type: 'refunded' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand-deals'] }); toast.success('Marked refunded'); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Brand Deals</h1>
            <p className="text-sm text-muted-foreground">Review advertiser briefs and assign contracts to creators.</p>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">Advertiser Requests ({requests?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="deals">Active Deals ({deals?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="payments">Brand Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4 mt-4">
            {lr ? <Loader2 className="w-6 h-6 animate-spin" /> : requests?.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No advertiser requests yet.</CardContent></Card>
            ) : requests?.map((r: any) => (
              <RequestCard
                key={r.id}
                request={r}
                creators={creators || []}
                onStatus={(status, admin_notes) => updateRequestStatus.mutate({ id: r.id, status, admin_notes })}
                onCreate={(payload) => createDeal.mutate({ ...payload, request_id: r.id })}
              />
            ))}
          </TabsContent>

          <TabsContent value="deals" className="space-y-4 mt-4">
            {ld ? <Loader2 className="w-6 h-6 animate-spin" /> : deals?.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No active deals yet.</CardContent></Card>
            ) : deals?.map((d: any) => (
              <DealRow key={d.id} d={d}
                onUpdate={(patch) => updateDeal.mutate({ id: d.id, ...patch })}
                onGenerate={() => generateContract.mutate(d)}
                onRelease={() => release.mutate(d.id)}
                onRefund={() => refund.mutate(d.id)}
              />
            ))}
          </TabsContent>

          <TabsContent value="payments" className="space-y-4 mt-4">
            <PaymentsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

const DealRow = ({ d, onUpdate, onGenerate, onRelease, onRefund }: any) => {
  const payLink = `${window.location.origin}/brand-deals/pay/${d.id}`;
  const pct = d.gross_amount ? Math.min(100, Math.round((Number(d.escrow_amount||0)/Number(d.gross_amount))*100)) : 0;
  const canRelease = d.payment_status === 'funded' && !d.released_at;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-lg">{d.campaign_title}</h3>
              <Badge className={statusColors[d.status]}>{d.status}</Badge>
              <Badge variant="outline"><ShieldCheck className="w-3 h-3 mr-1" />{d.payment_status}</Badge>
              {d.invoice_number && <Badge variant="outline">{d.invoice_number}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{d.brand_name} → @{d.creator?.username} · {d.currency} {Number(d.gross_amount).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Select value={d.status} onValueChange={(v) => onUpdate({ status: v })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['offered','accepted','in_progress','delivered','paid','cancelled'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium flex items-center gap-1"><Wallet className="w-3 h-3" /> Escrow funded</span>
            <span>{d.currency} {Number(d.escrow_amount||0).toLocaleString()} / {Number(d.gross_amount).toLocaleString()}</span>
          </div>
          <div className="h-2 rounded bg-background overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onGenerate}><FileSignature className="w-4 h-4 mr-1" />{d.contract_html ? 'Re-generate contract' : 'Generate contract'}</Button>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(payLink); toast.success('Brand payment link copied'); }}>
            <LinkIcon className="w-4 h-4 mr-1" /> Copy pay link
          </Button>
          <Button size="sm" disabled={!canRelease} onClick={onRelease}><Send className="w-4 h-4 mr-1" /> Release to creator</Button>
          <Button size="sm" variant="outline" onClick={onRefund}><RotateCcw className="w-4 h-4 mr-1" /> Refund brand</Button>
        </div>

        {d.delivered_at && !d.released_at && (
          <p className="text-xs text-amber-600 mt-3">Delivered {new Date(d.delivered_at).toLocaleString()}{d.auto_release_at ? ` · auto-releases ${new Date(d.auto_release_at).toLocaleString()}` : ''}</p>
        )}
      </CardContent>
    </Card>
  );
};

const PaymentsPanel = () => {
  const qc = useQueryClient();
  const { data: payments, isLoading } = useQuery({
    queryKey: ['brand-deal-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_deal_payments')
        .select('*, deal:brand_deals(id, campaign_title, brand_name, invoice_number, gross_amount, currency)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const patch: any = { status };
      if (status === 'confirmed') patch.confirmed_at = new Date().toISOString();
      const { error } = await supabase.from('brand_deal_payments').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand-deal-payments'] }); qc.invalidateQueries({ queryKey: ['brand-deals'] }); toast.success('Payment updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin" />;
  if (!payments?.length) return <Card><CardContent className="p-8 text-center text-muted-foreground">No brand payments submitted yet.</CardContent></Card>;
  return (
    <div className="space-y-3">
      {payments.map((p: any) => (
        <Card key={p.id}>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{p.deal?.brand_name} · {p.deal?.campaign_title}</div>
              <p className="text-xs text-muted-foreground">{p.method.toUpperCase()} · Ref: <code>{p.reference || '—'}</code> · {p.paid_by_email || '—'} · {new Date(p.created_at).toLocaleString()}</p>
              {p.notes && <p className="text-xs mt-1">{p.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-2">
                <div className="font-bold">{p.currency} {Number(p.amount).toLocaleString()}</div>
                <Badge variant="outline" className={p.status === 'confirmed' ? 'text-emerald-600' : p.status === 'rejected' ? 'text-destructive' : ''}>{p.status}</Badge>
              </div>
              {p.status === 'pending' && (
                <>
                  <Button size="sm" onClick={() => setStatus.mutate({ id: p.id, status: 'confirmed' })}><CheckCircle2 className="w-4 h-4 mr-1" /> Confirm</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: p.id, status: 'rejected' })}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const RequestCard = ({ request, creators, onStatus, onCreate }: any) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(request.admin_notes || '');
  const [deal, setDeal] = useState({
    creator_id: '',
    brand_name: request.company_name,
    campaign_title: '',
    brief: request.campaign_brief,
    deliverables: request.deliverables || '',
    gross_amount: request.budget_max || request.budget_min || 0,
    platform_fee: 0,
    creator_amount: request.budget_max || request.budget_min || 0,
    currency: request.currency || 'KES',
    start_date: request.timeline_start || '',
    end_date: request.timeline_end || '',
  });

  const recompute = (gross: number, fee: number) => ({ ...deal, gross_amount: gross, platform_fee: fee, creator_amount: Math.max(0, gross - fee) });

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{request.company_name}</h3>
              <Badge className={statusColors[request.status]}>{request.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {request.contact_name} · {request.contact_email} {request.contact_phone && `· ${request.contact_phone}`}
            </p>
            {request.industry && <p className="text-xs text-muted-foreground mt-0.5">Industry: {request.industry}</p>}
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{request.currency} {Number(request.budget_min || 0).toLocaleString()} – {Number(request.budget_max || 0).toLocaleString()}</div>
            {request.preferred_creator_username && <div className="text-xs text-muted-foreground">Wants: @{request.preferred_creator_username}</div>}
          </div>
        </div>
        <p className="text-sm mb-3 whitespace-pre-line">{request.campaign_brief}</p>
        {request.deliverables && <p className="text-sm mb-1"><span className="font-medium">Deliverables:</span> {request.deliverables}</p>}
        {request.target_audience && <p className="text-sm mb-3"><span className="font-medium">Audience:</span> {request.target_audience}</p>}

        <div className="flex flex-wrap gap-2">
          <Select value={request.status} onValueChange={(v) => onStatus(v, notes)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['new','reviewing','matched','closed','rejected'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> Create deal</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Assign to creator</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Creator</Label>
                  <Select value={deal.creator_id} onValueChange={(v) => setDeal({ ...deal, creator_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select creator" /></SelectTrigger>
                    <SelectContent>
                      {creators.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.display_name} (@{c.username})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaign title</Label>
                  <Input value={deal.campaign_title} onChange={(e) => setDeal({ ...deal, campaign_title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2"><Label>Gross amount</Label>
                    <Input type="number" value={deal.gross_amount} onChange={(e) => setDeal(recompute(Number(e.target.value), deal.platform_fee))} /></div>
                  <div className="space-y-2"><Label>Platform fee</Label>
                    <Input type="number" value={deal.platform_fee} onChange={(e) => setDeal(recompute(deal.gross_amount, Number(e.target.value)))} /></div>
                </div>
                <div className="text-sm text-muted-foreground">Creator receives: <strong>{deal.currency} {deal.creator_amount.toLocaleString()}</strong></div>
                <div className="space-y-2">
                  <Label>Deliverables</Label>
                  <Textarea value={deal.deliverables} onChange={(e) => setDeal({ ...deal, deliverables: e.target.value })} />
                </div>
                <Button onClick={() => {
                  if (!deal.creator_id || !deal.campaign_title) return toast.error('Pick a creator and add a title');
                  onCreate({
                    ...deal,
                    start_date: deal.start_date || null,
                    end_date: deal.end_date || null,
                    status: 'offered',
                    payment_status: 'held',
                  });
                  setOpen(false);
                  onStatus('matched', notes);
                }} className="w-full">Create & offer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Textarea
          placeholder="Internal notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (request.admin_notes || '') && onStatus(request.status, notes)}
          className="mt-3"
          rows={2}
        />
      </CardContent>
    </Card>
  );
};

export default AdminBrandDeals;