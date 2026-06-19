-- VERTICE production hardening: public application tables only.
-- Apply in Supabase SQL Editor after confirming the Vercel server env vars are set.
-- The web app now talks to database tables through Vercel API routes using SUPABASE_SERVICE_KEY.
-- Storage policies are intentionally kept in storage-policy-owner.sql because
-- storage.objects can require a Supabase-managed owner role.

begin;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rooms_code_unique') then
    alter table public.rooms add constraint rooms_code_unique unique (code);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'rankings_room_id_unique') then
    alter table public.rankings add constraint rankings_room_id_unique unique (room_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'prizes_room_id_unique') then
    alter table public.prizes add constraint prizes_room_id_unique unique (room_id);
  end if;
end $$;

alter table if exists public.archives enable row level security;
alter table if exists public.rooms enable row level security;
alter table if exists public.players enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.prizes enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.rankings enable row level security;
alter table if exists public.clues enable row level security;
alter table if exists public.game_events enable row level security;
alter table if exists public.assets enable row level security;

revoke all on table public.archives from anon, authenticated;
revoke all on table public.rooms from anon, authenticated;
revoke all on table public.players from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.prizes from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.rankings from anon, authenticated;
revoke all on table public.clues from anon, authenticated;
revoke all on table public.game_events from anon, authenticated;
revoke all on table public.assets from anon, authenticated;

do $$
declare
  policy record;
begin
  for policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'archives', 'rooms', 'players', 'payments', 'prizes',
        'notifications', 'rankings', 'clues', 'game_events', 'assets'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', policy.policyname, policy.schemaname, policy.tablename);
  end loop;

end $$;

drop policy if exists "anon_select_archives" on public.archives;
drop policy if exists "anon_select_rooms" on public.rooms;
drop policy if exists "anon_select_players" on public.players;
drop policy if exists "anon_select_payments" on public.payments;
drop policy if exists "anon_select_prizes" on public.prizes;
drop policy if exists "anon_select_notifications" on public.notifications;
drop policy if exists "anon_select_rankings" on public.rankings;
drop policy if exists "anon_select_clues" on public.clues;
drop policy if exists "anon_select_game_events" on public.game_events;
drop policy if exists "anon_select_assets" on public.assets;

drop policy if exists "anon_insert_archives" on public.archives;
drop policy if exists "anon_insert_rooms" on public.rooms;
drop policy if exists "anon_insert_players" on public.players;
drop policy if exists "anon_insert_payments" on public.payments;
drop policy if exists "anon_insert_prizes" on public.prizes;
drop policy if exists "anon_insert_notifications" on public.notifications;
drop policy if exists "anon_insert_rankings" on public.rankings;
drop policy if exists "anon_insert_clues" on public.clues;
drop policy if exists "anon_insert_game_events" on public.game_events;
drop policy if exists "anon_insert_assets" on public.assets;

drop policy if exists "anon_update_archives" on public.archives;
drop policy if exists "anon_update_rooms" on public.rooms;
drop policy if exists "anon_update_players" on public.players;
drop policy if exists "anon_update_payments" on public.payments;
drop policy if exists "anon_update_prizes" on public.prizes;
drop policy if exists "anon_update_notifications" on public.notifications;
drop policy if exists "anon_update_rankings" on public.rankings;
drop policy if exists "anon_update_clues" on public.clues;
drop policy if exists "anon_update_game_events" on public.game_events;
drop policy if exists "anon_update_assets" on public.assets;

drop policy if exists "anon_delete_archives" on public.archives;
drop policy if exists "anon_delete_rooms" on public.rooms;
drop policy if exists "anon_delete_players" on public.players;
drop policy if exists "anon_delete_payments" on public.payments;
drop policy if exists "anon_delete_prizes" on public.prizes;
drop policy if exists "anon_delete_notifications" on public.notifications;
drop policy if exists "anon_delete_rankings" on public.rankings;
drop policy if exists "anon_delete_clues" on public.clues;
drop policy if exists "anon_delete_game_events" on public.game_events;
drop policy if exists "anon_delete_assets" on public.assets;

commit;
