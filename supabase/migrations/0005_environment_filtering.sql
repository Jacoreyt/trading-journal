-- Lets the journal/strategy/game-plan pages distinguish real trading
-- behavior from demo-account testing. Denormalized onto trades (rather
-- than joining through broker_connections every query) since a trade's
-- environment never changes after it's synced.
alter table trades add column environment text not null default 'live' check (environment in ('demo', 'live'));

update trades t
set environment = bc.environment
from broker_connections bc
where t.broker_connection_id = bc.id;

-- Which trade scope (all/demo/live) an AI insight was generated from, so
-- "latest insight of this kind" is scoped per filter instead of one global
-- slot that gets confusingly overwritten when you switch the toggle and
-- regenerate.
alter table ai_insights add column environment_filter text not null default 'all' check (environment_filter in ('all', 'demo', 'live'));
