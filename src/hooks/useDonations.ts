import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Donation {
  id: string;
  creator_id: string;
  donor_name: string | null;
  donor_phone: string | null;
  donor_email: string | null;
  amount: number;
  currency: string;
  message: string | null;
  is_anonymous: boolean;
  payment_provider: string | null;
  payment_reference: string | null;
  mpesa_receipt: string | null;
  status: string;
  platform_fee: number;
  creator_amount: number;
  created_at: string;
  updated_at: string;
}

export const useCreatorDonations = (creatorId: string) => {
  return useQuery({
    queryKey: ['creator-donations', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Donation[];
    },
    enabled: !!creatorId
  });
};

export const useCreateDonation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (donation: Partial<Donation>) => {
      // Calculate fees (5% platform fee)
      const platformFeePercent = 0.05;
      const platformFee = Number((donation.amount! * platformFeePercent).toFixed(2));
      const creatorAmount = Number((donation.amount! - platformFee).toFixed(2));
      
      const insertData = {
        creator_id: donation.creator_id!,
        donor_name: donation.donor_name || null,
        donor_phone: donation.donor_phone || null,
        donor_email: donation.donor_email || null,
        amount: donation.amount!,
        message: donation.message || null,
        is_anonymous: donation.is_anonymous || false,
        payment_provider: donation.payment_provider as 'mpesa' | 'paypal' | 'card' | null,
        payment_reference: donation.payment_reference || null,
        platform_fee: platformFee,
        creator_amount: creatorAmount,
        status: 'pending'
      };
      
      const { data, error } = await supabase
        .from('donations')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creator-donations', data.creator_id] });
    }
  });
};

export const useUpdateDonationStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, mpesaReceipt }: { id: string; status: string; mpesaReceipt?: string }) => {
      const { data, error } = await supabase
        .from('donations')
        .update({ 
          status,
          mpesa_receipt: mpesaReceipt
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creator-donations', data.creator_id] });
    }
  });
};

// Get all donations for admin
export const useAllDonations = () => {
  return useQuery({
    queryKey: ['all-donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
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
