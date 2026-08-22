create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (
    kind in ('strategy_insights', 'strategy_playbook', 'game_plan_daily', 'game_plan_weekly')
  ),
  model text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index ai_insights_user_id_kind_created_at_idx on ai_insights (user_id, kind, created_at desc);

alter table ai_insights enable row level security;

create policy "ai_insights: manage own" on ai_insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on ai_insights to authenticated, service_role;
