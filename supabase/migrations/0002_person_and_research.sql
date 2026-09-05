create table subjects (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  created_at timestamptz not null default now()
);

create table observations (
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

create table inferred_states (
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

create table research_projects (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  objective text not null,
  status text not null default 'active',
  research_mode text not null default 'domain_360',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table research_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references research_projects(id) on delete cascade,
  question_text text not null,
  question_type text not null,
  status text not null default 'open',
  priority numeric,
  readiness_blocking boolean not null default false,
  created_at timestamptz not null default now()
);

create table research_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references research_projects(id) on delete cascade,
  question_id uuid references research_questions(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index observations_subject_concept_time_idx on observations(subject_id, concept_id, observed_at desc);
create index inferred_states_subject_concept_time_idx on inferred_states(subject_id, concept_id, valid_from desc);
create index claims_subject_relation_idx on claims(subject_object_id, relation_type);
