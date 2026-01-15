import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

const CreatorSettings = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const [formData, setFormData] = useState({
    mpesa_phone: creator?.mpesa_phone || '',
    paypal_email: creator?.paypal_email || ''
  });

  React.useEffect(() => {
    if (creator) {
      setFormData({
        mpesa_phone: creator.mpesa_phone || '',
        paypal_email: creator.paypal_email || ''
      });
    }
  }, [creator]);

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
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCreator.mutate(formData);
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your payment and account settings</p>
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
                <Input
                  id="mpesa_phone"
                  value={formData.mpesa_phone}
                  onChange={(e) => setFormData({ ...formData, mpesa_phone: e.target.value })}
                  placeholder="254712345678"
                />
                <p className="text-xs text-muted-foreground">Used for receiving withdrawals</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paypal_email">PayPal Email (Optional)</Label>
                <Input
                  id="paypal_email"
                  type="email"
                  value={formData.paypal_email}
                  onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                  placeholder="you@example.com"
                />
                <p className="text-xs text-muted-foreground">Alternative payment method</p>
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
      </div>
    </DashboardLayout>
  );
};

export default CreatorSettings;
