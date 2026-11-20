-- 1. Profiles: one row per learner
create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  level      text check (level in ('new','some','regular')),
  goal       text check (goal in ('melodies','chords','solos','songs')),
  style      text check (style in ('rock','pop','folk','blues','classical')),
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Sessions: one row per practice session
create table public.sessions (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id              text not null,
  exercise_id     text not null,
  mistakes_only   boolean not null default false,
  mode            text not null check (mode in ('loop','playThrough')),
  tempo           integer not null check (tempo > 0),
  started_at      timestamptz not null,
  duration_ms     integer not null check (duration_ms >= 0),
  steps           integer not null default 0,
  attempted       integer not null default 0,
  clean           integer not null default 0,
  mistakes        integer not null default 0,
  not_caught      integer not null default 0,
  weak_signal     integer not null default 0,
  skipped         integer not null default 0,
  accuracy        real not null check (accuracy between 0 and 1),
  most_missed     jsonb,
  timeline        jsonb not null default '[]'::jsonb,
  latency         jsonb,
  fused_notes     integer not null default 0,
  fused_at_target integer not null default 0,
  finished        boolean not null default true,
  uploaded_at     timestamptz not null default now(),
  primary key (user_id, id)
);
create index sessions_user_started on public.sessions (user_id, started_at desc);

-- 3. Security: each learner sees only their own rows
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own sessions" on public.sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profiles, public.sessions to authenticated;

-- 4. Delete my account
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;