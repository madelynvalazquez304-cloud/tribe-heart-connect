-- Settings
INSERT INTO public.platform_settings (key, value, description, category) VALUES
  ('withdrawal_min_amount', '500'::jsonb, 'Minimum withdrawal amount (KES)', 'features'),
  ('withdrawal_fee', '50'::jsonb, 'Flat withdrawal fee (KES)', 'features'),
  ('withdrawal_approval_threshold', '10000'::jsonb, 'Withdrawals at or above this net amount require manual admin approval', 'payments')
ON CONFLICT (key) DO NOTHING;

-- Tighten RLS: creators may only read their own withdrawals
DROP POLICY IF EXISTS "Creators can manage own withdrawals" ON public.withdrawals;
CREATE POLICY "Creators can view own withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (creator_id = public.get_creator_id(auth.uid()));

GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;

-- Available balance = completed balance minus funds locked in open withdrawals
CREATE OR REPLACE FUNCTION public.get_creator_available_balance(_creator_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    public.get_creator_balance(_creator_id) - COALESCE((
      SELECT SUM(w.amount) FROM public.withdrawals w
      WHERE w.creator_id = _creator_id
        AND w.status IN ('pending','approved','processing')
    ), 0), 0)
$$;

-- Secure withdrawal request
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _payment_details jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator public.creators;
  v_min numeric;
  v_fee numeric;
  v_threshold numeric;
  v_available numeric;
  v_net numeric;
  v_id uuid;
BEGIN
  SELECT * INTO v_creator FROM public.creators WHERE user_id = auth.uid() LIMIT 1;
  IF v_creator.id IS NULL THEN
    RAISE EXCEPTION 'No creator profile found';
  END IF;
  IF v_creator.status <> 'approved'::public.creator_status THEN
    RAISE EXCEPTION 'Your creator account is not approved for payouts';
  END IF;
  IF COALESCE(v_creator.mpesa_phone, '') = '' THEN
    RAISE EXCEPTION 'Add your M-PESA phone number in settings before withdrawing';
  END IF;

  SELECT COALESCE((value)::text::numeric, 500) INTO v_min FROM public.platform_settings WHERE key = 'withdrawal_min_amount';
  SELECT COALESCE((value)::text::numeric, 50) INTO v_fee FROM public.platform_settings WHERE key = 'withdrawal_fee';
  SELECT COALESCE((value)::text::numeric, 10000) INTO v_threshold FROM public.platform_settings WHERE key = 'withdrawal_approval_threshold';
  v_min := COALESCE(v_min, 500);
  v_fee := COALESCE(v_fee, 50);
  v_threshold := COALESCE(v_threshold, 10000);

  IF _amount IS NULL OR _amount <= 0 OR _amount <> floor(_amount) THEN
    RAISE EXCEPTION 'Enter a valid whole withdrawal amount';
  END IF;
  IF _amount < v_min THEN
    RAISE EXCEPTION 'Minimum withdrawal is KES %', v_min;
  END IF;
  IF _amount <= v_fee THEN
    RAISE EXCEPTION 'Amount must be greater than the KES % fee', v_fee;
  END IF;

  -- Lock creator row to serialise concurrent requests
  PERFORM 1 FROM public.creators WHERE id = v_creator.id FOR UPDATE;

  v_available := public.get_creator_available_balance(v_creator.id);
  IF _amount > v_available THEN
    RAISE EXCEPTION 'Insufficient available balance (KES %)', v_available;
  END IF;

  v_net := _amount - v_fee;

  INSERT INTO public.withdrawals (creator_id, amount, fee, net_amount, payment_method, payment_details, status, requires_review)
  VALUES (v_creator.id, _amount, v_fee, v_net, 'mpesa'::public.payment_provider,
          COALESCE(_payment_details, '{}'::jsonb) || jsonb_build_object('phone', v_creator.mpesa_phone),
          'pending'::public.withdrawal_status, (v_net >= v_threshold))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_available_balance(uuid) TO authenticated, service_role;

-- Atomic payout claim used by the B2C edge function (prevents double payouts)
CREATE OR REPLACE FUNCTION public.claim_withdrawal_for_payout(_withdrawal_id uuid, _admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.withdrawals;
  v_balance numeric;
BEGIN
  SELECT * INTO w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF w.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Withdrawal not found');
  END IF;
  IF w.status NOT IN ('pending','approved') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Withdrawal already ' || w.status);
  END IF;
  IF w.requires_review AND w.status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This withdrawal requires admin approval first', 'requiresReview', true);
  END IF;

  -- Balance must still cover this payout (excluding this row's own lock)
  v_balance := public.get_creator_balance(w.creator_id) - COALESCE((
    SELECT SUM(x.amount) FROM public.withdrawals x
    WHERE x.creator_id = w.creator_id AND x.id <> w.id AND x.status IN ('pending','approved','processing')
  ), 0);
  IF w.amount > v_balance THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Creator balance no longer covers this payout');
  END IF;

  UPDATE public.withdrawals
    SET status = 'processing'::public.withdrawal_status,
        auto_send_attempted_at = now(),
        processed_by = _admin_id
    WHERE id = _withdrawal_id;

  RETURN jsonb_build_object('ok', true, 'withdrawal', to_jsonb(w));
END;
$$;

REVOKE ALL ON FUNCTION public.claim_withdrawal_for_payout(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_withdrawal_for_payout(uuid, uuid) TO service_role;