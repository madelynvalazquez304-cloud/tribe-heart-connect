-- Add partner percentage settings to platform_settings
INSERT INTO public.platform_settings (key, value, description, category) 
VALUES 
  ('referral_level_1_percent', '5', 'Commission percentage for direct referrals (Level 1)', 'partners'),
  ('referral_level_2_percent', '2.5', 'Commission percentage for tier 2 referrals (Level 2)', 'partners'),
  ('referral_level_3_percent', '1', 'Commission percentage for tier 3 referrals (Level 3)', 'partners')
ON CONFLICT (key) DO NOTHING;

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 8-character alphanumeric code
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM creators WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate referral code on creator creation or update if missing
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_unique_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_referral_code ON creators;

-- Create trigger for auto-generating referral codes
CREATE TRIGGER trigger_auto_referral_code
  BEFORE INSERT OR UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Generate referral codes for existing creators that don't have one
UPDATE creators 
SET referral_code = generate_unique_referral_code()
WHERE referral_code IS NULL OR referral_code = '';