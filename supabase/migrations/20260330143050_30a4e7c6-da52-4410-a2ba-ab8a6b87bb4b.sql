-- Allow anyone to read branding settings (site name, logo, copyright, etc.)
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.platform_settings;

CREATE POLICY "Anyone can read branding and public settings"
  ON public.platform_settings FOR SELECT
  USING (category IN ('public', 'branding'));

-- Seed branding settings if they don't exist
INSERT INTO public.platform_settings (key, value, category, description) VALUES
  ('site_name', '"TribeYangu"', 'branding', 'Website name'),
  ('site_tagline', '"Turning fans into family"', 'branding', 'Website tagline'),
  ('site_logo_url', '""', 'branding', 'Logo URL'),
  ('contact_email', '"hello@tribeyangu.com"', 'branding', 'Contact email'),
  ('copyright_text', '"© 2025 TribeYangu. Made with ❤️ for African creators."', 'branding', 'Footer copyright'),
  ('footer_description', '"Turning fans into family and support into impact."', 'branding', 'Footer description'),
  ('social_twitter', '""', 'branding', 'Twitter URL'),
  ('social_instagram', '""', 'branding', 'Instagram URL'),
  ('social_youtube', '""', 'branding', 'YouTube URL'),
  ('contact_phone', '""', 'branding', 'Contact phone number'),
  ('contact_address', '""', 'branding', 'Physical address')
ON CONFLICT DO NOTHING;

-- Seed admin-only settings
INSERT INTO public.platform_settings (key, value, category, description) VALUES
  ('smtp_host', '""', 'email', 'SMTP host'),
  ('smtp_port', '587', 'email', 'SMTP port'),
  ('smtp_username', '""', 'email', 'SMTP username'),
  ('smtp_password', '""', 'email', 'SMTP password'),
  ('smtp_from_email', '""', 'email', 'From email'),
  ('smtp_from_name', '""', 'email', 'From display name'),
  ('2fa_enabled', 'false', 'security', '2FA global toggle'),
  ('2fa_methods', '"both"', 'security', 'Allowed 2FA methods'),
  ('google_client_id', '""', 'integrations', 'Google OAuth Client ID'),
  ('google_client_secret', '""', 'integrations', 'Google OAuth Client Secret'),
  ('at_api_key', '""', 'integrations', 'Africa''s Talking API Key'),
  ('at_username', '""', 'integrations', 'Africa''s Talking Username')
ON CONFLICT DO NOTHING;