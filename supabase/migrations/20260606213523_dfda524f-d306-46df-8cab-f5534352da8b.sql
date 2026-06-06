
-- B2C withdrawal tracking columns
ALTER TABLE public.withdrawals 
  ADD COLUMN IF NOT EXISTS b2c_conversation_id text,
  ADD COLUMN IF NOT EXISTS b2c_originator_conversation_id text,
  ADD COLUMN IF NOT EXISTS b2c_result_code text,
  ADD COLUMN IF NOT EXISTS b2c_result_desc text,
  ADD COLUMN IF NOT EXISTS b2c_transaction_id text,
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_send_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS b2c_raw_callback jsonb;

CREATE INDEX IF NOT EXISTS withdrawals_b2c_conv_idx ON public.withdrawals (b2c_conversation_id);

-- Seed platform settings for B2C if missing
INSERT INTO public.platform_settings (key, value, category, description) VALUES
  ('b2c_auto_threshold', '50000'::jsonb, 'features', 'Withdrawals at or above this KES amount require manual admin review before B2C is sent'),
  ('b2c_enabled', 'false'::jsonb, 'features', 'Enable automated M-PESA B2C payouts')
ON CONFLICT (key) DO NOTHING;
