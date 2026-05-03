-- Add feature toggles to allow admins to disable platform-wide modules
INSERT INTO public.platform_settings (key, value, category, description)
VALUES
  ('feature_events_enabled', 'true'::jsonb, 'features', 'Show events section across the platform'),
  ('feature_campaigns_enabled', 'true'::jsonb, 'features', 'Show fundraising campaigns across the platform'),
  ('feature_merchandise_enabled', 'true'::jsonb, 'features', 'Show merchandise stores across the platform'),
  ('feature_gifts_enabled', 'true'::jsonb, 'features', 'Show virtual gifting across the platform'),
  ('feature_awards_enabled', 'true'::jsonb, 'features', 'Show awards & voting across the platform')
ON CONFLICT (key) DO NOTHING;

-- Allow public read of features category so frontends can hide disabled modules
DROP POLICY IF EXISTS "Anyone can read branding and public settings" ON public.platform_settings;
CREATE POLICY "Anyone can read public settings"
  ON public.platform_settings FOR SELECT
  USING (category = ANY (ARRAY['public','branding','features']));