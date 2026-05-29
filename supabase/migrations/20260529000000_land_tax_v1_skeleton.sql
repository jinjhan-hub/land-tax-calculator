create extension if not exists pgcrypto;

create table if not exists public.tax_price_indexes (
  id uuid primary key default gen_random_uuid(),
  year_month text unique not null check (year_month ~ '^[0-9]{5}$'),
  roc_year integer not null check (roc_year between 1 and 999),
  month integer not null check (month between 1 and 12),
  index_value numeric(12,4) not null check (index_value > 0),
  source_file_name text,
  source_file_hash text,
  source_note text,
  imported_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_price_indexes_staging (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  year_month text not null check (year_month ~ '^[0-9]{5}$'),
  roc_year integer not null check (roc_year between 1 and 999),
  month integer not null check (month between 1 and 12),
  index_value numeric(12,4) not null check (index_value > 0),
  source_file_name text,
  source_file_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.tax_price_index_import_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id text,
  import_type text,
  source_file_name text,
  source_file_hash text,
  row_count integer,
  latest_year_month text,
  success boolean,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.land_tax_usage_logs (
  id uuid primary key default gen_random_uuid(),
  store_code text,
  user_code text,
  tool_name text,
  action_name text,
  success boolean,
  formula_version text,
  used_at timestamptz not null default now()
);

create table if not exists public.land_tax_error_logs (
  id uuid primary key default gen_random_uuid(),
  store_code text,
  user_code text,
  tool_name text,
  session_id text,
  stage text,
  error_code text,
  error_message text,
  gpts_note text check (char_length(coalesce(gpts_note, '')) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.land_tax_temp_pdf_files (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  encrypted_pdf_data text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  downloaded_at timestamptz
);

create index if not exists tax_price_indexes_year_month_idx on public.tax_price_indexes (year_month);
create index if not exists tax_price_indexes_staging_batch_id_idx on public.tax_price_indexes_staging (batch_id);
create index if not exists land_tax_temp_pdf_files_expires_at_idx on public.land_tax_temp_pdf_files (expires_at);
