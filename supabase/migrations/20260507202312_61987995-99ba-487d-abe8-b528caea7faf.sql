
-- Mchango: feature another creator's campaign on your profile
create table if not exists public.campaign_features (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  featured_by_creator_id uuid not null references public.creators(id) on delete cascade,
  message text,
  created_at timestamptz not null default now(),
  unique (campaign_id, featured_by_creator_id)
);

alter table public.campaign_features enable row level security;

create policy "Anyone can view campaign features"
  on public.campaign_features for select
  using (true);

create policy "Creators manage their own features"
  on public.campaign_features for all
  using (featured_by_creator_id = public.get_creator_id(auth.uid()))
  with check (featured_by_creator_id = public.get_creator_id(auth.uid()));

create policy "Admins manage all campaign features"
  on public.campaign_features for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create index if not exists idx_campaign_features_creator on public.campaign_features(featured_by_creator_id);
create index if not exists idx_campaign_features_campaign on public.campaign_features(campaign_id);

-- Auth feature flags
insert into public.platform_settings (key, value, category, description) values
  ('signup_email_verification_required', 'false'::jsonb, 'features', 'Require users to verify their email before they can sign in.'),
  ('email_otp_login_enabled', 'true'::jsonb, 'features', 'Allow users to sign in using a one-time code emailed to them.')
on conflict (key) do nothing;
