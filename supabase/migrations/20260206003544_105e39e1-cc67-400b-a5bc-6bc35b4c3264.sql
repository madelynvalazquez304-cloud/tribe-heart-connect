-- Fix linter WARN: mutable search_path on two functions
create or replace function public.generate_unique_referral_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  new_code text;
  code_exists boolean;
begin
  loop
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    select exists(select 1 from public.creators where referral_code = new_code) into code_exists;
    exit when not code_exists;
  end loop;
  return new_code;
end;
$$;

create or replace function public.auto_generate_referral_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.referral_code is null or new.referral_code = '' then
    new.referral_code := public.generate_unique_referral_code();
  end if;
  return new;
end;
$$;


-- Fix linter WARN: overly-permissive INSERT policies (WITH CHECK true)
-- activity_logs: restrict inserts to admins only

drop policy if exists "System can insert logs" on public.activity_logs;
create policy "Admins can insert logs"
on public.activity_logs
for insert
with check (public.is_admin(auth.uid()));

-- profiles: allow users to insert their own profile only

drop policy if exists "System can insert profiles" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = user_id);

-- donations: public insert, but validate basic shape

drop policy if exists "Anyone can create donations" on public.donations;
create policy "Anyone can create donations"
on public.donations
for insert
with check (
  creator_id is not null
  and amount > 0
  and status = 'pending'
);

-- gifts

drop policy if exists "Anyone can create gifts" on public.gifts;
create policy "Anyone can create gifts"
on public.gifts
for insert
with check (
  creator_id is not null
  and gift_type_id is not null
  and total_amount > 0
  and status = 'pending'
);

-- campaign contributions

drop policy if exists "Anyone can create contributions" on public.campaign_contributions;
create policy "Anyone can create contributions"
on public.campaign_contributions
for insert
with check (
  campaign_id is not null
  and amount > 0
  and status = 'pending'
);

-- orders

drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders"
on public.orders
for insert
with check (
  creator_id is not null
  and customer_name is not null
  and length(trim(customer_name)) > 0
  and subtotal > 0
  and total > 0
  and status = 'pending'
);

-- order_items

drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items"
on public.order_items
for insert
with check (
  order_id is not null
  and merchandise_id is not null
  and quantity > 0
  and unit_price >= 0
  and total_price >= 0
);

-- votes

drop policy if exists "Anyone can create votes" on public.votes;
create policy "Anyone can create votes"
on public.votes
for insert
with check (
  nominee_id is not null
  and amount_paid > 0
  and status = 'pending'
);

-- tickets

drop policy if exists "Anyone can create tickets" on public.tickets;
create policy "Anyone can create tickets"
on public.tickets
for insert
with check (
  ticket_type_id is not null
);

-- ticket_payments

drop policy if exists "Anyone can create ticket payments" on public.ticket_payments;
create policy "Anyone can create ticket payments"
on public.ticket_payments
for insert
with check (
  creator_id is not null
  and ticket_type_id is not null
  and quantity > 0
  and amount > 0
  and status = 'pending'
);
