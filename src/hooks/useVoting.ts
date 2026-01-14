import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AwardCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  banner_url: string | null;
  vote_fee: number;
  is_active: boolean;
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AwardNominee {
  id: string;
  award_id: string;
  creator_id: string;
  total_votes: number;
  is_winner: boolean;
  created_at: string;
  creator?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    category?: { name: string; icon: string } | null;
  };
}

export interface Vote {
  id: string;
  nominee_id: string;
  voter_phone: string | null;
  voter_email: string | null;
  vote_count: number;
  amount_paid: number;
  payment_provider: string | null;
  payment_reference: string | null;
  mpesa_receipt: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  platform_fee: number;
  created_at: string;
}

export const useAwardCategories = () => {
  return useQuery({
    queryKey: ['award-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('award_categories')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AwardCategory[];
    }
  });
};

export const useAllAwardCategories = () => {
  return useQuery({
    queryKey: ['all-award-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('award_categories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AwardCategory[];
    }
  });
};

export const useAwardNominees = (awardId: string) => {
  return useQuery({
    queryKey: ['award-nominees', awardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('award_nominees')
        .select(`
          *,
          creator:creators(username, display_name, avatar_url, category:creator_categories(name, icon))
        `)
        .eq('award_id', awardId)
        .order('total_votes', { ascending: false });
      
      if (error) throw error;
      return data as AwardNominee[];
    },
    enabled: !!awardId
  });
};

export const useCreateAward = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (award: Partial<AwardCategory>) => {
      const slug = award.name!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data, error } = await supabase
        .from('award_categories')
        .insert({
          name: award.name!,
          slug,
          description: award.description,
          icon: award.icon,
          banner_url: award.banner_url,
          vote_fee: award.vote_fee || 10,
          is_active: award.is_active ?? true,
          voting_starts_at: award.voting_starts_at,
          voting_ends_at: award.voting_ends_at
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['award-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-award-categories'] });
    }
  });
};

export const useUpdateAward = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AwardCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('award_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['award-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-award-categories'] });
    }
  });
};

export const useAddNominee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ awardId, creatorId }: { awardId: string; creatorId: string }) => {
      const { data, error } = await supabase
        .from('award_nominees')
        .insert({
          award_id: awardId,
          creator_id: creatorId
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['award-nominees', data.award_id] });
    }
  });
};

export const useCreateVote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vote: {
      nomineeId: string;
      voteCount: number;
      amountPaid: number;
      voterPhone?: string;
      voterEmail?: string;
      paymentProvider: 'mpesa' | 'paypal';
      paymentReference: string;
    }) => {
      const platformFee = vote.amountPaid * 0.15; // 15% platform fee
      
      const { data, error } = await supabase
        .from('votes')
        .insert({
          nominee_id: vote.nomineeId,
          vote_count: vote.voteCount,
          amount_paid: vote.amountPaid,
          voter_phone: vote.voterPhone,
          voter_email: vote.voterEmail,
          payment_provider: vote.paymentProvider,
          payment_reference: vote.paymentReference,
          platform_fee: platformFee,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['award-nominees'] });
    }
  });
};

export const useAllVotes = () => {
  return useQuery({
    queryKey: ['all-votes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('votes')
        .select(`
          *,
          nominee:award_nominees(
            creator:creators(username, display_name),
            award:award_categories(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};
