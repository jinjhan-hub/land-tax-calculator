create table if not exists public.store_users (
  id uuid primary key default gen_random_uuid(),
  store_code text not null,
  user_code text not null,
  auth_code_hash text,
  is_active boolean not null default true,
  is_test_account boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_users
add column if not exists store_name text,
add column if not exists brokerage_name text,
add column if not exists broker_name text,
add column if not exists broker_license_no text,
add column if not exists watermark_text text,
add column if not exists expires_at date;

create unique index if not exists store_users_store_user_unique
on public.store_users (store_code, user_code);
