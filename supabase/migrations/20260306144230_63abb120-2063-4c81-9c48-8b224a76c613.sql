
-- Fix campaign stats trigger: only fire on UPDATE (not INSERT)
DROP TRIGGER IF EXISTS update_campaign_stats_trigger ON public.campaign_contributions;
CREATE TRIGGER update_campaign_stats_trigger
  AFTER UPDATE ON public.campaign_contributions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.update_campaign_stats();

-- Fix donation stats trigger: only fire on status change
DROP TRIGGER IF EXISTS update_creator_donation_stats_trigger ON public.donations;
CREATE TRIGGER update_creator_donation_stats_trigger
  AFTER UPDATE ON public.donations
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.update_creator_donation_stats();

-- Fix vote counting trigger: only fire on status change
DROP TRIGGER IF EXISTS update_nominee_votes_trigger ON public.votes;
CREATE TRIGGER update_nominee_votes_trigger
  AFTER UPDATE ON public.votes
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed')
  EXECUTE FUNCTION public.update_nominee_votes();

-- Fix gift stats trigger: only fire on status change
DROP TRIGGER IF EXISTS update_gift_stats_trigger ON public.gifts;
CREATE TRIGGER update_gift_stats_trigger
  AFTER UPDATE ON public.gifts
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.update_gift_stats();

-- Ensure other triggers exist
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.creators;
CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_referral_code();

DROP TRIGGER IF EXISTS create_referral_chain_trigger ON public.creators;
CREATE TRIGGER create_referral_chain_trigger
  AFTER UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.create_referral_chain();

DROP TRIGGER IF EXISTS calculate_referral_earnings_trigger ON public.transactions;
CREATE TRIGGER calculate_referral_earnings_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_referral_earnings();

DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

DROP TRIGGER IF EXISTS generate_ticket_qr_trigger ON public.tickets;
CREATE TRIGGER generate_ticket_qr_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_qr();

DROP TRIGGER IF EXISTS auto_add_category_nominees_trigger ON public.award_categories;
CREATE TRIGGER auto_add_category_nominees_trigger
  AFTER INSERT ON public.award_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_category_nominees();

DROP TRIGGER IF EXISTS sync_creator_role_trigger ON public.creators;
CREATE TRIGGER sync_creator_role_trigger
  AFTER UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_creator_role_on_approval();
