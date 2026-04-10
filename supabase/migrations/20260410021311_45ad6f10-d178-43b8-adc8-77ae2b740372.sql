
-- Clean up duplicate triggers

-- award_categories: keep only one auto-add nominees trigger
DROP TRIGGER IF EXISTS auto_add_category_nominees_trigger ON award_categories;
DROP TRIGGER IF EXISTS auto_add_nominees_trigger ON award_categories;
DROP TRIGGER IF EXISTS award_auto_add_nominees ON award_categories;

-- campaign_contributions: keep only one
DROP TRIGGER IF EXISTS trg_update_campaign_stats ON campaign_contributions;
DROP TRIGGER IF EXISTS update_campaign_stats_trigger ON campaign_contributions;

-- campaigns: keep only one updated_at
DROP TRIGGER IF EXISTS set_updated_at ON campaigns;
DROP TRIGGER IF EXISTS set_updated_at_campaigns ON campaigns;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;

-- creators: clean duplicates
DROP TRIGGER IF EXISTS auto_generate_referral_code_trigger ON creators;
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON creators;
DROP TRIGGER IF EXISTS set_referral_code ON creators;
DROP TRIGGER IF EXISTS trigger_auto_referral_code ON creators;
DROP TRIGGER IF EXISTS trigger_generate_referral_code ON creators;
DROP TRIGGER IF EXISTS set_updated_at ON creators;
DROP TRIGGER IF EXISTS set_updated_at_creators ON creators;
DROP TRIGGER IF EXISTS update_creators_updated_at ON creators;
DROP TRIGGER IF EXISTS sync_creator_role_on_approval ON creators;
DROP TRIGGER IF EXISTS sync_creator_role_trigger ON creators;
DROP TRIGGER IF EXISTS create_referral_chain_trigger ON creators;

-- donations: clean duplicates
DROP TRIGGER IF EXISTS set_updated_at ON donations;
DROP TRIGGER IF EXISTS set_updated_at_donations ON donations;
DROP TRIGGER IF EXISTS update_donations_updated_at ON donations;
DROP TRIGGER IF EXISTS trg_update_creator_donation_stats ON donations;
DROP TRIGGER IF EXISTS update_creator_donation_stats_trigger ON donations;
DROP TRIGGER IF EXISTS update_donation_stats_trigger ON donations;

-- gifts: clean duplicates  
DROP TRIGGER IF EXISTS trg_update_gift_stats ON gifts;
DROP TRIGGER IF EXISTS update_gift_stats_trigger ON gifts;

-- orders: clean duplicates
DROP TRIGGER IF EXISTS set_order_number ON orders;
DROP TRIGGER IF EXISTS trg_generate_order_number ON orders;
DROP TRIGGER IF EXISTS trigger_generate_order_number ON orders;
DROP TRIGGER IF EXISTS set_updated_at ON orders;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;

-- votes: clean duplicates
DROP TRIGGER IF EXISTS trg_update_nominee_votes ON votes;
DROP TRIGGER IF EXISTS update_nominee_votes_trigger ON votes;

-- tickets: clean duplicates
DROP TRIGGER IF EXISTS set_ticket_qr ON tickets;
DROP TRIGGER IF EXISTS trg_generate_ticket_qr ON tickets;
DROP TRIGGER IF EXISTS trigger_generate_ticket_qr ON tickets;

-- transactions: clean duplicates
DROP TRIGGER IF EXISTS calculate_referral_earnings_trigger ON transactions;

-- withdrawals: clean duplicates
DROP TRIGGER IF EXISTS set_updated_at ON withdrawals;
DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON withdrawals;

-- Fix campaign stats function to be more robust
CREATE OR REPLACE FUNCTION public.update_campaign_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.campaigns
    SET 
      current_amount = COALESCE((
        SELECT SUM(amount) FROM public.campaign_contributions 
        WHERE campaign_id = NEW.campaign_id AND status = 'completed'
      ), 0),
      supporter_count = COALESCE((
        SELECT COUNT(DISTINCT COALESCE(donor_phone, donor_email, id::text)) 
        FROM public.campaign_contributions 
        WHERE campaign_id = NEW.campaign_id AND status = 'completed'
      ), 0)
    WHERE id = NEW.campaign_id;
    
    -- Auto-complete campaign if goal reached
    UPDATE public.campaigns
    SET status = 'completed'
    WHERE id = NEW.campaign_id 
      AND status = 'active'
      AND current_amount >= goal_amount;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix donation stats to use aggregate for accuracy
CREATE OR REPLACE FUNCTION public.update_creator_donation_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.creators
    SET 
      total_raised = COALESCE((
        SELECT SUM(creator_amount) FROM public.donations 
        WHERE creator_id = NEW.creator_id AND status = 'completed'
      ), 0) + COALESCE((
        SELECT SUM(creator_amount) FROM public.gifts 
        WHERE creator_id = NEW.creator_id AND status = 'completed'
      ), 0),
      total_supporters = (
        SELECT COUNT(DISTINCT donor_phone) FROM public.donations 
        WHERE creator_id = NEW.creator_id AND status = 'completed' AND donor_phone IS NOT NULL
      )
    WHERE id = NEW.creator_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Add stock check function for merchandise
CREATE OR REPLACE FUNCTION public.validate_merch_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  available_stock integer;
BEGIN
  SELECT stock INTO available_stock FROM public.merchandise WHERE id = NEW.merchandise_id;
  IF available_stock IS NOT NULL AND available_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Only % available', available_stock;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_merch_stock_trigger
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_merch_stock();
