-- Fix RLS policy for orders table - allow any user to create orders
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Anyone can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (true);

-- Fix RLS policy for order_items - allow SELECT for creators
DROP POLICY IF EXISTS "Creators can view own order items" ON public.order_items;

CREATE POLICY "Creators can view own order items"
ON public.order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders WHERE creator_id = get_creator_id(auth.uid())
  )
  OR is_admin(auth.uid())
);

-- Fix RLS policy for tickets - allow creators to view their event tickets
DROP POLICY IF EXISTS "Creators can view event tickets" ON public.tickets;

CREATE POLICY "Creators can view event tickets"
ON public.tickets FOR SELECT
USING (
  ticket_type_id IN (
    SELECT tt.id FROM ticket_types tt
    JOIN events e ON tt.event_id = e.id
    WHERE e.creator_id = get_creator_id(auth.uid())
  )
  OR is_admin(auth.uid())
);

-- Allow creators to update tickets (for scanning)
DROP POLICY IF EXISTS "Creators can update event tickets" ON public.tickets;

CREATE POLICY "Creators can update event tickets"
ON public.tickets FOR UPDATE
USING (
  ticket_type_id IN (
    SELECT tt.id FROM ticket_types tt
    JOIN events e ON tt.event_id = e.id
    WHERE e.creator_id = get_creator_id(auth.uid())
  )
  OR is_admin(auth.uid())
);

-- Add category_id to award_categories to link awards to creator categories
ALTER TABLE public.award_categories 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.creator_categories(id);

-- Create function to auto-add all creators in category as nominees
CREATE OR REPLACE FUNCTION public.auto_add_category_nominees()
RETURNS TRIGGER AS $$
BEGIN
  -- If award has a category_id, add all approved creators in that category as nominees
  IF NEW.category_id IS NOT NULL THEN
    INSERT INTO public.award_nominees (award_id, creator_id)
    SELECT NEW.id, c.id
    FROM public.creators c
    WHERE c.category_id = NEW.category_id
    AND c.status = 'approved'
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-adding nominees
DROP TRIGGER IF EXISTS trigger_auto_add_nominees ON public.award_categories;
CREATE TRIGGER trigger_auto_add_nominees
AFTER INSERT OR UPDATE OF category_id ON public.award_categories
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_category_nominees();

-- Add unique constraint to prevent duplicate nominees
ALTER TABLE public.award_nominees 
DROP CONSTRAINT IF EXISTS unique_award_nominee;

ALTER TABLE public.award_nominees 
ADD CONSTRAINT unique_award_nominee UNIQUE (award_id, creator_id);

-- Create event_collaborations table for ticket sale partnerships
CREATE TABLE IF NOT EXISTS public.event_collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  revenue_share numeric DEFAULT 50,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, invitee_id)
);

-- Enable RLS on event_collaborations
ALTER TABLE public.event_collaborations ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_collaborations
CREATE POLICY "Creators can view their collaborations"
ON public.event_collaborations FOR SELECT
USING (
  inviter_id = get_creator_id(auth.uid()) 
  OR invitee_id = get_creator_id(auth.uid())
  OR is_admin(auth.uid())
);

CREATE POLICY "Event owners can create collaborations"
ON public.event_collaborations FOR INSERT
WITH CHECK (inviter_id = get_creator_id(auth.uid()));

CREATE POLICY "Collaborators can update their invitations"
ON public.event_collaborations FOR UPDATE
USING (
  inviter_id = get_creator_id(auth.uid()) 
  OR invitee_id = get_creator_id(auth.uid())
);

CREATE POLICY "Admins can manage all collaborations"
ON public.event_collaborations FOR ALL
USING (is_admin(auth.uid()));