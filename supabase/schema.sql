-- Run once in Supabase: SQL Editor > New query > paste > Run.
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  nickname text,
  token text not null unique,
  accepted_at timestamptz,
  invited_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists results (
  id bigserial primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  event_id text not null,
  value numeric not null,
  baseline boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (participant_id, event_id, baseline)
);

create table if not exists practice_logs (
  id bigserial primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  day date not null,
  kind text not null,
  minutes int not null check (minutes between 1 and 600),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists practice_logs_participant_day on practice_logs (participant_id, day);

-- The site talks to the database only from the server with the service role key.
-- Row level security with no policies keeps the public anon key locked out.
alter table participants enable row level security;
alter table results enable row level security;
alter table practice_logs enable row level security;
