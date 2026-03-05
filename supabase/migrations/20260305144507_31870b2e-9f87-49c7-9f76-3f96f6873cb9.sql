
-- Drop all potentially existing triggers first, then recreate
DROP TRIGGER IF EXISTS update_campaign_stats_trigger ON public.campaign_contributions;
DROP TRIGGER IF EXISTS update_creator_donation_stats_trigger ON public.donations;
DROP TRIGGER IF EXISTS update_nominee_votes_trigger ON public.votes;
DROP TRIGGER IF EXISTS update_gift_stats_trigger ON public.gifts;
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.creators;
DROP TRIGGER IF EXISTS create_referral_chain_trigger ON public.creators;
DROP TRIGGER IF EXISTS calculate_referral_earnings_trigger ON public.transactions;
DROP TRIGGER IF EXISTS auto_add_category_nominees_trigger ON public.award_categories;
DROP TRIGGER IF EXISTS sync_creator_role_trigger ON public.creators;
DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
DROP TRIGGER IF EXISTS generate_ticket_qr_trigger ON public.tickets;
DROP TRIGGER IF EXISTS set_updated_at_creators ON public.creators;
DROP TRIGGER IF EXISTS set_updated_at_campaigns ON public.campaigns;
DROP TRIGGER IF EXISTS set_updated_at_donations ON public.donations;

-- Recreate all triggers
CREATE TRIGGER update_campaign_stats_trigger
  AFTER UPDATE ON public.campaign_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_campaign_stats();

CREATE TRIGGER update_creator_donation_stats_trigger
  AFTER UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_creator_donation_stats();

CREATE TRIGGER update_nominee_votes_trigger
  AFTER UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_nominee_votes();

CREATE TRIGGER update_gift_stats_trigger
  AFTER UPDATE ON public.gifts
  FOR EACH ROW EXECUTE FUNCTION public.update_gift_stats();

CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();

CREATE TRIGGER create_referral_chain_trigger
  AFTER UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_chain();

CREATE TRIGGER calculate_referral_earnings_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_referral_earnings();

CREATE TRIGGER auto_add_category_nominees_trigger
  AFTER INSERT ON public.award_categories
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_category_nominees();

CREATE TRIGGER sync_creator_role_trigger
  AFTER UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.sync_creator_role_on_approval();

CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

CREATE TRIGGER generate_ticket_qr_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_qr();

CREATE TRIGGER set_updated_at_creators
  BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_campaigns
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_donations
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
