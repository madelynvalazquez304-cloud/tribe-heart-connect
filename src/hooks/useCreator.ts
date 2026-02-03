import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Creator {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  tribe_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  category_id: string | null;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  total_supporters: number;
  total_raised: number;
  total_votes: number;
  is_verified: boolean;
  kyc_verified: boolean;
  mpesa_phone: string | null;
  paypal_email: string | null;
  rejection_reason: string | null;
  suspension_reason: string | null;
  approved_at: string | null;
  referred_by: string | null;
  referral_code: string | null;
  referral_tier: number | null;
  total_referral_earnings: number | null;
  is_partner: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorLink {
  id: string;
  creator_id: string;
  title: string;
  url: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  clicks: number;
  created_at: string;
  updated_at: string;
}

export const useMyCreator = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-creator', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Creator | null;
    },
    enabled: !!user
  });
};

export const useCreatorByUsername = (username: string) => {
  return useQuery({
    queryKey: ['creator', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select(`
          *,
          category:creator_categories(name, icon)
        `)
        .eq('username', username.toLowerCase())
        .maybeSingle();
      
      if (error) throw error;
      return data as Creator & { category: { name: string; icon: string } | null } | null;
    },
    enabled: !!username
  });
};

export const useCreatorLinks = (creatorId: string) => {
  return useQuery({
    queryKey: ['creator-links', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_links')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CreatorLink[];
    },
    enabled: !!creatorId
  });
};

export const useCreateCreator = () => {
  const queryClient = useQueryClient();
  const { user, refreshRoles } = useAuth();
  
  return useMutation({
    mutationFn: async (creatorData: Partial<Creator>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('creators')
        .insert({
          user_id: user.id,
          username: creatorData.username!.toLowerCase(),
          display_name: creatorData.display_name!,
          tribe_name: creatorData.tribe_name,
          bio: creatorData.bio,
          category_id: creatorData.category_id,
          mpesa_phone: creatorData.mpesa_phone,
          paypal_email: creatorData.paypal_email,
          referred_by: creatorData.referred_by
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add creator role
      await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'creator' });
      
      await refreshRoles();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-creator'] });
    }
  });
};

export const useUpdateCreator = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Creator> & { id: string }) => {
      const { data, error } = await supabase
        .from('creators')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-creator'] });
      queryClient.invalidateQueries({ queryKey: ['creator', data.username] });
    }
  });
};

export const useCreatorCategories = () => {
  return useQuery({
    queryKey: ['creator-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
};
