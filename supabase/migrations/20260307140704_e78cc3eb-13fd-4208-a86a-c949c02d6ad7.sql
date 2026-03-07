
-- =============================================================
-- 1) Seed branding platform_settings if they don't exist
-- =============================================================
INSERT INTO public.platform_settings (key, value, description, category)
VALUES
  ('site_name', '"TribeYangu"', 'Website display name', 'branding'),
  ('site_tagline', '"Turning fans into family"', 'Website tagline', 'branding'),
  ('site_logo_url', '""', 'Logo image URL', 'branding'),
  ('contact_email', '"hello@tribeyangu.com"', 'Contact email displayed on site', 'branding'),
  ('copyright_text', '"© 2024 TribeYangu. Made with ❤️ for African creators."', 'Footer copyright text', 'branding'),
  ('footer_description', '"Turning fans into family and support into impact. Empowering African creators to build sustainable communities."', 'Footer description', 'branding'),
  ('social_twitter', '""', 'Twitter URL', 'branding'),
  ('social_instagram', '""', 'Instagram URL', 'branding'),
  ('social_youtube', '""', 'YouTube URL', 'branding')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 2) Attach ALL missing triggers
-- =============================================================

-- handle_new_user trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at ON public.creators;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.campaigns;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.events;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.donations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.withdrawals;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.merchandise;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.merchandise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Donation stats trigger
DROP TRIGGER IF EXISTS update_creator_donation_stats_trigger ON public.donations;
CREATE TRIGGER update_creator_donation_stats_trigger
  AFTER UPDATE ON public.donations
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.update_creator_donation_stats();

-- Campaign stats trigger
DROP TRIGGER IF EXISTS update_campaign_stats_trigger ON public.campaign_contributions;
CREATE TRIGGER update_campaign_stats_trigger
  AFTER UPDATE ON public.campaign_contributions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.update_campaign_stats();

-- Vote stats trigger
DROP TRIGGER IF EXISTS update_nominee_votes_trigger ON public.votes;
CREATE TRIGGER update_nominee_votes_trigger
  AFTER UPDATE ON public.votes
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed')
  EXECUTE FUNCTION public.update_nominee_votes();

-- Gift stats trigger
DROP TRIGGER IF EXISTS update_gift_stats_trigger ON public.gifts;
CREATE TRIGGER update_gift_stats_trigger
  AFTER UPDATE ON public.gifts
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.update_gift_stats();

-- Referral code generation
DROP TRIGGER IF EXISTS auto_generate_referral_code_trigger ON public.creators;
CREATE TRIGGER auto_generate_referral_code_trigger
  BEFORE INSERT ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();

-- Referral chain
DROP TRIGGER IF EXISTS create_referral_chain_trigger ON public.creators;
CREATE TRIGGER create_referral_chain_trigger
  AFTER UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_chain();

-- Referral earnings
DROP TRIGGER IF EXISTS calculate_referral_earnings_trigger ON public.transactions;
CREATE TRIGGER calculate_referral_earnings_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_referral_earnings();

-- Order number generation
DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Ticket QR generation
DROP TRIGGER IF EXISTS generate_ticket_qr_trigger ON public.tickets;
CREATE TRIGGER generate_ticket_qr_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_qr();

-- Sync creator role on approval
DROP TRIGGER IF EXISTS sync_creator_role_trigger ON public.creators;
CREATE TRIGGER sync_creator_role_trigger
  AFTER UPDATE ON public.creators
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION public.sync_creator_role_on_approval();

-- Auto add category nominees
DROP TRIGGER IF EXISTS auto_add_category_nominees_trigger ON public.award_categories;
CREATE TRIGGER auto_add_category_nominees_trigger
  AFTER INSERT ON public.award_categories
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_category_nominees();
