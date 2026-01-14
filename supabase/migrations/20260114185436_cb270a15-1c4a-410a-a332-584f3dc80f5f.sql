
-- Create custom types
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');
CREATE TYPE public.creator_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected');
CREATE TYPE public.ticket_status AS ENUM ('valid', 'used', 'cancelled', 'expired');
CREATE TYPE public.event_status AS ENUM ('draft', 'pending', 'approved', 'live', 'ended', 'cancelled');
CREATE TYPE public.transaction_type AS ENUM ('donation', 'merchandise', 'ticket', 'vote', 'withdrawal', 'refund', 'fee', 'payout');
CREATE TYPE public.payment_provider AS ENUM ('mpesa', 'paypal', 'card');
CREATE TYPE public.vote_status AS ENUM ('pending', 'confirmed', 'failed');

-- Profiles table (basic user info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Creator categories (admin created)
CREATE TABLE public.creator_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Creators table
CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  tribe_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  category_id UUID REFERENCES public.creator_categories(id),
  status creator_status DEFAULT 'pending' NOT NULL,
  theme_primary TEXT DEFAULT '#D2691E',
  theme_secondary TEXT DEFAULT '#F5F5DC',
  theme_accent TEXT DEFAULT '#8FBC8F',
  total_supporters INT DEFAULT 0,
  total_raised DECIMAL(12,2) DEFAULT 0,
  total_votes INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  kyc_verified BOOLEAN DEFAULT false,
  mpesa_phone TEXT,
  paypal_email TEXT,
  rejection_reason TEXT,
  suspension_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Creator social links (LinkTree style)
CREATE TABLE public.creator_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Platform settings (admin configurable)
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Payment configurations (admin sets up)
CREATE TABLE public.payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider payment_provider NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Donations table
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  donor_name TEXT,
  donor_phone TEXT,
  donor_email TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  payment_provider payment_provider,
  payment_reference TEXT,
  mpesa_receipt TEXT,
  status TEXT DEFAULT 'pending',
  platform_fee DECIMAL(12,2) DEFAULT 0,
  creator_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Voting awards/categories (admin created)
CREATE TABLE public.award_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  banner_url TEXT,
  vote_fee DECIMAL(12,2) DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  voting_starts_at TIMESTAMPTZ,
  voting_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Award nominees (creators nominated)
CREATE TABLE public.award_nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID REFERENCES public.award_categories(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  total_votes INT DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(award_id, creator_id)
);

-- Votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nominee_id UUID REFERENCES public.award_nominees(id) ON DELETE CASCADE NOT NULL,
  voter_phone TEXT,
  voter_email TEXT,
  vote_count INT DEFAULT 1,
  amount_paid DECIMAL(12,2) NOT NULL,
  payment_provider payment_provider,
  payment_reference TEXT,
  mpesa_receipt TEXT,
  status vote_status DEFAULT 'pending',
  platform_fee DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  venue TEXT,
  location TEXT,
  banner_url TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  event_end_date TIMESTAMPTZ,
  status event_status DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ticket types
CREATE TABLE public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  quantity_available INT NOT NULL,
  quantity_sold INT DEFAULT 0,
  max_per_order INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE CASCADE NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  qr_code TEXT UNIQUE,
  status ticket_status DEFAULT 'valid',
  payment_reference TEXT,
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Merchandise categories
CREATE TABLE public.merch_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Merchandise
CREATE TABLE public.merchandise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.merch_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  images JSONB DEFAULT '[]',
  sizes JSONB DEFAULT '[]',
  colors JSONB DEFAULT '[]',
  stock INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  creator_id UUID REFERENCES public.creators(id) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  shipping_address JSONB,
  subtotal DECIMAL(12,2) NOT NULL,
  shipping_fee DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  platform_fee DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  creator_amount DECIMAL(12,2) DEFAULT 0,
  status order_status DEFAULT 'pending',
  payment_provider payment_provider,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  merchandise_id UUID REFERENCES public.merchandise(id) NOT NULL,
  quantity INT NOT NULL,
  size TEXT,
  color TEXT,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  payment_method payment_provider,
  payment_details JSONB,
  status withdrawal_status DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Transactions (ledger for all money movements)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  balance_after DECIMAL(12,2),
  payment_provider payment_provider,
  payment_reference TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Activity logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_creator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'creator')
$$;

CREATE OR REPLACE FUNCTION public.get_creator_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.creators WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_creator_balance(_creator_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('donation', 'merchandise', 'ticket', 'vote') THEN net_amount
      WHEN type IN ('withdrawal', 'payout') THEN -net_amount
      ELSE 0
    END
  ), 0)
  FROM public.transactions
  WHERE creator_id = _creator_id AND status = 'completed'
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "System can insert roles" ON public.user_roles FOR INSERT WITH CHECK (true);

-- RLS Policies for creator_categories
CREATE POLICY "Anyone can view active categories" ON public.creator_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.creator_categories FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for creators
CREATE POLICY "Anyone can view approved creators" ON public.creators FOR SELECT USING (status = 'approved');
CREATE POLICY "Creators can view own profile" ON public.creators FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Creators can update own profile" ON public.creators FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can create creator profile" ON public.creators FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all creators" ON public.creators FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for creator_links
CREATE POLICY "Anyone can view active links" ON public.creator_links FOR SELECT USING (is_active = true);
CREATE POLICY "Creators can manage own links" ON public.creator_links FOR ALL USING (
  creator_id = public.get_creator_id(auth.uid())
);
CREATE POLICY "Admins can manage all links" ON public.creator_links FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for platform_settings
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Anyone can read public settings" ON public.platform_settings FOR SELECT USING (category = 'public');

-- RLS Policies for payment_configs
CREATE POLICY "Admins can manage payment configs" ON public.payment_configs FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for donations
CREATE POLICY "Anyone can create donations" ON public.donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Creators can view own donations" ON public.donations FOR SELECT USING (
  creator_id = public.get_creator_id(auth.uid())
);
CREATE POLICY "Admins can manage all donations" ON public.donations FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for award_categories
CREATE POLICY "Anyone can view active awards" ON public.award_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage awards" ON public.award_categories FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for award_nominees
CREATE POLICY "Anyone can view nominees" ON public.award_nominees FOR SELECT USING (true);
CREATE POLICY "Admins can manage nominees" ON public.award_nominees FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for votes
CREATE POLICY "Anyone can create votes" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all votes" ON public.votes FOR SELECT USING (public.is_admin(auth.uid()));

-- RLS Policies for events
CREATE POLICY "Anyone can view approved events" ON public.events FOR SELECT USING (status IN ('approved', 'live'));
CREATE POLICY "Creators can manage own events" ON public.events FOR ALL USING (
  creator_id = public.get_creator_id(auth.uid())
);
CREATE POLICY "Admins can manage all events" ON public.events FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for ticket_types
CREATE POLICY "Anyone can view active ticket types" ON public.ticket_types FOR SELECT USING (is_active = true);
CREATE POLICY "Creators can manage own ticket types" ON public.ticket_types FOR ALL USING (
  event_id IN (SELECT id FROM public.events WHERE creator_id = public.get_creator_id(auth.uid()))
);
CREATE POLICY "Admins can manage all ticket types" ON public.ticket_types FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for tickets
CREATE POLICY "Anyone can create tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all tickets" ON public.tickets FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for merch_categories
CREATE POLICY "Anyone can view active merch categories" ON public.merch_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage merch categories" ON public.merch_categories FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for merchandise
CREATE POLICY "Anyone can view active approved merch" ON public.merchandise FOR SELECT USING (is_active = true AND is_approved = true);
CREATE POLICY "Creators can manage own merch" ON public.merchandise FOR ALL USING (
  creator_id = public.get_creator_id(auth.uid())
);
CREATE POLICY "Admins can manage all merch" ON public.merchandise FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for orders
CREATE POLICY "Creators can view own orders" ON public.orders FOR SELECT USING (
  creator_id = public.get_creator_id(auth.uid())
);
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for order_items
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for withdrawals
CREATE POLICY "Creators can manage own withdrawals" ON public.withdrawals FOR ALL USING (
  creator_id = public.get_creator_id(auth.uid())
);
CREATE POLICY "Admins can manage all withdrawals" ON public.withdrawals FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for transactions
CREATE POLICY "Creators can view own transactions" ON public.transactions FOR SELECT USING (
  creator_id = public.get_creator_id(auth.uid())
);
CREATE POLICY "Admins can manage all transactions" ON public.transactions FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for activity_logs
CREATE POLICY "Admins can view all logs" ON public.activity_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System can insert logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_creator_links_updated_at BEFORE UPDATE ON public.creator_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_merchandise_updated_at BEFORE UPDATE ON public.merchandise FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'TY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Generate ticket QR code
CREATE OR REPLACE FUNCTION public.generate_ticket_qr()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code := 'TKT-' || REPLACE(NEW.id::TEXT, '-', '') || '-' || FLOOR(RANDOM() * 1000000)::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_ticket_qr BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_qr();

-- Update creator stats on donation
CREATE OR REPLACE FUNCTION public.update_creator_donation_stats()
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

CREATE TRIGGER on_donation_completed
  AFTER INSERT OR UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_creator_donation_stats();

-- Update nominee vote count
CREATE OR REPLACE FUNCTION public.update_nominee_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE public.award_nominees
    SET total_votes = total_votes + NEW.vote_count
    WHERE id = NEW.nominee_id;
    
    UPDATE public.creators
    SET total_votes = total_votes + NEW.vote_count
    WHERE id = (SELECT creator_id FROM public.award_nominees WHERE id = NEW.nominee_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_vote_confirmed
  AFTER INSERT OR UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_nominee_votes();

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description, category) VALUES
('platform_fee_percentage', '5', 'Platform fee percentage for donations', 'fees'),
('merch_fee_percentage', '10', 'Platform fee percentage for merchandise', 'fees'),
('ticket_fee_percentage', '7.5', 'Platform fee percentage for tickets', 'fees'),
('vote_fee_percentage', '15', 'Platform fee percentage for votes', 'fees'),
('min_withdrawal', '500', 'Minimum withdrawal amount in KES', 'withdrawals'),
('max_withdrawal', '150000', 'Maximum withdrawal amount in KES', 'withdrawals'),
('withdrawal_fee', '50', 'Fixed withdrawal fee in KES', 'withdrawals'),
('tax_rate', '16', 'VAT rate percentage', 'taxes'),
('shipping_base_fee', '300', 'Base shipping fee in KES', 'shipping'),
('site_name', '"TribeYangu"', 'Platform name', 'public'),
('support_email', '"support@tribeyangu.com"', 'Support email', 'public');

-- Insert default merch categories
INSERT INTO public.merch_categories (name, slug, description) VALUES
('Hoodies', 'hoodies', 'Custom hoodies and sweatshirts'),
('T-Shirts', 't-shirts', 'Custom t-shirts and tops'),
('Caps', 'caps', 'Custom caps and hats'),
('Tote Bags', 'tote-bags', 'Custom tote bags'),
('Accessories', 'accessories', 'Other accessories');

-- Insert default creator categories
INSERT INTO public.creator_categories (name, slug, description, icon, display_order) VALUES
('Music', 'music', 'Musicians, producers, and DJs', '🎵', 1),
('Comedy', 'comedy', 'Comedians and entertainers', '😂', 2),
('Art', 'art', 'Visual artists and designers', '🎨', 3),
('Gaming', 'gaming', 'Gamers and streamers', '🎮', 4),
('Education', 'education', 'Educators and coaches', '📚', 5),
('Lifestyle', 'lifestyle', 'Lifestyle and wellness', '✨', 6),
('Tech', 'tech', 'Tech creators and developers', '💻', 7),
('Sports', 'sports', 'Athletes and fitness', '⚽', 8),
('Food', 'food', 'Food and cooking', '🍳', 9),
('Fashion', 'fashion', 'Fashion and beauty', '👗', 10);
