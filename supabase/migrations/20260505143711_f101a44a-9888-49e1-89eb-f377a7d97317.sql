
-- Brand deal requests from advertisers
CREATE TABLE public.brand_deal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website TEXT,
  industry TEXT,
  campaign_brief TEXT NOT NULL,
  target_audience TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  currency TEXT DEFAULT 'KES',
  deliverables TEXT,
  timeline_start DATE,
  timeline_end DATE,
  preferred_creator_username TEXT,
  preferred_category TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_deal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a brand deal request"
ON public.brand_deal_requests FOR INSERT
WITH CHECK (
  company_name IS NOT NULL AND length(trim(company_name)) > 0
  AND contact_email IS NOT NULL AND length(trim(contact_email)) > 0
  AND campaign_brief IS NOT NULL AND length(trim(campaign_brief)) > 0
  AND status = 'new'
);

CREATE POLICY "Admins can manage brand deal requests"
ON public.brand_deal_requests FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_brand_deal_requests_updated
BEFORE UPDATE ON public.brand_deal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brand deals (contracts assigned to creators)
CREATE TABLE public.brand_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID,
  creator_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  campaign_title TEXT NOT NULL,
  brief TEXT,
  deliverables TEXT,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  creator_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'offered',
  payment_status TEXT NOT NULL DEFAULT 'held',
  contract_url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all brand deals"
ON public.brand_deals FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Creators can view own brand deals"
ON public.brand_deals FOR SELECT
USING (creator_id = get_creator_id(auth.uid()));

CREATE POLICY "Creators can update own brand deal status"
ON public.brand_deals FOR UPDATE
USING (creator_id = get_creator_id(auth.uid()))
WITH CHECK (creator_id = get_creator_id(auth.uid()));

CREATE TRIGGER trg_brand_deals_updated
BEFORE UPDATE ON public.brand_deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_brand_deals_creator ON public.brand_deals(creator_id);
CREATE INDEX idx_brand_deal_requests_status ON public.brand_deal_requests(status);
