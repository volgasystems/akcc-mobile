-- PROPOSAL ONLY. Do not run without confirming the actual production schema,
-- reviewing current Auth/RLS, and agreeing an identity-verification process.
-- Additive tables only. No membership records or website policies are changed.
begin;
create table public.mobile_membership_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_record_id uuid not null references public.club_memberships(id) on delete restrict,
  relationship text not null check (relationship in ('self','parent_guardian')),
  verified_by uuid not null references auth.users(id) on delete restrict,
  verified_at timestamptz not null default now(),
  verification_note text not null check (length(trim(verification_note)) >= 10),
  revoked_at timestamptz,
  primary key (user_id,membership_record_id)
);
alter table public.mobile_membership_links enable row level security;
-- Mobile users cannot create, edit or enumerate links. Service API alone reads them.
revoke all on public.mobile_membership_links from anon, authenticated;
grant select, insert, update on public.mobile_membership_links to service_role;
commit;
-- No automatic links, no lower(email) join and no backfill.
-- Authorised staff verify the account identity and player/guardian relationship
-- out of band, then create the link using a privileged reviewed workflow.
-- Parent contact fields alone do not prove legal guardianship.
-- Revocation immediately removes access on the next API request.
