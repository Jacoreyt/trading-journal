-- Instrument specs (lot size etc.) are broker/environment-wide, not
-- per-user, and rarely change — cache them instead of re-fetching from
-- TradeLocker on every sync, which was hitting their rate limit (429) on
-- accounts with many distinct traded instruments.
create table tradelocker_instrument_specs (
  environment text not null check (environment in ('demo', 'live')),
  tradable_instrument_id integer not null,
  name text not null,
  lot_size numeric not null,
  updated_at timestamptz not null default now(),
  primary key (environment, tradable_instrument_id)
);

alter table tradelocker_instrument_specs enable row level security;

create policy "tradelocker_instrument_specs: shared read/write" on tradelocker_instrument_specs
  for all using (true) with check (true);

grant select, insert, update on tradelocker_instrument_specs to authenticated, service_role;
