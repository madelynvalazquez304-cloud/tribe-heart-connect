import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BrandDealPayment = () => {
  const { dealId } = useParams();
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ method: 'mpesa' as 'mpesa'|'bank_transfer', amount: 0, reference: '', paid_by_email: '', notes: '' });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('brand_deals')
        .select('id, campaign_title, brand_name, gross_amount, currency, escrow_amount, invoice_number, payment_status')
        .eq('id', dealId!).maybeSingle();
      setDeal(data);
      if (data) setForm(f => ({ ...f, amount: Math.max(0, Number(data.gross_amount) - Number(data.escrow_amount || 0)) }));
      setLoading(false);
    })();
  }, [dealId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!deal) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Invoice not found.</div>;

  const submit = async () => {
    if (!form.amount || form.amount <= 0) return toast.error('Enter the amount paid');
    if (!form.reference) return toast.error('Enter the M-PESA / bank reference');
    setSubmitting(true);
    const { error } = await supabase.from('brand_deal_payments').insert({
      deal_id: deal.id, amount: form.amount, currency: deal.currency || 'KES',
      method: form.method, reference: form.reference, paid_by_email: form.paid_by_email, notes: form.notes, status: 'pending',
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-2xl mx-auto px-4">
        <Link to="/" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Back</Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Brand Deal Escrow Payment</CardTitle>
            <CardDescription>
              Invoice <strong>{deal.invoice_number || deal.id.slice(0,8)}</strong> · {deal.brand_name} · {deal.campaign_title}
              <br/>Total: <strong>{deal.currency} {Number(deal.gross_amount).toLocaleString()}</strong> · Already received: {deal.currency} {Number(deal.escrow_amount||0).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {done ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                <h3 className="font-semibold mb-1">Payment submitted</h3>
                <p className="text-sm text-muted-foreground">We will confirm receipt within one business day and notify the creator. The funds stay in escrow until deliverables are accepted.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Payment method</Label>
                    <select className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm" value={form.method} onChange={e => setForm({...form, method: e.target.value as any})}>
                      <option value="mpesa">M-PESA Paybill</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <Label>Amount ({deal.currency})</Label>
                    <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} />
                  </div>
                </div>
                <div>
                  <Label>{form.method === 'mpesa' ? 'M-PESA Transaction Code' : 'Bank Reference / SWIFT'}</Label>
                  <Input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} placeholder={form.method === 'mpesa' ? 'e.g. QH123ABCDE' : 'Bank reference'} />
                </div>
                <div>
                  <Label>Your email (for receipt)</Label>
                  <Input type="email" value={form.paid_by_email} onChange={e => setForm({...form, paid_by_email: e.target.value})} />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">How escrow works:</strong> Your payment is held by TribeYangu. The creator only receives funds after they deliver and you accept (or 7 days pass with no rejection). If the creator fails to deliver, we refund you in full.
                </div>
                <Button className="w-full" onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit payment proof
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrandDealPayment;