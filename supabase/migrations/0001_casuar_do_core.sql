begin;

create schema if not exists casuar_do;
revoke all on schema casuar_do from public;

create table casuar_do.models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null check (version > 0),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  created_at timestamptz not null default now(),
  unique (name, version)
);

create table casuar_do.observations (
  id uuid primary key default gen_random_uuid(),
  person_id text not null,
  variable text not null,
  value double precision not null,
  unit text not null,
  observed_at timestamptz not null,
  uncertainty_sd double precision check (uncertainty_sd >= 0),
  source jsonb not null default '{}'::jsonb
);
create index observations_person_variable_time_idx on casuar_do.observations(person_id, variable, observed_at desc);

create table casuar_do.runs (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references casuar_do.models(id),
  person_id text,
  model_snapshot jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index runs_model_idx on casuar_do.runs(model_id);

create table casuar_do.functions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  output_variable text not null,
  created_at timestamptz not null default now()
);

create table casuar_do.function_versions (
  id uuid primary key default gen_random_uuid(),
  function_id uuid not null references casuar_do.functions(id) on delete cascade,
  version integer not null check (version > 0),
  equation text not null,
  inputs jsonb not null default '[]'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  time_behavior jsonb not null default '{}'::jsonb,
  uncertainty jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(function_id, version)
);

create table casuar_do.function_evidence (
  id uuid primary key default gen_random_uuid(),
  function_version_id uuid not null references casuar_do.function_versions(id) on delete cascade,
  evidence jsonb not null,
  created_at timestamptz not null default now(),
  source_type text,
  certainty_level text,
  certainty_score double precision,
  claim text,
  source_id text,
  source_url text,
  source_metadata jsonb not null default '{}'::jsonb
);

create table casuar_do.model_functions (
  model_id uuid not null references casuar_do.models(id) on delete cascade,
  function_version_id uuid not null references casuar_do.function_versions(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  primary key(model_id, function_version_id)
);

create table casuar_do.graph_versions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references casuar_do.models(id) on delete set null,
  parent_id uuid references casuar_do.graph_versions(id) on delete set null,
  version integer not null check (version > 0),
  status text not null default 'candidate' check (status in ('candidate','incumbent','rejected','archived')),
  graph jsonb not null check (jsonb_typeof(graph) = 'object'),
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(model_id, version)
);

create table casuar_do.research_tasks (
  id uuid primary key default gen_random_uuid(),
  graph_version_id uuid not null references casuar_do.graph_versions(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','researching','synthesizing','completed','failed')),
  priority integer not null default 100,
  frontier jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  proposal jsonb,
  model text,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  estimated_cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index research_tasks_queue_idx on casuar_do.research_tasks(status, priority, created_at);

create table casuar_do.experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('coverage','objective','prediction','causal_closure')),
  definition jsonb not null,
  created_at timestamptz not null default now()
);

create table casuar_do.experiment_runs (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references casuar_do.experiments(id) on delete cascade,
  incumbent_graph_id uuid references casuar_do.graph_versions(id) on delete set null,
  challenger_graph_id uuid references casuar_do.graph_versions(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','preparing','running','verifying','completed','failed')),
  winner text check (winner in ('incumbent','challenger','tie')),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table casuar_do.run_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references casuar_do.experiment_runs(id) on delete cascade,
  arm text check (arm in ('incumbent','challenger','researcher','verifier')),
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index run_artifacts_run_idx on casuar_do.run_artifacts(run_id, arm, kind);

create table casuar_do.regression_cases (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null,
  definition jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table casuar_do.models enable row level security;
alter table casuar_do.observations enable row level security;
alter table casuar_do.runs enable row level security;
alter table casuar_do.functions enable row level security;
alter table casuar_do.function_versions enable row level security;
alter table casuar_do.function_evidence enable row level security;
alter table casuar_do.model_functions enable row level security;
alter table casuar_do.graph_versions enable row level security;
alter table casuar_do.research_tasks enable row level security;
alter table casuar_do.experiments enable row level security;
alter table casuar_do.experiment_runs enable row level security;
alter table casuar_do.run_artifacts enable row level security;
alter table casuar_do.regression_cases enable row level security;

commit;
