-- 1. password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL,
  origin_url text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON public.password_reset_tokens(user_id);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Lock down: only service role (which bypasses RLS) can use it. No public policies needed,
-- but add an explicit deny-by-default policy for clarity.
DROP POLICY IF EXISTS "no_public_access_prt" ON public.password_reset_tokens;
CREATE POLICY "no_public_access_prt" ON public.password_reset_tokens
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 2. Settings
INSERT INTO public.platform_settings (key, value, category, description)
VALUES
  ('signup_welcome_email_enabled', 'true'::jsonb, 'email', 'Send a welcome email when a new user signs up'),
  ('password_reset_token_ttl_minutes', '30'::jsonb, 'email', 'How long password reset links are valid (minutes)')
ON CONFLICT (key) DO NOTHING;

-- 3. Notification templates: insert/upsert beautiful, mobile-responsive HTML

-- Helper: define a common base via CTE? Simpler: just upsert each.

-- WELCOME / SIGNUP
INSERT INTO public.notification_templates (event_type, channel, subject, body, is_active, placeholders)
VALUES (
  'welcome_signup', 'email',
  'Welcome to {{site_name}} 🎉',
  $html$
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
      <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;">
        <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.12);line-height:56px;font-size:28px;">❤️</div>
        <h1 style="color:#ffffff;font-size:24px;margin:16px 0 4px;">Welcome to {{site_name}}!</h1>
        <p style="color:#cbd5e1;margin:0;font-size:14px;">We're so glad you're here.</p>
      </td></tr>
      <tr><td style="padding:28px 24px;">
        <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{recipient_name}},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#334155;">Your account is ready. Discover incredible creators, support causes you love, and connect with your tribe — all in one place.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto;"><tr><td style="border-radius:12px;background:hsl(350,78%,55%);">
          <a href="{{site_url}}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:600;text-decoration:none;font-size:15px;">Explore now →</a>
        </td></tr></table>
        <p style="font-size:13px;line-height:1.6;color:#64748b;margin:24px 0 0;">Need help? Reach us at <a href="mailto:{{support_email}}" style="color:hsl(350,78%,55%);">{{support_email}}</a>.</p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:12px;color:#94a3b8;">© {{site_name}}</td></tr>
    </table>
  </td></tr></table></body></html>
$html$,
  true,
  '["site_name","site_url","support_email","recipient_name"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- PASSWORD RESET
INSERT INTO public.notification_templates (event_type, channel, subject, body, is_active, placeholders)
VALUES (
  'password_reset', 'email',
  'Reset your {{site_name}} password',
  $html$
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset password</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
      <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 24px;text-align:center;">
        <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.12);line-height:48px;font-size:24px;">🔑</div>
        <h1 style="color:#ffffff;font-size:22px;margin:14px 0 0;">Reset your password</h1>
      </td></tr>
      <tr><td style="padding:28px 24px;">
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hi {{recipient_name}},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#334155;">We received a request to reset the password for your {{site_name}} account. Click the button below to set a new one. This link expires in <strong>{{ttl_minutes}} minutes</strong>.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto;"><tr><td style="border-radius:12px;background:hsl(350,78%,55%);">
          <a href="{{action_url}}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:600;text-decoration:none;font-size:15px;">Reset password</a>
        </td></tr></table>
        <p style="font-size:12px;line-height:1.6;color:#64748b;margin:8px 0 0;text-align:center;word-break:break-all;">Or paste this link into your browser:<br><a href="{{action_url}}" style="color:hsl(350,78%,55%);">{{action_url}}</a></p>
        <p style="font-size:13px;line-height:1.6;color:#94a3b8;margin:24px 0 0;border-top:1px solid #e2e8f0;padding-top:16px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:12px;color:#94a3b8;">© {{site_name}} • <a href="mailto:{{support_email}}" style="color:#94a3b8;">{{support_email}}</a></td></tr>
    </table>
  </td></tr></table></body></html>
$html$,
  true,
  '["site_name","site_url","support_email","recipient_name","action_url","ttl_minutes"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ADMIN CUSTOM (used by admin "send custom email" / bulk send)
INSERT INTO public.notification_templates (event_type, channel, subject, body, is_active, placeholders)
VALUES (
  'admin_custom', 'email',
  '{{subject}}',
  $html$
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{subject}}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
      <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:24px;text-align:center;">
        <h1 style="color:#ffffff;font-size:20px;margin:0;">{{site_name}}</h1>
      </td></tr>
      <tr><td style="padding:28px 24px;font-size:15px;line-height:1.7;color:#334155;">
        <p style="margin:0 0 12px;">Hi {{recipient_name}},</p>
        <div>{{message_html}}</div>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:12px;color:#94a3b8;">© {{site_name}} • <a href="{{site_url}}" style="color:#94a3b8;">{{site_url}}</a></td></tr>
    </table>
  </td></tr></table></body></html>
$html$,
  true,
  '["site_name","site_url","recipient_name","subject","message_html"]'::jsonb
)
ON CONFLICT DO NOTHING;
