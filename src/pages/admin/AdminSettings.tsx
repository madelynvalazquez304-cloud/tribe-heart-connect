import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Percent, DollarSign, Wallet, Truck, AlertCircle, Globe, Image, Upload, Trash2, Mail, Shield, Key, Send } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import EmailComposer from '@/components/admin/EmailComposer';

interface Setting {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  category: string | null;
}

interface SmtpSettingsShape {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: 'tls' | 'ssl' | 'none';
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_reply_to: string;
}

const SMTP_SETTING_KEYS = [
  'smtp_enabled',
  'smtp_host',
  'smtp_port',
  'smtp_encryption',
  'smtp_username',
  'smtp_password',
  'smtp_from_email',
  'smtp_from_name',
  'smtp_reply_to',
] as const;

const getDefaultPortForEncryption = (encryption: SmtpSettingsShape['smtp_encryption']) => {
  if (encryption === 'ssl') return 465;
  if (encryption === 'none') return 25;
  return 587;
};

const normalizeSmtpSettings = (raw: Record<string, any>, fallbackName = 'TribeYangu'): SmtpSettingsShape => {
  const rawEncryption = String(raw.smtp_encryption ?? raw.encryption ?? 'tls').toLowerCase();
  const smtp_encryption: SmtpSettingsShape['smtp_encryption'] = rawEncryption === 'ssl' || rawEncryption === 'none' ? rawEncryption : 'tls';

  const parsedPort = Number(raw.smtp_port ?? raw.port);
  let smtp_port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : getDefaultPortForEncryption(smtp_encryption);

  if (smtp_encryption === 'ssl' && smtp_port === 587) smtp_port = 465;
  if (smtp_encryption === 'tls' && smtp_port === 465) smtp_port = 587;

  const smtp_username = String(raw.smtp_username ?? raw.username ?? '').trim();
  const smtp_from_email = String(raw.smtp_from_email ?? raw.fromEmail ?? smtp_username).trim();
  const smtp_from_name = String(raw.smtp_from_name ?? raw.fromName ?? fallbackName).trim() || fallbackName;

  return {
    smtp_enabled: raw.smtp_enabled === false || raw.smtp_enabled === 'false' ? false : true,
    smtp_host: String(raw.smtp_host ?? raw.host ?? '').trim(),
    smtp_port,
    smtp_encryption,
    smtp_username,
    smtp_password: String(raw.smtp_password ?? raw.password ?? ''),
    smtp_from_email,
    smtp_from_name,
    smtp_reply_to: String(raw.smtp_reply_to ?? raw.replyTo ?? '').trim(),
  };
};

const buildSmtpSettingsPatch = (allSettings: Record<string, any>) => {
  const normalized = normalizeSmtpSettings(allSettings, String(allSettings.site_name || 'TribeYangu'));

  return {
    ...normalized,
    smtp_config: {
      enabled: normalized.smtp_enabled,
      host: normalized.smtp_host,
      port: normalized.smtp_port,
      encryption: normalized.smtp_encryption,
      username: normalized.smtp_username,
      password: normalized.smtp_password,
      fromEmail: normalized.smtp_from_email,
      fromName: normalized.smtp_from_name,
      replyTo: normalized.smtp_reply_to,
    },
  };
};

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirtyKeys, setDirtyKeys] = useState<string[]>([]);

  const { data: platformSettings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('*');
      if (error) throw error;
      return data as Setting[];
    }
  });

  useEffect(() => {
    if (platformSettings) {
      const settingsMap: Record<string, any> = {};
      platformSettings.forEach(s => { settingsMap[s.key] = s.value; });
      const smtpConfig = settingsMap.smtp_config && typeof settingsMap.smtp_config === 'object'
        ? normalizeSmtpSettings({ ...settingsMap, ...(settingsMap.smtp_config as Record<string, any>) }, String(settingsMap.site_name || 'TribeYangu'))
        : normalizeSmtpSettings(settingsMap, String(settingsMap.site_name || 'TribeYangu'));

      setSettings({
        ...settingsMap,
        ...smtpConfig,
      });
      setDirtyKeys([]);
      setHasChanges(false);
    }
  }, [platformSettings]);

  const updateSettings = useMutation({
    mutationFn: async ({ updates }: { updates: Record<string, any>; savedKeys: string[] }) => {
      const now = new Date().toISOString();
      const preparedUpdates = { ...updates, ...buildSmtpSettingsPatch({ ...settings, ...updates }) };
      const existingSettings = new Map((platformSettings || []).map((setting) => [setting.key, setting]));

      const promises = Object.entries(preparedUpdates).map(([key, value]) => {
        const existing = existingSettings.get(key);
        if (existing) {
          return supabase
            .from('platform_settings')
            .update({ value, updated_at: now })
            .eq('key', key);
        }

        let category = 'general';
        if (key === 'smtp_config' || SMTP_SETTING_KEYS.includes(key as typeof SMTP_SETTING_KEYS[number])) category = 'email';
        else if (key.startsWith('feature_')) category = 'features';
        else if (key.startsWith('social_')) category = 'features';
        else if (key.startsWith('site_')) category = 'branding';
        return supabase
          .from('platform_settings')
          .insert({ key, value, category, description: null });
      });

      const results = await Promise.all(promises);
      results.forEach(({ error }) => { if (error) throw error; });
      return preparedUpdates;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('Settings saved');
      setDirtyKeys((previous) => {
        const remaining = previous.filter((key) => !variables.savedKeys.includes(key));
        setHasChanges(remaining.length > 0);
        return remaining;
      });
    },
    onError: (error: Error) => { toast.error(error.message); }
  });

  const handleChange = (key: string, value: any) => {
    if (key === 'smtp_encryption') {
      const normalized = normalizeSmtpSettings({ ...settings, smtp_encryption: value }, String(settings.site_name || 'TribeYangu'));
      setSettings((prev) => ({
        ...prev,
        smtp_encryption: normalized.smtp_encryption,
        smtp_port: normalized.smtp_port,
      }));
      setDirtyKeys((prev) => Array.from(new Set([...prev, 'smtp_encryption', 'smtp_port'])));
      setHasChanges(true);
      return;
    }

    setSettings(prev => ({ ...prev, [key]: value }));
    setDirtyKeys((prev) => Array.from(new Set([...prev, key])));
    setHasChanges(true);
  };

  const persistSmtpSettings = async () => {
    const smtpPatch = buildSmtpSettingsPatch(settings);
    setSettings((prev) => ({ ...prev, ...smtpPatch }));
    await updateSettings.mutateAsync({
      updates: smtpPatch,
      savedKeys: [...SMTP_SETTING_KEYS, 'smtp_config'],
    });
    return smtpPatch;
  };

  const handleSave = () => {
    updateSettings.mutate({
      updates: settings,
      savedKeys: Object.keys(settings),
    });
  };

  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const handleTestSmtp = async () => {
    if (!testEmail) { toast.error('Enter a recipient email'); return; }
    setTesting(true);
    try {
      const smtpPatch = await persistSmtpSettings();
      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          to: testEmail,
          subject: `${settings.site_name || 'TribeYangu'} – SMTP test`,
          html: `<div style="font-family:sans-serif;padding:24px;"><h2>SMTP works! 🎉</h2><p>This is a test from your admin panel. Encryption: <b>${smtpPatch.smtp_encryption}</b>, host <b>${smtpPatch.smtp_host}:${smtpPatch.smtp_port}</b>.</p></div>`,
          test: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Test email dispatched. Check the inbox.');
    } catch (e: any) {
      toast.error(`SMTP test failed: ${e.message || e}`);
    } finally {
      setTesting(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `branding/logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('creator-assets').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('creator-assets').getPublicUrl(fileName);
      handleChange('site_logo_url', publicUrl);
      toast.success('Logo uploaded!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `branding/favicon-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('creator-assets').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('creator-assets').getPublicUrl(fileName);
      handleChange('site_favicon_url', publicUrl);
      toast.success('Favicon uploaded! Refresh tabs to see the change.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout type="admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Platform Settings</h1>
            <p className="text-muted-foreground mt-1">Configure branding, fees, limits, and platform settings</p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
              {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          )}
        </div>

        <div className="grid gap-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Site Branding
              </CardTitle>
              <CardDescription>Website name, logo, and identity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Website Name</Label>
                  <Input
                    value={settings.site_name || ''}
                    onChange={(e) => handleChange('site_name', e.target.value)}
                    placeholder="TribeYangu"
                  />
                  <p className="text-xs text-muted-foreground">Displayed in header, footer, and page titles</p>
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={settings.site_tagline || ''}
                    onChange={(e) => handleChange('site_tagline', e.target.value)}
                    placeholder="Turning fans into family"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {settings.site_logo_url ? (
                      <div className="relative">
                        <img src={settings.site_logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-xl border" />
                        <button
                          onClick={() => handleChange('site_logo_url', '')}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-secondary/50 transition-colors">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-sm">{uploading ? 'Uploading...' : 'Upload Logo'}</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                    </label>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Favicon (browser tab icon)</Label>
                  <div className="flex items-center gap-4">
                    {settings.site_favicon_url ? (
                      <div className="relative">
                        <img src={settings.site_favicon_url} alt="Favicon" className="w-12 h-12 object-contain rounded-lg border bg-white p-1" />
                        <button
                          onClick={() => handleChange('site_favicon_url', '')}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                        <Image className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-secondary/50 transition-colors">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-sm">{uploading ? 'Uploading...' : 'Upload Favicon'}</span>
                      </div>
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" className="hidden" onChange={handleFaviconUpload} disabled={uploading} />
                    </label>
                    <p className="text-xs text-muted-foreground">Square PNG or SVG (32×32 or larger). Replaces the default in browser tabs and search results.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Footer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Contact & Footer
              </CardTitle>
              <CardDescription>Contact info and footer text displayed on the site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={settings.contact_email || ''}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    placeholder="hello@tribeyangu.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Copyright Text</Label>
                  <Input
                    value={settings.copyright_text || ''}
                    onChange={(e) => handleChange('copyright_text', e.target.value)}
                    placeholder="© 2024 TribeYangu..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Footer Description</Label>
                  <Textarea
                    value={settings.footer_description || ''}
                    onChange={(e) => handleChange('footer_description', e.target.value)}
                    rows={2}
                    placeholder="A short description of your platform..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Socials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Social Links
              </CardTitle>
              <CardDescription>Social media profiles linked in the footer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Twitter / X URL</Label>
                  <Input value={settings.social_twitter || ''} onChange={(e) => handleChange('social_twitter', e.target.value)} placeholder="https://twitter.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input value={settings.social_instagram || ''} onChange={(e) => handleChange('social_instagram', e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input value={settings.social_youtube || ''} onChange={(e) => handleChange('social_youtube', e.target.value)} placeholder="https://youtube.com/..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-primary" />
                Platform Fees
              </CardTitle>
              <CardDescription>Configure platform commission rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Donation Fee (%)</Label>
                  <Input type="number" step="0.1" value={settings.donation_fee_percent || 5} onChange={(e) => handleChange('donation_fee_percent', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Merchandise Fee (%)</Label>
                  <Input type="number" step="0.1" value={settings.merchandise_fee_percent || 10} onChange={(e) => handleChange('merchandise_fee_percent', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Ticket Fee (%)</Label>
                  <Input type="number" step="0.1" value={settings.ticket_fee_percent || 10} onChange={(e) => handleChange('ticket_fee_percent', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Vote Fee (%)</Label>
                  <Input type="number" step="0.1" value={settings.vote_fee_percent || 20} onChange={(e) => handleChange('vote_fee_percent', parseFloat(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Withdrawal Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Minimum (KSh)</Label>
                  <Input type="number" value={settings.min_withdrawal || 500} onChange={(e) => handleChange('min_withdrawal', parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Maximum (KSh)</Label>
                  <Input type="number" value={settings.max_withdrawal || 150000} onChange={(e) => handleChange('max_withdrawal', parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Fee (KSh)</Label>
                  <Input type="number" value={settings.withdrawal_fee || 50} onChange={(e) => handleChange('withdrawal_fee', parseInt(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax & Shipping */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Tax & Shipping
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" step="0.1" value={settings.tax_rate || 16} onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Default Shipping Fee (KSh)</Label>
                  <Input type="number" value={settings.default_shipping_fee || 300} onChange={(e) => handleChange('default_shipping_fee', parseInt(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Partner Referral Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Level 1 (Direct) %</Label>
                  <Input type="number" step="0.5" value={settings.referral_level_1_percent || 5} onChange={(e) => handleChange('referral_level_1_percent', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Level 2 (Indirect) %</Label>
                  <Input type="number" step="0.5" value={settings.referral_level_2_percent || 2.5} onChange={(e) => handleChange('referral_level_2_percent', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Level 3 %</Label>
                  <Input type="number" step="0.5" value={settings.referral_level_3_percent || 1} onChange={(e) => handleChange('referral_level_3_percent', parseFloat(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMTP Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                SMTP Email Configuration
              </CardTitle>
              <CardDescription>Configure your own SMTP server (Gmail, cPanel, Zoho, Hostinger, etc.). Supports STARTTLS, implicit SSL and shared-hosting handshakes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>SMTP Notifications</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={settings.smtp_enabled === false || settings.smtp_enabled === 'false' ? 'false' : 'true'}
                    onChange={(e) => handleChange('smtp_enabled', e.target.value === 'true')}
                  >
                    <option value="true">Enabled — send all notifications via SMTP</option>
                    <option value="false">Disabled — skip outgoing emails</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input value={settings.smtp_host || ''} onChange={(e) => handleChange('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input type="number" value={settings.smtp_port || 587} onChange={(e) => handleChange('smtp_port', e.target.value === '' ? '' : parseInt(e.target.value, 10))} />
                </div>
                <div className="space-y-2">
                  <Label>Encryption</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={settings.smtp_encryption || 'tls'}
                    onChange={(e) => handleChange('smtp_encryption', e.target.value)}
                  >
                    <option value="tls">STARTTLS (port 587, recommended)</option>
                    <option value="ssl">Implicit SSL/TLS (port 465)</option>
                    <option value="none">None (plain, not recommended)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input value={settings.smtp_username || ''} onChange={(e) => handleChange('smtp_username', e.target.value)} placeholder="user@gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input type="password" value={settings.smtp_password || ''} onChange={(e) => handleChange('smtp_password', e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input value={settings.smtp_from_email || ''} onChange={(e) => handleChange('smtp_from_email', e.target.value)} placeholder="noreply@yoursite.com" />
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input value={settings.smtp_from_name || ''} onChange={(e) => handleChange('smtp_from_name', e.target.value)} placeholder="TribeYangu" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Reply-To (optional)</Label>
                  <Input value={settings.smtp_reply_to || ''} onChange={(e) => handleChange('smtp_reply_to', e.target.value)} placeholder="support@yoursite.com" />
                </div>
              </div>
              <div className="mt-6 border-t pt-6">
                <Label className="mb-2 block">Test SMTP delivery</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <Button type="button" onClick={handleTestSmtp} disabled={testing} className="gap-2">
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send test email
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  SMTP is saved as its own config first, then tested with the matching handshake and corrected default port.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Send a custom email</p>
                    <p className="text-xs text-muted-foreground">Compose with placeholders and preview the mobile-responsive template.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setComposerOpen(true)} className="gap-2">
                    <Mail className="w-4 h-4" /> Open composer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2FA Global Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>Enable or disable 2FA for all users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Allow 2FA</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={settings['2fa_enabled'] === true || settings['2fa_enabled'] === 'true' ? 'true' : 'false'}
                    onChange={(e) => handleChange('2fa_enabled', e.target.value === 'true')}
                  >
                    <option value="true">Enabled — users can opt in</option>
                    <option value="false">Disabled — 2FA unavailable</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Allowed Methods</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={settings['2fa_methods'] || 'both'}
                    onChange={(e) => handleChange('2fa_methods', e.target.value)}
                  >
                    <option value="both">SMS & Email</option>
                    <option value="sms">SMS Only</option>
                    <option value="email">Email Only</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys for Social Login */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Keys & Integrations
              </CardTitle>
              <CardDescription>Configure third-party service credentials. Social login keys are used platform-wide. Toggle below to expose the "Sign in with Google" button site-wide.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-3 mb-4">
                <div>
                  <p className="font-medium">Enable "Sign in with Google"</p>
                  <p className="text-xs text-muted-foreground">Shows the Google button on the login & signup pages.</p>
                </div>
                <Switch
                  checked={settings.social_google_enabled === true || settings.social_google_enabled === 'true'}
                  onCheckedChange={(c) => handleChange('social_google_enabled', c)}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Google Client ID</Label>
                  <Input value={settings.google_client_id || ''} onChange={(e) => handleChange('google_client_id', e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
                </div>
                <div className="space-y-2">
                  <Label>Google Client Secret</Label>
                  <Input type="password" value={settings.google_client_secret || ''} onChange={(e) => handleChange('google_client_secret', e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Africa's Talking API Key</Label>
                  <Input type="password" value={settings.at_api_key || ''} onChange={(e) => handleChange('at_api_key', e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Africa's Talking Username</Label>
                  <Input value={settings.at_username || ''} onChange={(e) => handleChange('at_username', e.target.value)} placeholder="sandbox" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Platform Toolkit
              </CardTitle>
              <CardDescription>Toggle which creator superpowers (events, gifts, merch, etc.) appear across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: 'feature_events_enabled', label: 'Events & Tickets' },
                  { key: 'feature_campaigns_enabled', label: 'Fundraising Campaigns' },
                  { key: 'feature_merchandise_enabled', label: 'Merchandise Store' },
                  { key: 'feature_gifts_enabled', label: 'Virtual Gifts' },
                  { key: 'feature_awards_enabled', label: 'Awards & Voting' },
                  { key: 'email_otp_login_enabled', label: 'Sign in with Email OTP' },
                  { key: 'signup_email_verification_required', label: 'Require email verification on signup' },
                ].map(({ key, label }) => {
                  const v = settings[key];
                  const defaultOn = key !== 'signup_email_verification_required';
                  const enabled = v === undefined ? defaultOn : v === true || v === 'true';
                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{enabled ? 'Visible across the platform' : 'Hidden from creator pages'}</p>
                      </div>
                      <Switch checked={enabled} onCheckedChange={(c) => handleChange(key, c)} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Settings Note</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Branding changes apply immediately across the site. Fee changes apply to new transactions only.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <EmailComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        allowRecipientEdit
        defaultSubject="A note from {{site_name}}"
        defaultBody={`Hi {{recipient_name}},\n\nWe wanted to reach out personally.\n\nThanks,\nThe {{site_name}} team`}
      />
    </DashboardLayout>
  );
};

export default AdminSettings;
