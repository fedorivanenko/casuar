create extension if not exists pgcrypto;

create table objects (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('concept','state','event','observation','claim','source','research_project','research_question')),
  key text not null unique,
  label text not null,
  description text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table concepts (
  object_id uuid primary key references objects(id) on delete cascade,
  semantic_type text not null,
  aliases text[] not null default '{}',
  external_ids jsonb not null default '{}'::jsonb,
  canonical boolean not null default true
);

create table relation_types (
  key text primary key,
  category text not null,
  description text,
  directional boolean not null default true,
  causal boolean not null default false
);

create table claims (
  object_id uuid primary key default gen_random_uuid(),
  subject_object_id uuid not null references objects(id),
  relation_type text not null references relation_types(key),
  object_object_id uuid references objects(id),
  object_literal jsonb,
  status text not null default 'proposed',
  causal_status text,
  scope jsonb not null default '{}'::jsonb,
  causal_confidence numeric,
  mechanistic_confidence numeric,
  empirical_confidence numeric,
  notes text,
  created_at timestamptz not null default now(),
  check ((object_object_id is null) <> (object_literal is null))
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  citation_key text unique,
  title text not null,
  doi text,
  url text,
  publication_year integer,
  source_type text,
  study_design text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table claim_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_object_id uuid not null references claims(object_id) on delete cascade,
  source_id uuid not null references sources(id),
  evidence_role text not null check (evidence_role in ('supporting','opposing','null','mixed')),
  population text,
  endpoint text,
  effect_metric text,
  effect_estimate numeric,
  effect_low numeric,
  effect_high numeric,
  risk_of_bias text,
  certainty text,
  transportability numeric,
  effect_modifiers jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
