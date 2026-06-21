begin;

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  event_id uuid references public.game_events(id) on delete set null,
  sender_player_id uuid references public.players(id) on delete set null,
  recipient_player_id uuid references public.players(id) on delete cascade,
  sender_kind text not null default 'player' check (sender_kind in ('player', 'ai', 'system', 'kairo')),
  sender_name text not null,
  message_type text not null default 'text' check (message_type in ('text', 'ai', 'system', 'meme', 'kairo', 'attachment')),
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create unique index if not exists room_messages_event_id_unique
  on public.room_messages(event_id)
  where event_id is not null;

create index if not exists room_messages_room_created_idx
  on public.room_messages(room_id, created_at);

create index if not exists room_messages_private_idx
  on public.room_messages(room_id, sender_player_id, recipient_player_id, created_at);

create table if not exists public.room_votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  voter_player_id uuid not null references public.players(id) on delete cascade,
  suspect_player_id uuid not null references public.players(id) on delete cascade,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint room_votes_unique_vote unique (room_id, voter_player_id),
  constraint room_votes_no_self_vote check (voter_player_id <> suspect_player_id)
);

create index if not exists room_votes_room_idx on public.room_votes(room_id);
create index if not exists room_votes_suspect_idx on public.room_votes(room_id, suspect_player_id);

alter table if exists public.room_messages enable row level security;
alter table if exists public.room_votes enable row level security;

revoke all on table public.room_messages from anon, authenticated;
revoke all on table public.room_votes from anon, authenticated;

drop policy if exists "anon_select_room_messages" on public.room_messages;
drop policy if exists "anon_insert_room_messages" on public.room_messages;
drop policy if exists "anon_update_room_messages" on public.room_messages;
drop policy if exists "anon_delete_room_messages" on public.room_messages;
drop policy if exists "anon_select_room_votes" on public.room_votes;
drop policy if exists "anon_insert_room_votes" on public.room_votes;
drop policy if exists "anon_update_room_votes" on public.room_votes;
drop policy if exists "anon_delete_room_votes" on public.room_votes;

commit;
