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
import { Loader2, Briefcase, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

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
              <Card key={d.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{d.campaign_title}</h3>
                        <Badge className={statusColors[d.status]}>{d.status}</Badge>
                        <Badge variant="outline" className={statusColors[d.payment_status]}>
                          <ShieldCheck className="w-3 h-3 mr-1" />{d.payment_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {d.brand_name} → @{d.creator?.username} · {d.currency} {Number(d.gross_amount).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Select value={d.status} onValueChange={(v) => updateDeal.mutate({ id: d.id, status: v })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['offered','accepted','in_progress','delivered','paid','cancelled'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={d.payment_status} onValueChange={(v) => updateDeal.mutate({ id: d.id, payment_status: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['held','released','refunded'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {d.brief && <p className="text-sm text-muted-foreground mb-2">{d.brief}</p>}
                  {d.deliverables && <p className="text-sm"><span className="font-medium">Deliverables:</span> {d.deliverables}</p>}
                  <div className="text-xs text-muted-foreground mt-2">
                    Creator gets {d.currency} {Number(d.creator_amount).toLocaleString()} · Platform fee {d.currency} {Number(d.platform_fee).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
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