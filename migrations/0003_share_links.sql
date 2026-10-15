-- Read-only "share my progress" links. One active link per user; revoking deletes the row.
create table if not exists share_links (
  token text primary key,
  user_id text not null unique,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
