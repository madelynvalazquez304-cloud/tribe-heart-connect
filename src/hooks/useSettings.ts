import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentConfig {
  id: string;
  provider: 'mpesa' | 'paypal' | 'card';
  name: string;
  is_active: boolean;
  is_primary: boolean;
  config: {
    // M-PESA Daraja
    consumer_key?: string;
    consumer_secret?: string;
    paybill?: string;
    passkey?: string;
    callback_url?: string;
    // PayPal
    client_id?: string;
    client_secret?: string;
    mode?: 'sandbox' | 'live';
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const usePaymentConfigs = () => {
  return useQuery({
    queryKey: ['payment-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_configs')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as PaymentConfig[];
    }
  });
};

export const useActivePaymentConfig = (provider: 'mpesa' | 'paypal') => {
  return useQuery({
    queryKey: ['active-payment-config', provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('provider', provider)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as PaymentConfig | null;
    }
  });
};

export const useCreatePaymentConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: Partial<PaymentConfig>) => {
      const { data, error } = await supabase
        .from('payment_configs')
        .insert({
          provider: config.provider!,
          name: config.name!,
          is_active: config.is_active ?? false,
          is_primary: config.is_primary ?? false,
          config: config.config || {}
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] });
    }
  });
};

export const useUpdatePaymentConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] });
    }
  });
};

export const useDeletePaymentConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_configs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] });
    }
  });
};

export const usePlatformSettings = () => {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as PlatformSetting[];
    }
  });
};

export const useUpdatePlatformSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data, error } = await supabase
        .from('platform_settings')
        .update({ value })
        .eq('key', key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    }
  });
};
