-- READ ONLY. Return metadata, not member records, provider keys or SMTP settings.
select table_name,column_name,data_type,is_nullable
from information_schema.columns where table_schema='public'
and table_name in ('club_memberships','tournament_registrations','membership_renewals','membership_options','mobile_membership_links','mobile_registration_links','mobile_push_devices')
order by table_name,ordinal_position;
select tablename,indexname,indexdef from pg_indexes where schemaname='public'
and tablename in ('club_memberships','tournament_registrations','membership_renewals','mobile_membership_links') order by tablename,indexname;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public'
and tablename in ('club_memberships','tournament_registrations','profiles','mobile_membership_links','mobile_registration_links','mobile_push_devices');
