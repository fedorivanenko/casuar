create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  concept_id uuid not null references concepts(object_id),
  observed_at timestamptz not null,
  value_num numeric,
  value_text text,
  value_json jsonb,
  unit text,
  source_type text not null,
  source_ref text,
  measurement_conditions jsonb not null default '{}'::jsonb,
  confidence numeric,
  created_at timestamptz not null default now(),
  check (num_nonnulls(value_num, value_text, value_json) = 1)
);

create table if not exists inferred_states (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  concept_id uuid not null references concepts(object_id),
  valid_from timestamptz,
  valid_to timestamptz,
  state_kind text not null,
  value_num numeric,
  value_text text,
  value_json jsonb,
  unit text,
  epistemic_status text not null,
  probability numeric,
  conditions jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists observations_subject_concept_time_idx on observations(subject_id, concept_id, observed_at desc);
create index if not exists inferred_states_subject_concept_time_idx on inferred_states(subject_id, concept_id, valid_from desc);
create index if not exists claims_subject_relation_idx on claims(subject_object_id, relation_type);
