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

-- Arena: each person's catchphrase and the group trash talk.
alter table participants add column if not exists catchphrase text;

create table if not exists taunts (
  id bigserial primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  target_id uuid references participants(id) on delete set null,
  text text not null check (char_length(text) between 1 and 120),
  created_at timestamptz not null default now()
);
create index if not exists taunts_created on taunts (created_at desc);
alter table taunts enable row level security;

-- Personality questionnaire answers that power the arena trash talk.
alter table participants add column if not exists profile jsonb not null default '{}'::jsonb;

-- Bro talk: quotes the organiser or friends add. One is shown per day.
create table if not exists quotes (
  id bigserial primary key,
  text text not null check (char_length(text) between 3 and 220),
  author text,
  participant_id uuid references participants(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table quotes enable row level security;
