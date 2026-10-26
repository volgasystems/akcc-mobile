-- PROPOSAL ONLY: review actual production schema and apply the earlier
-- PROPOSAL_member_links.sql only after identity/guardian verification is agreed.
-- No existing memberships, registrations, accounts or policies are changed.
begin;
create table public.mobile_registration_links (
 user_id uuid not null references auth.users(id) on delete cascade,
 registration_id uuid not null references public.tournament_registrations(id) on delete restrict,
 verified_by uuid not null references auth.users(id) on delete restrict,
 verified_at timestamptz not null default now(), verification_note text not null check(length(trim(verification_note))>=10),
 revoked_at timestamptz, primary key(user_id,registration_id)
);
create table public.mobile_push_devices (
 token text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 topics text[] not null check(topics <@ array['tournament','news']::text[]),
 consent_version text not null, consent_at timestamptz not null default now(), disabled_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.mobile_push_sources (
 source_key text primary key, kind text not null check(kind in ('tournament','news')),
 slug text not null, title text not null, first_seen_at timestamptz not null default now()
);
create table public.mobile_push_state (id boolean primary key check(id), seeded boolean not null default false);
insert into public.mobile_push_state(id) values(true);
create table public.mobile_push_deliveries (
 id uuid primary key default gen_random_uuid(), source_key text not null references public.mobile_push_sources(source_key),
 token text not null references public.mobile_push_devices(token) on delete cascade,
 status text not null default 'pending' check(status in ('pending','claimed','accepted','delivered','failed','uncertain','skipped')),
 ticket_id text, error_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(source_key,token)
);
create index mobile_push_delivery_status on public.mobile_push_deliveries(status,created_at);
alter table public.mobile_registration_links enable row level security;
alter table public.mobile_push_devices enable row level security;
alter table public.mobile_push_sources enable row level security;
alter table public.mobile_push_state enable row level security;
alter table public.mobile_push_deliveries enable row level security;
revoke all on public.mobile_registration_links,public.mobile_push_devices,public.mobile_push_sources,public.mobile_push_state,public.mobile_push_deliveries from anon,authenticated;
grant select,insert,update,delete on public.mobile_registration_links,public.mobile_push_devices,public.mobile_push_sources,public.mobile_push_state,public.mobile_push_deliveries to service_role;
create function public.mobile_push_is_eligible(p_user uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null)
 and (exists(select 1 from public.mobile_membership_links l join public.club_memberships m on m.id=l.membership_record_id
 where l.user_id=p_user and l.revoked_at is null and m.membership_status='active'
 and m.payment_status in ('paid','manual_paid','waived') and m.membership_end_date >= (now() at time zone 'Pacific/Auckland')::date)
 or exists(select 1 from public.mobile_registration_links l join public.tournament_registrations r on r.id=l.registration_id
 where l.user_id=p_user and l.revoked_at is null and r.registration_status='confirmed' and r.payment_status in ('paid','manual_paid')));
$$;
revoke all on function public.mobile_push_is_eligible(uuid) from public,anon,authenticated;
grant execute on function public.mobile_push_is_eligible(uuid) to service_role;
create function public.mobile_stage_push_events(p_events jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare baseline boolean; e jsonb; inserted_key text; staged integer:=0;
begin
 select not seeded into strict baseline from public.mobile_push_state where id=true for update;
 for e in select value from jsonb_array_elements(p_events) loop
  inserted_key:=null;
  insert into public.mobile_push_sources(source_key,kind,slug,title)
  values(e->>'key',e->>'kind',e->>'slug',e->>'title') on conflict do nothing returning source_key into inserted_key;
  if inserted_key is not null and not baseline then
   insert into public.mobile_push_deliveries(source_key,token)
   select inserted_key,d.token from public.mobile_push_devices d where d.disabled_at is null
   and e->>'kind'=any(d.topics) and public.mobile_push_is_eligible(d.user_id)
   on conflict do nothing;
   staged:=staged+1;
  end if;
 end loop;
 update public.mobile_push_state set seeded=true where id=true;
 return jsonb_build_object('baseline_only',baseline,'new_sources',staged);
end;
$$;
revoke all on function public.mobile_stage_push_events(jsonb) from public,anon,authenticated;
grant execute on function public.mobile_stage_push_events(jsonb) to service_role;
commit;
-- Staff-created verified links only: NEVER backfill by matching typed emails.
-- Initial poll seeds current content silently. Only later newly seen public
-- content can create an outbox row. Editing existing content does not re-send.
