-- Needed to convert P&L into USD when an instrument's quoting currency
-- isn't USD (e.g. USDJPY realizes P&L in JPY, not USD). Nullable because
-- existing cached rows predate this and will be backfilled on next sync.
alter table tradelocker_instrument_specs add column base_currency text;
alter table tradelocker_instrument_specs add column quoting_currency text;
