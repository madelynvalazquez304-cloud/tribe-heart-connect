import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Lock, ShieldCheck, KeyRound } from 'lucide-react';
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
};

const B2cConfigCard: React.FC = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Cfg>({ environment: 'sandbox' });
  const [plainPassword, setPlainPassword] = useState('');
  const [threshold, setThreshold] = useState<number>(50000);
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
      const { data } = await supabase.from('platform_settings').select('key, value').in('key', ['b2c_auto_threshold', 'b2c_enabled']);
      return data || [];
    },
  });

  useEffect(() => {
    if (cfg?.config) setForm({ ...(cfg.config as Cfg) });
  }, [cfg]);

  useEffect(() => {
    const t = settings?.find(s => s.key === 'b2c_auto_threshold');
    const e = settings?.find(s => s.key === 'b2c_enabled');
    if (t?.value != null) setThreshold(Number(t.value));
    if (e?.value != null) setEnabled(Boolean(e.value));
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      let security_credential = form.security_credential;

      // If user typed a new plaintext password, encrypt via edge function
      if (plainPassword.trim()) {
        setEncrypting(true);
        const { data, error } = await supabase.functions.invoke('mpesa-encrypt-credential', {
          body: { password: plainPassword, environment: form.environment || 'sandbox' },
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

      // Save threshold + enabled
      await supabase.from('platform_settings').upsert([
        { key: 'b2c_auto_threshold', value: threshold as any, category: 'features' },
        { key: 'b2c_enabled', value: enabled as any, category: 'features' },
      ], { onConflict: 'key' });
    },
    onSuccess: () => {
      toast.success('B2C config saved');
      setPlainPassword('');
      qc.invalidateQueries({ queryKey: ['mpesa-config'] });
      qc.invalidateQueries({ queryKey: ['b2c-settings'] });
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <Label>Manual review threshold (KES)</Label>
            <Input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Withdrawals ≥ this amount require manual override before B2C is sent.</p>
          </div>
          <div className="flex items-end justify-between gap-3">
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
            <Lock className="w-4 h-4 mr-2" /> Save B2C config
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default B2cConfigCard;