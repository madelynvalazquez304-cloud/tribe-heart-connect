
-- Notification templates for payment confirmations
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  subject text,
  body text NOT NULL,
  is_active boolean DEFAULT true,
  placeholders jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_type, channel)
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification templates"
  ON public.notification_templates FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read active templates"
  ON public.notification_templates FOR SELECT
  USING (is_active = true);

-- Notification logs
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.notification_templates(id),
  recipient text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  status text NOT NULL DEFAULT 'pending',
  payload jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification logs"
  ON public.notification_logs FOR ALL
  USING (public.is_admin(auth.uid()));

-- User 2FA settings
CREATE TABLE public.user_2fa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_enabled boolean DEFAULT false,
  method text DEFAULT 'sms',
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own 2FA settings"
  ON public.user_2fa_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all 2FA settings"
  ON public.user_2fa_settings FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Seed default payment confirmation templates
INSERT INTO public.notification_templates (event_type, channel, subject, body, placeholders) VALUES
  ('donation_confirmed', 'sms', NULL, 'Hi {{donor_name}}, your donation of KES {{amount}} to {{creator_name}} has been received. Receipt: {{receipt}}. Thank you for supporting!', '["donor_name","amount","creator_name","receipt"]'::jsonb),
  ('gift_confirmed', 'sms', NULL, 'Hi {{sender_name}}, your gift of KES {{amount}} to {{creator_name}} was sent successfully! Receipt: {{receipt}}.', '["sender_name","amount","creator_name","receipt"]'::jsonb),
  ('ticket_confirmed', 'sms', NULL, 'Hi {{buyer_name}}, your ticket for {{event_name}} has been confirmed! Ticket code: {{ticket_code}}. Amount: KES {{amount}}.', '["buyer_name","event_name","ticket_code","amount"]'::jsonb),
  ('order_confirmed', 'sms', NULL, 'Hi {{customer_name}}, your order {{order_number}} of KES {{amount}} has been confirmed. We will notify you when it ships!', '["customer_name","order_number","amount"]'::jsonb),
  ('vote_confirmed', 'sms', NULL, 'Your {{vote_count}} vote(s) for {{creator_name}} in {{award_name}} have been confirmed! Receipt: {{receipt}}.', '["vote_count","creator_name","award_name","receipt"]'::jsonb);

-- Add updated_at triggers
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
