create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  asset_class text not null check (asset_class in ('crypto', 'forex', 'futures')),
  symbol text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, asset_class, symbol)
);

alter table watchlist_items enable row level security;

create policy "watchlist_items: manage own" on watchlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on watchlist_items to authenticated, service_role;

-- Shared quote cache, not per-user — market data is the same for everyone.
-- Lets forex polling stay cheap on Twelve Data's free tier (800 req/day)
-- regardless of how many users/tabs are polling the dashboard: quotes are
-- only re-fetched from the provider when the cached row is stale.
create table market_quote_cache (
  asset_class text not null check (asset_class in ('crypto', 'forex', 'futures')),
  symbol text not null,
  price numeric not null,
  percent_change numeric not null,
  volume numeric,
  updated_at timestamptz not null default now(),
  primary key (asset_class, symbol)
);

alter table market_quote_cache enable row level security;

create policy "market_quote_cache: shared read/write" on market_quote_cache
  for all using (true) with check (true);

grant select, insert, update on market_quote_cache to authenticated, service_role;
