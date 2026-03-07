import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  site_name: string;
  site_tagline: string;
  site_logo_url: string;
  contact_email: string;
  copyright_text: string;
  footer_description: string;
  social_twitter: string;
  social_instagram: string;
  social_youtube: string;
}

const defaults: SiteSettings = {
  site_name: 'TribeYangu',
  site_tagline: 'Turning fans into family',
  site_logo_url: '',
  contact_email: 'hello@tribeyangu.com',
  copyright_text: '© 2024 TribeYangu. Made with ❤️ for African creators.',
  footer_description: 'Turning fans into family and support into impact. Empowering African creators to build sustainable communities.',
  social_twitter: '',
  social_instagram: '',
  social_youtube: '',
};

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .eq('category', 'branding');

      if (error) throw error;

      const settings = { ...defaults };
      data?.forEach((row) => {
        const key = row.key as keyof SiteSettings;
        if (key in settings) {
          settings[key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
        }
      });
      return settings;
    },
    staleTime: 5 * 60 * 1000,
  });
};
