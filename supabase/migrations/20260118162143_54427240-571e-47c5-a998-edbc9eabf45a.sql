-- Create campaigns table for crowdfunding
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  banner_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_featured BOOLEAN DEFAULT false,
  supporter_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Public can view active campaigns
CREATE POLICY "Anyone can view active campaigns"
ON public.campaigns FOR SELECT
USING (status IN ('active', 'completed'));

-- Creators can manage their own campaigns
CREATE POLICY "Creators can manage own campaigns"
ON public.campaigns FOR ALL
USING (creator_id = public.get_creator_id(auth.uid()))
WITH CHECK (creator_id = public.get_creator_id(auth.uid()));

-- Admins can manage all campaigns
CREATE POLICY "Admins can manage all campaigns"
ON public.campaigns FOR ALL
USING (public.is_admin(auth.uid()));

-- Create campaign contributions table
CREATE TABLE public.campaign_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  donor_name TEXT,
  donor_phone TEXT,
  donor_email TEXT,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  payment_provider TEXT,
  payment_reference TEXT,
  mpesa_receipt TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_contributions ENABLE ROW LEVEL SECURITY;

-- Public can view completed contributions
CREATE POLICY "Anyone can view completed contributions"
ON public.campaign_contributions FOR SELECT
USING (status = 'completed');

-- Anyone can create contributions
CREATE POLICY "Anyone can create contributions"
ON public.campaign_contributions FOR INSERT
WITH CHECK (true);

-- Creators can view all contributions to their campaigns
CREATE POLICY "Creators can view own campaign contributions"
ON public.campaign_contributions FOR SELECT
USING (
  campaign_id IN (
    SELECT id FROM public.campaigns 
    WHERE creator_id = public.get_creator_id(auth.uid())
  )
);

-- Admins can manage all contributions
CREATE POLICY "Admins can manage all contributions"
ON public.campaign_contributions FOR ALL
USING (public.is_admin(auth.uid()));

-- Trigger to update campaign amounts when contribution is completed
CREATE OR REPLACE FUNCTION public.update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.campaigns
    SET 
      current_amount = current_amount + NEW.amount,
      supporter_count = supporter_count + 1,
      status = CASE 
        WHEN current_amount + NEW.amount >= goal_amount THEN 'completed'
        ELSE status
      END
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_campaign_stats_trigger
AFTER INSERT OR UPDATE ON public.campaign_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_stats();

-- Add trigger for updated_at
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();