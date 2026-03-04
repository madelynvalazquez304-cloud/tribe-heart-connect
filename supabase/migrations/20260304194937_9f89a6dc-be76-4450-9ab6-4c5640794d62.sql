
-- Add is_featured to creators for Explore page curation
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Add store_enabled to creators for admin store control
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS store_enabled boolean DEFAULT true;

-- Recreate triggers that were dropped
CREATE OR REPLACE TRIGGER update_campaign_stats_trigger
  AFTER UPDATE ON public.campaign_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_stats();

CREATE OR REPLACE TRIGGER update_donation_stats_trigger
  AFTER UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creator_donation_stats();

CREATE OR REPLACE TRIGGER update_nominee_votes_trigger
  AFTER UPDATE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nominee_votes();

CREATE OR REPLACE TRIGGER update_gift_stats_trigger
  AFTER UPDATE ON public.gifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gift_stats();

CREATE OR REPLACE TRIGGER sync_creator_role_trigger
  AFTER UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_creator_role_on_approval();

CREATE OR REPLACE TRIGGER auto_add_nominees_trigger
  AFTER INSERT ON public.award_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_category_nominees();

CREATE OR REPLACE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_referral_code();

CREATE OR REPLACE TRIGGER create_referral_chain_trigger
  AFTER UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.create_referral_chain();

CREATE OR REPLACE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

CREATE OR REPLACE TRIGGER generate_ticket_qr_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_qr();

CREATE OR REPLACE TRIGGER calculate_referral_earnings_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_referral_earnings();
