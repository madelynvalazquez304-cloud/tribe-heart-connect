import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, CreditCard, Phone, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

type PaymentProvider = 'mpesa' | 'paypal' | 'card';

interface PaymentConfig {
  id: string;
  name: string;
  provider: PaymentProvider;
  config: Json;
  is_active: boolean;
  is_primary: boolean;
}

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editingConfig, setEditingConfig] = useState<PaymentConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'mpesa' as PaymentProvider,
    is_active: true,
    is_primary: false,
    // M-PESA fields
    consumer_key: '',
    consumer_secret: '',
    paybill: '',
    passkey: '',
    environment: 'sandbox',
    // PayPal fields
    client_id: '',
    client_secret: '',
    paypal_environment: 'sandbox'
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ['payment-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentConfig[];
    }
  });

  const createConfig = useMutation({
    mutationFn: async (data: typeof formData) => {
      let config: Record<string, any> = {};
      
      if (data.provider === 'mpesa') {
        config = {
          consumer_key: data.consumer_key,
          consumer_secret: data.consumer_secret,
          paybill: data.paybill,
          passkey: data.passkey,
          environment: data.environment
        };
      } else if (data.provider === 'paypal') {
        config = {
          client_id: data.client_id,
          client_secret: data.client_secret,
          environment: data.paypal_environment
        };
      }

      const { error } = await supabase
        .from('payment_configs')
        .insert({
          name: data.name,
          provider: data.provider,
          config,
          is_active: data.is_active,
          is_primary: data.is_primary
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] });
      toast.success('Payment configuration created');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, ...data }: typeof formData & { id: string }) => {
      let config: Record<string, any> = {};
      
      if (data.provider === 'mpesa') {
        config = {
          consumer_key: data.consumer_key,
          consumer_secret: data.consumer_secret,
          paybill: data.paybill,
          passkey: data.passkey,
          environment: data.environment
        };
      } else if (data.provider === 'paypal') {
        config = {
          client_id: data.client_id,
          client_secret: data.client_secret,
          environment: data.paypal_environment
        };
      }

      const { error } = await supabase
        .from('payment_configs')
        .update({
          name: data.name,
          config,
          is_active: data.is_active,
          is_primary: data.is_primary
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] });
      toast.success('Payment configuration updated');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_configs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] });
      toast.success('Payment configuration deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setIsOpen(false);
    setEditingConfig(null);
    setFormData({
      name: '',
      provider: 'mpesa',
      is_active: true,
      is_primary: false,
      consumer_key: '',
      consumer_secret: '',
      paybill: '',
      passkey: '',
      environment: 'sandbox',
      client_id: '',
      client_secret: '',
      paypal_environment: 'sandbox'
    });
  };

  const handleEdit = (config: PaymentConfig) => {
    setEditingConfig(config);
    const configData = config.config as Record<string, any>;
    setFormData({
      name: config.name,
      provider: config.provider,
      is_active: config.is_active,
      is_primary: config.is_primary,
      consumer_key: configData.consumer_key || '',
      consumer_secret: configData.consumer_secret || '',
      paybill: configData.paybill || '',
      passkey: configData.passkey || '',
      environment: configData.environment || 'sandbox',
      client_id: configData.client_id || '',
      client_secret: configData.client_secret || '',
      paypal_environment: configData.environment || 'sandbox'
    });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    if (editingConfig) {
      updateConfig.mutate({ ...formData, id: editingConfig.id });
    } else {
      createConfig.mutate(formData);
    }
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskSecret = (secret: string, show: boolean) => {
    if (show) return secret;
    if (!secret) return '-';
    return secret.slice(0, 4) + '••••••••' + secret.slice(-4);
  };

  const mpesaConfigs = configs?.filter(c => c.provider === 'mpesa') || [];
  const paypalConfigs = configs?.filter(c => c.provider === 'paypal') || [];

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Payment Configuration</h1>
            <p className="text-muted-foreground mt-1">Manage M-PESA Daraja and PayPal settings</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            else setIsOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingConfig ? 'Edit Configuration' : 'Add Payment Configuration'}</DialogTitle>
                <DialogDescription>
                  Configure payment provider credentials
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Configuration Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Production M-PESA"
                  />
                </div>
                
                {!editingConfig && (
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={formData.provider === 'mpesa' ? 'default' : 'outline'}
                        className="gap-2"
                        onClick={() => setFormData({ ...formData, provider: 'mpesa' })}
                      >
                        <Phone className="w-4 h-4" />
                        M-PESA
                      </Button>
                      <Button
                        type="button"
                        variant={formData.provider === 'paypal' ? 'default' : 'outline'}
                        className="gap-2"
                        onClick={() => setFormData({ ...formData, provider: 'paypal' })}
                      >
                        <CreditCard className="w-4 h-4" />
                        PayPal
                      </Button>
                    </div>
                  </div>
                )}

                {formData.provider === 'mpesa' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="consumer_key">Consumer Key</Label>
                      <Input
                        id="consumer_key"
                        type="password"
                        value={formData.consumer_key}
                        onChange={(e) => setFormData({ ...formData, consumer_key: e.target.value })}
                        placeholder="Daraja Consumer Key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consumer_secret">Consumer Secret</Label>
                      <Input
                        id="consumer_secret"
                        type="password"
                        value={formData.consumer_secret}
                        onChange={(e) => setFormData({ ...formData, consumer_secret: e.target.value })}
                        placeholder="Daraja Consumer Secret"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paybill">Paybill/Till Number</Label>
                      <Input
                        id="paybill"
                        value={formData.paybill}
                        onChange={(e) => setFormData({ ...formData, paybill: e.target.value })}
                        placeholder="e.g., 174379"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passkey">Passkey</Label>
                      <Input
                        id="passkey"
                        type="password"
                        value={formData.passkey}
                        onChange={(e) => setFormData({ ...formData, passkey: e.target.value })}
                        placeholder="Daraja Passkey"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Environment</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={formData.environment === 'sandbox' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, environment: 'sandbox' })}
                        >
                          Sandbox
                        </Button>
                        <Button
                          type="button"
                          variant={formData.environment === 'production' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, environment: 'production' })}
                        >
                          Production
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {formData.provider === 'paypal' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="client_id">Client ID</Label>
                      <Input
                        id="client_id"
                        type="password"
                        value={formData.client_id}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                        placeholder="PayPal Client ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client_secret">Client Secret</Label>
                      <Input
                        id="client_secret"
                        type="password"
                        value={formData.client_secret}
                        onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                        placeholder="PayPal Client Secret"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Environment</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={formData.paypal_environment === 'sandbox' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, paypal_environment: 'sandbox' })}
                        >
                          Sandbox
                        </Button>
                        <Button
                          type="button"
                          variant={formData.paypal_environment === 'production' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, paypal_environment: 'production' })}
                        >
                          Production
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Active</Label>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="primary">Primary Configuration</Label>
                  <Switch
                    id="primary"
                    checked={formData.is_primary}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createConfig.isPending || updateConfig.isPending}>
                  {(createConfig.isPending || updateConfig.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingConfig ? 'Save Changes' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="mpesa" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mpesa" className="gap-2">
              <Phone className="w-4 h-4" />
              M-PESA Daraja
            </TabsTrigger>
            <TabsTrigger value="paypal" className="gap-2">
              <CreditCard className="w-4 h-4" />
              PayPal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mpesa">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : mpesaConfigs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Phone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No M-PESA configurations yet</p>
                  <p className="text-sm">Add your first Daraja configuration to accept M-PESA payments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {mpesaConfigs.map((config) => {
                  const configData = config.config as Record<string, any>;
                  return (
                    <Card key={config.id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{config.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              {configData.environment === 'production' ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Shield className="w-3 h-3" /> Production
                                </span>
                              ) : (
                                <span className="text-amber-600">Sandbox</span>
                              )}
                              {config.is_primary && (
                                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                  Primary
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Delete this configuration?')) {
                                deleteConfig.mutate(config.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Paybill</p>
                            <p className="font-medium">{configData.paybill || '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground flex items-center gap-1">
                              Consumer Key
                              <button onClick={() => toggleShowSecret(config.id + '_key')}>
                                {showSecrets[config.id + '_key'] ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                            </p>
                            <p className="font-mono text-xs">
                              {maskSecret(configData.consumer_key, showSecrets[config.id + '_key'])}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="paypal">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : paypalConfigs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No PayPal configurations yet</p>
                  <p className="text-sm">Add your PayPal Business API credentials</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {paypalConfigs.map((config) => {
                  const configData = config.config as Record<string, any>;
                  return (
                    <Card key={config.id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{config.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              {configData.environment === 'production' ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Shield className="w-3 h-3" /> Production
                                </span>
                              ) : (
                                <span className="text-amber-600">Sandbox</span>
                              )}
                              {config.is_primary && (
                                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                  Primary
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Delete this configuration?')) {
                                deleteConfig.mutate(config.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <p className="text-muted-foreground flex items-center gap-1">
                            Client ID
                            <button onClick={() => toggleShowSecret(config.id + '_client')}>
                              {showSecrets[config.id + '_client'] ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          </p>
                          <p className="font-mono text-xs">
                            {maskSecret(configData.client_id, showSecrets[config.id + '_client'])}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;
