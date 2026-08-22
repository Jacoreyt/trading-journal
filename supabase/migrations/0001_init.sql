-- Profiles mirror auth.users so we have a stable id to reference from app tables.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create function handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  broker text not null check (broker in ('tradovate', 'tradelocker')),
  environment text not null default 'demo' check (environment in ('demo', 'live')),
  broker_account_id text,
  broker_account_number text,
  broker_server text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  access_token_expires_at timestamptz,
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, broker, environment)
);

create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  broker_connection_id uuid references broker_connections (id) on delete set null,
  source text not null default 'manual' check (source in ('tradovate', 'tradelocker', 'manual')),
  broker_trade_id text,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  quantity numeric not null,
  entry_price numeric not null,
  exit_price numeric,
  entry_time timestamptz not null,
  exit_time timestamptz,
  fees numeric not null default 0,
  pnl numeric,
  strategy text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, broker_connection_id, broker_trade_id)
);

create index trades_user_id_entry_time_idx on trades (user_id, entry_time desc);

create table ai_feedback (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  model text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index ai_feedback_trade_id_idx on ai_feedback (trade_id);

alter table profiles enable row level security;
alter table broker_connections enable row level security;
alter table trades enable row level security;
alter table ai_feedback enable row level security;

create policy "profiles: read own" on profiles
  for select using (auth.uid() = id);

create policy "broker_connections: manage own" on broker_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "trades: manage own" on trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_feedback: manage own" on ai_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS policies only filter rows; Postgres also requires table-level grants
-- before a role can touch the table at all. service_role runs broker sync
-- jobs on the user's behalf and must bypass RLS, so it needs the same grants.
grant usage on schema public to authenticated, service_role;
grant select on profiles to authenticated, service_role;
grant select, insert, update, delete on broker_connections to authenticated, service_role;
grant select, insert, update, delete on trades to authenticated, service_role;
grant select, insert, update, delete on ai_feedback to authenticated, service_role;
