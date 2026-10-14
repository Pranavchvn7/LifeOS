create table if not exists life_logs (
  user_id text primary key,
  payload text not null,
  updated_at timestamptz not null default now()
);
