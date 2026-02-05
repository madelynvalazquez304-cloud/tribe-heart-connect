-- 1) Disabled accounts (admin-controlled)
create table if not exists public.disabled_accounts (
  user_id uuid primary key,
  is_disabled boolean not null default true,
  reason text,
  disabled_by uuid,
  disabled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.disabled_accounts enable row level security;

drop policy if exists "Admins can manage disabled accounts" on public.disabled_accounts;
create policy "Admins can manage disabled accounts"
on public.disabled_accounts
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Users can view own disabled status" on public.disabled_accounts;
create policy "Users can view own disabled status"
on public.disabled_accounts
for select
using (auth.uid() = user_id);

drop trigger if exists update_disabled_accounts_updated_at on public.disabled_accounts;
create trigger update_disabled_accounts_updated_at
before update on public.disabled_accounts
for each row
execute function public.update_updated_at_column();

-- Hide disabled creators from the public (and anywhere that relies on public SELECT)
drop policy if exists "Anyone can view approved creators" on public.creators;
create policy "Anyone can view approved creators"
on public.creators
for select
using (
  status = 'approved'::public.creator_status
  and not exists (
    select 1
    from public.disabled_accounts da
    where da.user_id = creators.user_id
      and da.is_disabled = true
  )
);


-- 2) Ticket payments table for paid ticketing (so profile ticket buying works)
create table if not exists public.ticket_payments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete cascade,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text,
  quantity integer not null default 1,
  amount numeric not null,
  platform_fee numeric,
  creator_amount numeric,
  status text not null default 'pending',
  payment_provider public.payment_provider,
  payment_reference text,
  mpesa_receipt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ticket_payments enable row level security;

drop policy if exists "Admins can manage ticket payments" on public.ticket_payments;
create policy "Admins can manage ticket payments"
on public.ticket_payments
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Anyone can create ticket payments" on public.ticket_payments;
create policy "Anyone can create ticket payments"
on public.ticket_payments
for insert
with check (true);

drop policy if exists "Creators can view own ticket payments" on public.ticket_payments;
create policy "Creators can view own ticket payments"
on public.ticket_payments
for select
using (
  creator_id = public.get_creator_id(auth.uid())
  or public.is_admin(auth.uid())
);

drop trigger if exists update_ticket_payments_updated_at on public.ticket_payments;
create trigger update_ticket_payments_updated_at
before update on public.ticket_payments
for each row
execute function public.update_updated_at_column();


-- 3) Creator approval -> ensure creator role exists (fix approved creators locked out)
create or replace function public.sync_creator_role_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved'::public.creator_status then
    insert into public.user_roles (user_id, role)
    values (new.user_id, 'creator'::public.app_role)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_creator_role_on_approval on public.creators;
create trigger sync_creator_role_on_approval
after insert or update of status on public.creators
for each row
execute function public.sync_creator_role_on_approval();

-- Backfill: ensure all already-approved creators have the creator role
insert into public.user_roles (user_id, role)
select c.user_id, 'creator'::public.app_role
from public.creators c
where c.status = 'approved'::public.creator_status
on conflict do nothing;


-- 4) Awards: auto-add nominees when an award category is created/updated with a creator category
create unique index if not exists award_nominees_award_creator_unique
on public.award_nominees (award_id, creator_id);

drop trigger if exists award_auto_add_nominees on public.award_categories;
create trigger award_auto_add_nominees
after insert or update of category_id on public.award_categories
for each row
execute function public.auto_add_category_nominees();


-- 5) Core stats + QR/order-number triggers (ensures campaign raised + votes totals stay accurate)
drop trigger if exists trg_update_creator_donation_stats on public.donations;
create trigger trg_update_creator_donation_stats
after update of status on public.donations
for each row
execute function public.update_creator_donation_stats();

drop trigger if exists trg_update_gift_stats on public.gifts;
create trigger trg_update_gift_stats
after update of status on public.gifts
for each row
execute function public.update_gift_stats();

drop trigger if exists trg_update_campaign_stats on public.campaign_contributions;
create trigger trg_update_campaign_stats
after update of status on public.campaign_contributions
for each row
execute function public.update_campaign_stats();

drop trigger if exists trg_update_nominee_votes on public.votes;
create trigger trg_update_nominee_votes
after update of status on public.votes
for each row
execute function public.update_nominee_votes();

drop trigger if exists trg_generate_order_number on public.orders;
create trigger trg_generate_order_number
before insert on public.orders
for each row
execute function public.generate_order_number();

drop trigger if exists trg_generate_ticket_qr on public.tickets;
create trigger trg_generate_ticket_qr
before insert on public.tickets
for each row
execute function public.generate_ticket_qr();


-- 6) Tighten user_roles INSERT to prevent privilege escalation
-- (Admins can still manage via existing admin policy)
drop policy if exists "System can insert roles" on public.user_roles;

drop policy if exists "Users can insert own user role" on public.user_roles;
create policy "Users can insert own user role"
on public.user_roles
for insert
with check (
  auth.uid() = user_id
  and role = 'user'::public.app_role
);

-- Optional explicit admin insert policy (keeps behavior clear even if admin ALL policy changes later)
drop policy if exists "Admins can insert roles" on public.user_roles;
create policy "Admins can insert roles"
on public.user_roles
for insert
with check (public.is_admin(auth.uid()));
