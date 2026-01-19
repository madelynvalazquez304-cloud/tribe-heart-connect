
-- Add referral columns to creators table
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.creators(id),
ADD COLUMN IF NOT EXISTS referral_tier INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_referral_earnings NUMERIC DEFAULT 0;

-- Create referrals table for tracking multi-level referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Create referral_earnings table
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  source_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  level INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gift_types table
CREATE TABLE IF NOT EXISTS public.gift_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  price NUMERIC NOT NULL,
  animation_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gifts table
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  gift_type_id UUID NOT NULL REFERENCES public.gift_types(id),
  sender_name TEXT,
  sender_phone TEXT,
  sender_email TEXT,
  quantity INTEGER DEFAULT 1,
  total_amount NUMERIC NOT NULL,
  platform_fee NUMERIC DEFAULT 0,
  creator_amount NUMERIC NOT NULL,
  message TEXT,
  payment_provider TEXT,
  payment_reference TEXT,
  mpesa_receipt TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Creators can view their referrals" ON public.referrals
FOR SELECT USING (
  referrer_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  OR referred_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage referrals" ON public.referrals
FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for referral_earnings
CREATE POLICY "Creators can view their earnings" ON public.referral_earnings
FOR SELECT USING (
  referrer_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage referral earnings" ON public.referral_earnings
FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for gift_types
CREATE POLICY "Anyone can view active gift types" ON public.gift_types
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage gift types" ON public.gift_types
FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for gifts
CREATE POLICY "Anyone can create gifts" ON public.gifts
FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can view their gifts" ON public.gifts
FOR SELECT USING (
  creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins can manage gifts" ON public.gifts
FOR ALL USING (public.is_admin(auth.uid()));

-- Insert default gift types
INSERT INTO public.gift_types (name, icon, price, display_order) VALUES
('Heart', '❤️', 10, 1),
('Star', '⭐', 25, 2),
('Fire', '🔥', 50, 3),
('Diamond', '💎', 100, 4),
('Crown', '👑', 250, 5),
('Rocket', '🚀', 500, 6),
('Trophy', '🏆', 1000, 7),
('Castle', '🏰', 2500, 8);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(NEW.username FROM 1 FOR 4) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_referral_code
BEFORE INSERT ON public.creators
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Function to create referral chain when a creator is referred
CREATE OR REPLACE FUNCTION public.create_referral_chain()
RETURNS TRIGGER AS $$
DECLARE
  current_referrer_id UUID;
  current_level INTEGER := 1;
BEGIN
  IF NEW.referred_by IS NOT NULL AND OLD.referred_by IS NULL THEN
    current_referrer_id := NEW.referred_by;
    
    WHILE current_referrer_id IS NOT NULL AND current_level <= 3 LOOP
      INSERT INTO public.referrals (referrer_id, referred_id, level)
      VALUES (current_referrer_id, NEW.id, current_level)
      ON CONFLICT DO NOTHING;
      
      SELECT referred_by INTO current_referrer_id
      FROM public.creators WHERE id = current_referrer_id;
      
      current_level := current_level + 1;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_referral_chain_trigger
AFTER UPDATE ON public.creators
FOR EACH ROW EXECUTE FUNCTION public.create_referral_chain();

-- Function to calculate referral earnings from transactions
CREATE OR REPLACE FUNCTION public.calculate_referral_earnings()
RETURNS TRIGGER AS $$
DECLARE
  ref RECORD;
  earning_percentage NUMERIC;
  earning_amount NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND NEW.type IN ('donation', 'merchandise', 'ticket', 'vote') THEN
    FOR ref IN 
      SELECT r.referrer_id, r.level, c.is_partner
      FROM public.referrals r
      JOIN public.creators c ON c.id = r.referrer_id
      WHERE r.referred_id = NEW.creator_id AND c.is_partner = true
    LOOP
      earning_percentage := CASE ref.level
        WHEN 1 THEN 5.0
        WHEN 2 THEN 2.5
        WHEN 3 THEN 1.0
        ELSE 0
      END;
      
      earning_amount := (NEW.net_amount * earning_percentage) / 100;
      
      IF earning_amount > 0 THEN
        INSERT INTO public.referral_earnings (
          referrer_id, source_creator_id, transaction_id, level, percentage, amount, status
        ) VALUES (
          ref.referrer_id, NEW.creator_id, NEW.id, ref.level, earning_percentage, earning_amount, 'completed'
        );
        
        UPDATE public.creators
        SET total_referral_earnings = total_referral_earnings + earning_amount
        WHERE id = ref.referrer_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER calculate_referral_earnings_trigger
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.calculate_referral_earnings();

-- Function to update gift stats
CREATE OR REPLACE FUNCTION public.update_gift_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.creators
    SET 
      total_supporters = total_supporters + 1,
      total_raised = total_raised + NEW.creator_amount
    WHERE id = NEW.creator_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_gift_stats_trigger
AFTER INSERT OR UPDATE ON public.gifts
FOR EACH ROW EXECUTE FUNCTION public.update_gift_stats();

-- Enable realtime for gifts
ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts;
