import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureFlags {
  events: boolean;
  campaigns: boolean;
  merchandise: boolean;
  gifts: boolean;
  awards: boolean;
}

const defaults: FeatureFlags = {
  events: true,
  campaigns: true,
  merchandise: true,
  gifts: true,
  awards: true,
};

const KEY_MAP: Record<string, keyof FeatureFlags> = {
  feature_events_enabled: 'events',
  feature_campaigns_enabled: 'campaigns',
  feature_merchandise_enabled: 'merchandise',
  feature_gifts_enabled: 'gifts',
  feature_awards_enabled: 'awards',
};

const truthy = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

export const useFeatureFlags = () => {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async (): Promise<FeatureFlags> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .eq('category', 'features');
      if (error) throw error;
      const flags: FeatureFlags = { ...defaults };
      (data || []).forEach((row: any) => {
        const f = KEY_MAP[row.key];
        if (f) flags[f] = truthy(row.value);
      });
      return flags;
    },
    staleTime: 60 * 1000,
    placeholderData: defaults,
  });
};

export const useSocialAuthEnabled = () => {
  return useQuery({
    queryKey: ['social-auth-flags'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['social_google_enabled', 'email_otp_login_enabled', 'signup_email_verification_required']);
      const map: Record<string, boolean> = { google: false, emailOtp: true, requireEmailVerify: false };
      (data || []).forEach((row: any) => {
        if (row.key === 'social_google_enabled') map.google = truthy(row.value);
        if (row.key === 'email_otp_login_enabled') map.emailOtp = truthy(row.value);
        if (row.key === 'signup_email_verification_required') map.requireEmailVerify = truthy(row.value);
      });
      return map;
    },
    staleTime: 60 * 1000,
    placeholderData: { google: false, emailOtp: true, requireEmailVerify: false },
  });
};