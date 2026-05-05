import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, Handshake, Sparkles, Target, Wallet, Users, BadgeCheck, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const initialForm = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  industry: '',
  campaign_brief: '',
  target_audience: '',
  budget_min: '',
  budget_max: '',
  currency: 'KES',
  deliverables: '',
  timeline_start: '',
  timeline_end: '',
  preferred_creator_username: '',
  preferred_category: '',
};

const reasons = [
  { icon: ShieldCheck, title: 'Escrow protection', desc: 'We hold payment until creators deliver agreed work — both sides protected.' },
  { icon: BadgeCheck, title: 'Verified creators only', desc: 'Every creator is KYC-checked and approved before joining the network.' },
  { icon: Target, title: 'Smart matchmaking', desc: 'We pair your brand with creators who fit your audience, niche and budget.' },
  { icon: Wallet, title: 'One invoice, many creators', desc: 'Pay us once. We handle splits, taxes, M-PESA payouts and reporting.' },
  { icon: Handshake, title: 'Contract & dispute support', desc: 'Standardised contracts and a real human team if anything goes sideways.' },
  { icon: Sparkles, title: 'Performance reports', desc: 'Get reach, engagement and ROI summaries after every campaign.' },
];

const Advertise = () => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof initialForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_email || !form.campaign_brief) {
      toast.error('Please fill the required fields.');
      return;
    }
    setSubmitting(true);
    const payload: any = {
      ...form,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      timeline_start: form.timeline_start || null,
      timeline_end: form.timeline_end || null,
      status: 'new',
    };
    const { error } = await supabase.from('brand_deal_requests').insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Brief received! Our partnerships team will reach out within 24h.");
    setForm(initialForm);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" /> For Brands & Advertisers
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Work with Africa's most-loved creators — safely.
            </h1>
            <p className="text-lg text-muted-foreground">
              Submit your campaign brief. We match you with vetted creators, manage contracts, hold payment in escrow and deliver results — so you don't have to chase DMs.
            </p>
          </div>

          {/* Why us */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-14">
            {reasons.map(r => (
              <Card key={r.title} className="border-border/60">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <r.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{r.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Form */}
          <Card className="max-w-3xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Submit your campaign brief</CardTitle>
              <p className="text-sm text-muted-foreground">Takes ~3 minutes. No commitment until you sign a contract.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company / Brand *</Label>
                    <Input value={form.company_name} onChange={update('company_name')} placeholder="Acme Inc." required />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input value={form.industry} onChange={update('industry')} placeholder="FMCG, Fintech, Fashion…" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact name *</Label>
                    <Input value={form.contact_name} onChange={update('contact_name')} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Work email *</Label>
                    <Input type="email" value={form.contact_email} onChange={update('contact_email')} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.contact_phone} onChange={update('contact_phone')} placeholder="+254 …" />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={form.website} onChange={update('website')} placeholder="https://" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Campaign brief *</Label>
                  <Textarea value={form.campaign_brief} onChange={update('campaign_brief')} rows={4}
                    placeholder="What are you launching? What story do you want creators to tell?" required />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deliverables</Label>
                    <Textarea value={form.deliverables} onChange={update('deliverables')} rows={3}
                      placeholder="e.g. 1 IG reel + 3 stories + 1 TikTok" />
                  </div>
                  <div className="space-y-2">
                    <Label>Target audience</Label>
                    <Textarea value={form.target_audience} onChange={update('target_audience')} rows={3}
                      placeholder="Demographic, region, interests…" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Budget min</Label>
                    <Input type="number" min="0" value={form.budget_min} onChange={update('budget_min')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget max</Label>
                    <Input type="number" min="0" value={form.budget_max} onChange={update('budget_max')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={form.currency} onChange={update('currency')} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input type="date" value={form.timeline_start} onChange={update('timeline_start')} />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input type="date" value={form.timeline_end} onChange={update('timeline_end')} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preferred creator (username)</Label>
                    <Input value={form.preferred_creator_username} onChange={update('preferred_creator_username')} placeholder="@username (optional)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred category</Label>
                    <Input value={form.preferred_category} onChange={update('preferred_category')} placeholder="Music, Comedy, Lifestyle…" />
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit brief
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  By submitting, you agree to our partnership terms. Payment is held in escrow and only released when deliverables are approved.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Advertise;