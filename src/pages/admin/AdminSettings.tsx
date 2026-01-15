import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Percent, DollarSign, Wallet, Truck, AlertCircle } from 'lucide-react';
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

  const { data: platformSettings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');
      
      if (error) throw error;
      return data as Setting[];
    }
  });

  useEffect(() => {
    if (platformSettings) {
      const settingsMap: Record<string, any> = {};
      platformSettings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    }
  }, [platformSettings]);

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const promises = Object.entries(updates).map(([key, value]) => 
        supabase
          .from('platform_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key)
      );
      
      const results = await Promise.all(promises);
      results.forEach(({ error }) => {
        if (error) throw error;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Settings saved');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(settings);
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
            <p className="text-muted-foreground mt-1">Configure fees, limits, and platform settings</p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          )}
        </div>

        <div className="grid gap-6">
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
                  <Label htmlFor="donation_fee">Donation Fee (%)</Label>
                  <Input
                    id="donation_fee"
                    type="number"
                    step="0.1"
                    value={settings.donation_fee_percent || 5}
                    onChange={(e) => handleChange('donation_fee_percent', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Platform fee on all donations</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchandise_fee">Merchandise Fee (%)</Label>
                  <Input
                    id="merchandise_fee"
                    type="number"
                    step="0.1"
                    value={settings.merchandise_fee_percent || 10}
                    onChange={(e) => handleChange('merchandise_fee_percent', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Platform fee on merchandise sales</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket_fee">Ticket Fee (%)</Label>
                  <Input
                    id="ticket_fee"
                    type="number"
                    step="0.1"
                    value={settings.ticket_fee_percent || 10}
                    onChange={(e) => handleChange('ticket_fee_percent', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Platform fee on event tickets</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vote_fee">Vote Fee (%)</Label>
                  <Input
                    id="vote_fee"
                    type="number"
                    step="0.1"
                    value={settings.vote_fee_percent || 20}
                    onChange={(e) => handleChange('vote_fee_percent', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Platform fee on voting payments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Withdrawal Settings
              </CardTitle>
              <CardDescription>Configure withdrawal limits and fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="min_withdrawal">Minimum Withdrawal (KSh)</Label>
                  <Input
                    id="min_withdrawal"
                    type="number"
                    value={settings.min_withdrawal || 500}
                    onChange={(e) => handleChange('min_withdrawal', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_withdrawal">Maximum Withdrawal (KSh)</Label>
                  <Input
                    id="max_withdrawal"
                    type="number"
                    value={settings.max_withdrawal || 150000}
                    onChange={(e) => handleChange('max_withdrawal', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdrawal_fee">Withdrawal Fee (KSh)</Label>
                  <Input
                    id="withdrawal_fee"
                    type="number"
                    value={settings.withdrawal_fee || 50}
                    onChange={(e) => handleChange('withdrawal_fee', parseInt(e.target.value))}
                  />
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
              <CardDescription>Configure tax rates and shipping fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.1"
                    value={settings.tax_rate || 16}
                    onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Applied to merchandise orders</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_shipping">Default Shipping Fee (KSh)</Label>
                  <Input
                    id="default_shipping"
                    type="number"
                    value={settings.default_shipping_fee || 300}
                    onChange={(e) => handleChange('default_shipping_fee', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Nairobi metropolitan area</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Settings Note</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Changes to fees and limits will apply to new transactions only. 
                    Existing pending transactions will use the rates at the time they were created.
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
