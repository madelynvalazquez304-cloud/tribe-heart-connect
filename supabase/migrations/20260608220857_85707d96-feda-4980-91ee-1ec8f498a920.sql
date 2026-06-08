
-- Extend brand_deals with escrow/contract/milestone fields
ALTER TABLE public.brand_deals
  ADD COLUMN IF NOT EXISTS contract_html text,
  ADD COLUMN IF NOT EXISTS contract_accepted_brand_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_accepted_creator_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_notes text,
  ADD COLUMN IF NOT EXISTS brand_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS escrow_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brand_email text,
  ADD COLUMN IF NOT EXISTS brand_contact_name text,
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- Brand-to-platform payments (escrow funding)
CREATE TABLE IF NOT EXISTS public.brand_deal_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.brand_deals(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'KES',
  method text NOT NULL CHECK (method IN ('mpesa','bank_transfer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  reference text,
  proof_url text,
  paid_by_email text,
  notes text,
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_deal_payments TO authenticated;
GRANT SELECT, INSERT ON public.brand_deal_payments TO anon;
GRANT ALL ON public.brand_deal_payments TO service_role;

ALTER TABLE public.brand_deal_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage brand payments" ON public.brand_deal_payments
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Creators view payments for their deals" ON public.brand_deal_payments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.brand_deals d
      WHERE d.id = brand_deal_payments.deal_id
        AND d.creator_id = public.get_creator_id(auth.uid())
    )
  );

CREATE POLICY "Anyone can submit a brand payment record" ON public.brand_deal_payments
  FOR INSERT TO anon WITH CHECK (status = 'pending');

CREATE TRIGGER set_brand_deal_payments_updated_at
  BEFORE UPDATE ON public.brand_deal_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log for brand deal status changes
CREATE TABLE IF NOT EXISTS public.brand_deal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.brand_deals(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  actor_role text,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.brand_deal_events TO authenticated;
GRANT ALL ON public.brand_deal_events TO service_role;

ALTER TABLE public.brand_deal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all events" ON public.brand_deal_events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can log events" ON public.brand_deal_events
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Creators view events for their deals" ON public.brand_deal_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.brand_deals d WHERE d.id = brand_deal_events.deal_id AND d.creator_id = public.get_creator_id(auth.uid()))
  );

-- Function: auto-confirm escrow when total confirmed payments >= deal amount
CREATE OR REPLACE FUNCTION public.update_deal_escrow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_paid numeric;
  deal_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO total_paid
    FROM public.brand_deal_payments
    WHERE deal_id = NEW.deal_id AND status = 'confirmed';

  SELECT total_amount INTO deal_total FROM public.brand_deals WHERE id = NEW.deal_id;

  UPDATE public.brand_deals
    SET escrow_amount = total_paid,
        payment_status = CASE WHEN total_paid >= COALESCE(deal_total,0) AND deal_total > 0 THEN 'funded' ELSE payment_status END
    WHERE id = NEW.deal_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_deal_payment_escrow ON public.brand_deal_payments;
CREATE TRIGGER trg_brand_deal_payment_escrow
  AFTER INSERT OR UPDATE ON public.brand_deal_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_deal_escrow();

-- Function: auto-release escrow to creator when conditions met
CREATE OR REPLACE FUNCTION public.release_brand_deal(_deal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d record;
BEGIN
  SELECT * INTO d FROM public.brand_deals WHERE id = _deal_id FOR UPDATE;
  IF NOT FOUND OR d.released_at IS NOT NULL THEN RETURN; END IF;
  IF d.payment_status <> 'funded' THEN RETURN; END IF;

  UPDATE public.brand_deals
    SET status = 'paid', payment_status = 'released', released_at = now()
    WHERE id = _deal_id;

  INSERT INTO public.transactions (creator_id, type, amount, fee, net_amount, status, reference_type, reference_id, description)
  VALUES (d.creator_id, 'donation', d.creator_amount, COALESCE(d.platform_fee,0), d.creator_amount, 'completed', 'brand_deal', d.id, 'Brand deal payout: ' || COALESCE(d.campaign_title, 'Brand Deal'))
  ON CONFLICT DO NOTHING;

  INSERT INTO public.brand_deal_events(deal_id, event_type, details)
  VALUES (_deal_id, 'released', jsonb_build_object('amount', d.creator_amount));
END;
$$;
