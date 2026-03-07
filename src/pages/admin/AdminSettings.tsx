import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Percent, DollarSign, Wallet, Truck, AlertCircle, Globe, Image, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface Setting {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  category: string | null;
}

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      setSettings(settingsMap);
    }
  }, [platformSettings]);

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const promises = Object.entries(updates).map(([key, value]) =>
        supabase.from('platform_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
      );
      const results = await Promise.all(promises);
      results.forEach(({ error }) => { if (error) throw error; });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('Settings saved');
      setHasChanges(false);
    },
    onError: (error: Error) => { toast.error(error.message); }
  });

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => { updateSettings.mutate(settings); };

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
    </DashboardLayout>
  );
};

export default AdminSettings;
