import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Phone, Mail, Shield, ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const CreatorSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: creator } = useMyCreator();
  const [formData, setFormData] = useState({
    mpesa_phone: creator?.mpesa_phone || '',
    paypal_email: creator?.paypal_email || ''
  });

  // 2FA settings
  const { data: twoFaSettings } = useQuery({
    queryKey: ['2fa-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from('user_2fa_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Check if admin enabled 2FA
  const { data: platformSettings } = useQuery({
    queryKey: ['platform-2fa-config'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('key, value').in('key', ['2fa_enabled', '2fa_methods']);
      const map: Record<string, any> = {};
      data?.forEach(r => { map[r.key] = r.value; });
      return map;
    }
  });

  const is2faAllowed = platformSettings?.['2fa_enabled'] === true || platformSettings?.['2fa_enabled'] === 'true';
  const allowedMethods = platformSettings?.['2fa_methods'] || 'both';

  const [twoFa, setTwoFa] = useState({
    is_enabled: false,
    method: 'sms' as string,
    phone: '',
    email: ''
  });

  // Inline OTP verification state for enabling email 2FA.
  const [otpStep, setOtpStep] = useState<'idle' | 'verify'>(() =>
    sessionStorage.getItem('ty_creator_2fa_step') === 'verify' ? 'verify' : 'idle'
  );
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResendIn, setOtpResendIn] = useState<number>(() => {
    const until = Number(sessionStorage.getItem('ty_creator_2fa_resend_until') || 0);
    return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
  });
  const RESEND_COOLDOWN = 45;

  React.useEffect(() => {
    if (otpStep === 'verify') sessionStorage.setItem('ty_creator_2fa_step', 'verify');
    else sessionStorage.removeItem('ty_creator_2fa_step');
  }, [otpStep]);

  React.useEffect(() => {
    if (otpResendIn > 0) sessionStorage.setItem('ty_creator_2fa_resend_until', String(Date.now() + otpResendIn * 1000));
    else sessionStorage.removeItem('ty_creator_2fa_resend_until');
  }, [otpResendIn]);

  React.useEffect(() => {
    if (otpResendIn <= 0) return;
    const t = setInterval(() => setOtpResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpResendIn]);

  React.useEffect(() => {
    if (creator) {
      setFormData({
        mpesa_phone: creator.mpesa_phone || '',
        paypal_email: creator.paypal_email || ''
      });
    }
  }, [creator]);

  React.useEffect(() => {
    if (twoFaSettings) {
      setTwoFa({
        is_enabled: twoFaSettings.is_enabled || false,
        method: twoFaSettings.method || 'sms',
        phone: twoFaSettings.phone || '',
        email: twoFaSettings.email || ''
      });
    }
  }, [twoFaSettings]);

  const updateCreator = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!creator) throw new Error('No creator');
      const { error } = await supabase.from('creators').update(data).eq('id', creator.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-creator'] });
      toast.success('Settings updated!');
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const update2fa = useMutation({
    mutationFn: async (data: typeof twoFa) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('user_2fa_settings').upsert({
        user_id: user.id,
        ...data
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-settings'] });
      toast.success('2FA settings updated!');
      setOtpStep('idle');
      setOtpCode('');
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const sendEmailOtp = async () => {
    if (!user) return;
    const target = (twoFa.email || user.email || '').trim();
    if (!target) { toast.error('Enter an email address first'); return; }
    if (otpResendIn > 0 || otpSending) return;
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: { user_id: user.id, email: target, purpose: 'enable_2fa' },
      });
      const payload = (data as any) || {};
      if (payload.code === 'cooldown' && payload.retry_after) {
        setOtpResendIn(payload.retry_after);
        setOtpStep('verify');
        toast.message(`Please wait ${payload.retry_after}s before requesting another code.`);
        return;
      }
      if (error) throw error;
      setOtpStep('verify');
      setOtpResendIn(RESEND_COOLDOWN);
      toast.success(`Code sent to ${target}. Expires in 10 minutes.`);
    } catch (e: any) {
      toast.error(e.message || 'Could not send verification code');
    } finally {
      setOtpSending(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!user || otpCode.length !== 6) return;
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { user_id: user.id, code: otpCode, purpose: 'enable_2fa' },
      });
      const payload = (data as any) || {};
      if (error && !payload.code) throw error;
      if (!payload.ok) {
        const kind = payload.code as 'expired' | 'invalid' | 'used' | undefined;
        if (kind === 'expired' || kind === 'used') {
          toast.error(payload.error || 'Code expired', {
            action: { label: 'Resend code', onClick: () => sendEmailOtp() },
          });
        } else {
          toast.error(payload.error || 'Invalid code. Try again.');
        }
        setOtpCode('');
        return;
      }
      // Persist now that the email is verified.
      update2fa.mutate({ ...twoFa, is_enabled: true });
    } catch (e: any) {
      toast.error(e.message || 'Verification failed. Try again or resend the code.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handle2faSave = () => {
    if (!twoFa.is_enabled) {
      // Disabling — just persist.
      update2fa.mutate(twoFa);
      return;
    }
    if (twoFa.method === 'email') {
      // Require OTP confirmation of the email address before enabling.
      if (otpStep !== 'verify') {
        sendEmailOtp();
      } else {
        verifyAndEnable();
      }
      return;
    }
    // SMS path keeps existing behavior.
    update2fa.mutate(twoFa);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCreator.mutate(formData);
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your payment and security settings</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>Configure how you receive payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mpesa_phone">M-PESA Phone Number</Label>
                <Input id="mpesa_phone" value={formData.mpesa_phone} onChange={(e) => setFormData({ ...formData, mpesa_phone: e.target.value })} placeholder="254712345678" />
                <p className="text-xs text-muted-foreground">Used for receiving withdrawals</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paypal_email">PayPal Email (Optional)</Label>
                <Input id="paypal_email" type="email" value={formData.paypal_email} onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })} placeholder="you@example.com" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateCreator.isPending} className="gap-2">
              {updateCreator.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </Button>
          </div>
        </form>

        {/* 2FA Section */}
        {is2faAllowed && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">Require a verification code when signing in</p>
                </div>
                <Switch checked={twoFa.is_enabled} onCheckedChange={(checked) => setTwoFa({ ...twoFa, is_enabled: checked })} />
              </div>

              {twoFa.is_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Verification Method</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={twoFa.method}
                      onChange={(e) => setTwoFa({ ...twoFa, method: e.target.value })}
                    >
                      {(allowedMethods === 'both' || allowedMethods === 'sms') && <option value="sms">SMS</option>}
                      {(allowedMethods === 'both' || allowedMethods === 'email') && <option value="email">Email</option>}
                    </select>
                  </div>

                  {twoFa.method === 'sms' && (
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={twoFa.phone} onChange={(e) => setTwoFa({ ...twoFa, phone: e.target.value })} placeholder="254712345678" />
                    </div>
                  )}

                  {twoFa.method === 'email' && (
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" value={twoFa.email} onChange={(e) => setTwoFa({ ...twoFa, email: e.target.value })} placeholder="you@example.com" />
                    </div>
                  )}
                </>
              )}

              {twoFa.is_enabled && twoFa.method === 'email' && otpStep === 'verify' && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Enter the 6-digit code we just emailed to <span className="font-semibold">{twoFa.email || user?.email}</span>
                  </div>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="text-center tracking-[10px] text-2xl font-bold"
                    autoFocus
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={sendEmailOtp}
                      disabled={otpSending || otpResendIn > 0}
                      className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {otpSending ? 'Sending…' : otpResendIn > 0 ? `Resend in ${otpResendIn}s` : 'Resend code'}
                    </button>
                    <span>Code expires in 10 minutes</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handle2faSave}
                disabled={update2fa.isPending || otpSending || otpVerifying || (otpStep === 'verify' && otpCode.length !== 6)}
                className="gap-2"
              >
                {update2fa.isPending || otpVerifying || otpSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : twoFa.is_enabled && twoFa.method === 'email' ? (
                  <KeyRound className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {!twoFa.is_enabled
                  ? 'Save 2FA Settings'
                  : twoFa.method === 'email'
                    ? otpStep === 'verify' ? 'Verify & Enable' : 'Send code to verify email'
                    : 'Save 2FA Settings'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreatorSettings;
