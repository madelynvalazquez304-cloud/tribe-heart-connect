import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lock, ShieldCheck, KeyRound, FileKey, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type Cfg = {
  consumer_key?: string;
  consumer_secret?: string;
  paybill?: string;
  passkey?: string;
  environment?: 'sandbox' | 'production';
  b2c_shortcode?: string;
  initiator_name?: string;
  initiator_password?: string; // never persisted; used once to derive security_credential
  security_credential?: string;
  b2c_certificate?: string; // optional custom Safaricom public certificate (PEM)
};

const B2cConfigCard: React.FC = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Cfg>({ environment: 'sandbox' });
  const [plainPassword, setPlainPassword] = useState('');
  const [threshold, setThreshold] = useState<number>(50000);
  const [approvalThreshold, setApprovalThreshold] = useState<number>(10000);
  const [minAmount, setMinAmount] = useState<number>(500);
  const [fee, setFee] = useState<number>(50);
  const [enabled, setEnabled] = useState(false);
  const [encrypting, setEncrypting] = useState(false);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ['mpesa-config'],
    queryFn: async () => {
      const { data } = await supabase.from('payment_configs').select('*').eq('provider', 'mpesa').eq('is_primary', true).maybeSingle();
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['b2c-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['b2c_auto_threshold', 'b2c_enabled', 'withdrawal_min_amount', 'withdrawal_fee', 'withdrawal_approval_threshold']);
      return data || [];
    },
  });

  useEffect(() => {
    if (cfg?.config) setForm({ ...(cfg.config as Cfg) });
  }, [cfg]);

  useEffect(() => {
    const get = (k: string) => settings?.find(s => s.key === k)?.value;
    const t = get('b2c_auto_threshold');
    const e = get('b2c_enabled');
    const at = get('withdrawal_approval_threshold');
    const min = get('withdrawal_min_amount');
    const f = get('withdrawal_fee');
    if (t != null) setThreshold(Number(t));
    if (e != null) setEnabled(Boolean(e));
    if (at != null) setApprovalThreshold(Number(at));
    if (min != null) setMinAmount(Number(min));
    if (f != null) setFee(Number(f));
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (minAmount <= fee) throw new Error('Minimum withdrawal must be greater than the withdrawal fee');
      if (approvalThreshold < 0 || threshold < 0) throw new Error('Thresholds cannot be negative');

      let security_credential = form.security_credential;

      // If user typed a new plaintext password, encrypt via edge function
      if (plainPassword.trim()) {
        setEncrypting(true);
        const { data, error } = await supabase.functions.invoke('mpesa-encrypt-credential', {
          body: {
            password: plainPassword,
            environment: form.environment || 'sandbox',
            certificate: form.b2c_certificate?.trim() || undefined,
          },
        });
        setEncrypting(false);
        if (error || !data?.securityCredential) throw new Error(error?.message || 'Failed to encrypt credential');
        security_credential = data.securityCredential;
      }

      const newConfig = { ...form, security_credential };
      delete (newConfig as any).initiator_password;

      if (cfg?.id) {
        const { error } = await supabase.from('payment_configs').update({ config: newConfig as any, is_active: true }).eq('id', cfg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_configs').insert({
          provider: 'mpesa', name: 'M-PESA Primary', is_active: true, is_primary: true, config: newConfig as any,
        });
        if (error) throw error;
      }

      const { error: sErr } = await supabase.from('platform_settings').upsert([
        { key: 'b2c_auto_threshold', value: threshold as any, category: 'features' },
        { key: 'b2c_enabled', value: enabled as any, category: 'features' },
        { key: 'withdrawal_min_amount', value: minAmount as any, category: 'features' },
        { key: 'withdrawal_fee', value: fee as any, category: 'features' },
        { key: 'withdrawal_approval_threshold', value: approvalThreshold as any, category: 'payments' },
      ], { onConflict: 'key' });
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      toast.success('Payout configuration saved');
      setPlainPassword('');
      qc.invalidateQueries({ queryKey: ['mpesa-config'] });
      qc.invalidateQueries({ queryKey: ['b2c-settings'] });
      qc.invalidateQueries({ queryKey: ['withdrawal-settings'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return null;

  const hasCred = !!form.security_credential;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> M-PESA B2C Payouts</CardTitle>
        <CardDescription>
          Auto-payout creator withdrawals via Daraja B2C. The Security Credential is generated server-side by RSA-encrypting your Initiator password with Safaricom's public certificate — your plaintext password is never stored.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Environment</Label>
            <select className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm" value={form.environment || 'sandbox'} onChange={e => setForm({ ...form, environment: e.target.value as any })}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div>
            <Label>B2C Shortcode</Label>
            <Input value={form.b2c_shortcode || ''} onChange={e => setForm({ ...form, b2c_shortcode: e.target.value })} placeholder="600000" />
          </div>
          <div>
            <Label>Initiator Name</Label>
            <Input value={form.initiator_name || ''} onChange={e => setForm({ ...form, initiator_name: e.target.value })} placeholder="testapi" />
          </div>
          <div>
            <Label className="flex items-center gap-1"><KeyRound className="w-3 h-3" /> Initiator Password {hasCred && <span className="text-xs text-green-600 ml-2">(credential set)</span>}</Label>
            <Input type="password" value={plainPassword} onChange={e => setPlainPassword(e.target.value)} placeholder={hasCred ? '••••••• (leave blank to keep)' : 'Daraja Initiator password'} />
            <p className="text-xs text-muted-foreground mt-1">Auto-encrypted to SecurityCredential on save.</p>
          </div>
          <div>
            <Label>Consumer Key</Label>
            <Input value={form.consumer_key || ''} onChange={e => setForm({ ...form, consumer_key: e.target.value })} />
          </div>
          <div>
            <Label>Consumer Secret</Label>
            <Input type="password" value={form.consumer_secret || ''} onChange={e => setForm({ ...form, consumer_secret: e.target.value })} />
          </div>
        </div>

        <div className="pt-2 border-t">
          <Label className="flex items-center gap-1"><FileKey className="w-3 h-3" /> Safaricom public certificate (optional)</Label>
          <Textarea
            rows={4}
            className="mt-1 font-mono text-xs"
            value={form.b2c_certificate || ''}
            onChange={e => setForm({ ...form, b2c_certificate: e.target.value })}
            placeholder={'-----BEGIN CERTIFICATE-----\n... paste ProductionCertificate.cer contents ...\n-----END CERTIFICATE-----'}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave blank to use the bundled Safaricom sandbox/production certificates. Paste a certificate here if Safaricom issues you an updated one — it is only used to encrypt the initiator password.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <Label>Minimum withdrawal (KES)</Label>
            <Input type="number" min={1} value={minAmount} onChange={e => setMinAmount(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Creators cannot request less than this.</p>
          </div>
          <div>
            <Label>Withdrawal fee (KES)</Label>
            <Input type="number" min={0} value={fee} onChange={e => setFee(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Deducted from the requested amount.</p>
          </div>
          <div>
            <Label className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-600" /> Manual approval amount (KES)</Label>
            <Input type="number" min={0} value={approvalThreshold} onChange={e => setApprovalThreshold(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Payouts at or above this net amount are flagged and cannot be sent until an admin approves them.</p>
          </div>
          <div>
            <Label>Hard auto-send ceiling (KES)</Label>
            <Input type="number" min={0} value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Legacy safety ceiling for automated sends.</p>
          </div>
          <div className="flex items-end justify-between gap-3 md:col-span-2">
            <div>
              <Label>Enable automated B2C</Label>
              <p className="text-xs text-muted-foreground">Toggle off to fall back to manual reference entry only.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending || encrypting}>
            {(save.isPending || encrypting) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Lock className="w-4 h-4 mr-2" /> Save payout config
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default B2cConfigCard;
