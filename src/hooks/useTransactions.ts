import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Transaction {
  id: string;
  creator_id: string;
  type: 'donation' | 'merchandise' | 'ticket' | 'vote' | 'withdrawal' | 'refund' | 'fee' | 'payout';
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  balance_after: number | null;
  payment_provider: string | null;
  payment_reference: string | null;
  status: string;
  created_at: string;
}

export const useCreatorTransactions = (creatorId: string) => {
  return useQuery({
    queryKey: ['creator-transactions', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!creatorId
  });
};

export const useAllTransactions = () => {
  return useQuery({
    queryKey: ['all-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          creator:creators(username, display_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: Partial<Transaction>) => {
      const insertData = {
        creator_id: transaction.creator_id!,
        type: transaction.type!,
        amount: transaction.amount!,
        fee: transaction.fee || 0,
        net_amount: transaction.net_amount!,
        currency: transaction.currency || 'KES',
        reference_type: transaction.reference_type || null,
        reference_id: transaction.reference_id || null,
        description: transaction.description || null,
        payment_provider: transaction.payment_provider as 'mpesa' | 'paypal' | 'card' | null,
        payment_reference: transaction.payment_reference || null,
        status: transaction.status || 'completed'
      };
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creator-transactions', data.creator_id] });
      queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
    }
  });
};

export const useCreatorBalance = (creatorId: string) => {
  return useQuery({
    queryKey: ['creator-balance', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, net_amount')
        .eq('creator_id', creatorId)
        .eq('status', 'completed');
      
      if (error) throw error;
      
      let balance = 0;
      for (const tx of data || []) {
        if (['donation', 'merchandise', 'ticket', 'vote'].includes(tx.type)) {
          balance += Number(tx.net_amount);
        } else if (['withdrawal', 'payout'].includes(tx.type)) {
          balance -= Number(tx.net_amount);
        }
      }
      
      return balance;
    },
    enabled: !!creatorId
  });
};
