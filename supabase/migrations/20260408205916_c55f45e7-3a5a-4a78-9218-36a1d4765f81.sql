
-- Create all missing triggers

-- Campaign stats trigger (prevents double counting with proper guard)
DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON public.campaign_contributions;
CREATE TRIGGER trigger_update_campaign_stats
AFTER UPDATE ON public.campaign_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_stats();

-- Donation stats trigger
DROP TRIGGER IF EXISTS trigger_update_creator_donation_stats ON public.donations;
CREATE TRIGGER trigger_update_creator_donation_stats
AFTER UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_creator_donation_stats();

-- Gift stats trigger
DROP TRIGGER IF EXISTS trigger_update_gift_stats ON public.gifts;
CREATE TRIGGER trigger_update_gift_stats
AFTER UPDATE ON public.gifts
FOR EACH ROW
EXECUTE FUNCTION public.update_gift_stats();

-- Vote counting trigger
DROP TRIGGER IF EXISTS trigger_update_nominee_votes ON public.votes;
CREATE TRIGGER trigger_update_nominee_votes
AFTER UPDATE ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.update_nominee_votes();

-- Auto-add nominees when award category created
DROP TRIGGER IF EXISTS trigger_auto_add_nominees ON public.award_categories;
CREATE TRIGGER trigger_auto_add_nominees
AFTER INSERT ON public.award_categories
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_category_nominees();

-- Referral code generation
DROP TRIGGER IF EXISTS trigger_generate_referral_code ON public.creators;
CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON public.creators
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_referral_code();

-- Referral chain creation
DROP TRIGGER IF EXISTS trigger_create_referral_chain ON public.creators;
CREATE TRIGGER trigger_create_referral_chain
AFTER UPDATE ON public.creators
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_chain();

-- Creator role sync on approval
DROP TRIGGER IF EXISTS trigger_sync_creator_role ON public.creators;
CREATE TRIGGER trigger_sync_creator_role
AFTER UPDATE ON public.creators
FOR EACH ROW
EXECUTE FUNCTION public.sync_creator_role_on_approval();

-- Order number generation
DROP TRIGGER IF EXISTS trigger_generate_order_number ON public.orders;
CREATE TRIGGER trigger_generate_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

-- Ticket QR code generation
DROP TRIGGER IF EXISTS trigger_generate_ticket_qr ON public.tickets;
CREATE TRIGGER trigger_generate_ticket_qr
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_qr();

-- Referral earnings calculation
DROP TRIGGER IF EXISTS trigger_calculate_referral_earnings ON public.transactions;
CREATE TRIGGER trigger_calculate_referral_earnings
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_referral_earnings();

-- Updated_at triggers
DROP TRIGGER IF EXISTS trigger_update_creators_updated_at ON public.creators;
CREATE TRIGGER trigger_update_creators_updated_at
BEFORE UPDATE ON public.creators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trigger_update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_withdrawals_updated_at ON public.withdrawals;
CREATE TRIGGER trigger_update_withdrawals_updated_at
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user trigger (on auth.users) - skip as we can't attach to auth schema
