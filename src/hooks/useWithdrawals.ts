import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Withdrawal {
  id: string;
  creator_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  payment_method: string | null;
  payment_details: any;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  processed_by: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export const useCreatorWithdrawals = (creatorId: string) => {
  return useQuery({
    queryKey: ['creator-withdrawals', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Withdrawal[];
    },
    enabled: !!creatorId
  });
};

export const useCreateWithdrawal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ creatorId, amount, paymentMethod, paymentDetails }: {
      creatorId: string;
      amount: number;
      paymentMethod: 'mpesa' | 'paypal';
      paymentDetails: any;
    }) => {
      const fee = 50; // Fixed withdrawal fee
      const netAmount = amount - fee;
      
      const { data, error } = await supabase
        .from('withdrawals')
        .insert({
          creator_id: creatorId,
          amount,
          fee,
          net_amount: netAmount,
          payment_method: paymentMethod,
          payment_details: paymentDetails,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creator-withdrawals', data.creator_id] });
    }
  });
};

export const useAllWithdrawals = () => {
  return useQuery({
    queryKey: ['all-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          creator:creators(username, display_name, mpesa_phone, paypal_email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useProcessWithdrawal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, rejectionReason, reference, processedBy }: {
      id: string;
      status: 'approved' | 'processing' | 'completed' | 'rejected';
      rejectionReason?: string;
      reference?: string;
      processedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('withdrawals')
        .update({
          status,
          rejection_reason: rejectionReason,
          reference,
          processed_by: processedBy,
          processed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-withdrawals'] });
    }
  });
};
