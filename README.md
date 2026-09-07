# Casuar

Casuar is a causal health knowledge and decision system.

## Architecture

Casuar separates four things that must never collapse into one another:

1. **Biological reality** — canonical concepts, states and events.
2. **Knowledge about reality** — claims and evidence.
3. **Person context** — observations and person-specific inferred states.
4. **Research/decision process** — questions, searches, verification and decisions.

Domain areas such as GI, thyroid, nutrition and preconception are projections over the shared biological graph, not independent sources of truth.

```text
                  Casuar MCP
                      |
                Domain Service
              /        |        \
     Knowledge DB   Person DB   Research jobs
              \        |        /
                 shared IDs
```

## MCP principle

Agents operate through semantic tools such as `get_object`, `create_observation`, `propose_claim`, and `open_research_question`. They should not normally mutate arbitrary tables directly.

## Current status

This repository is a clean architecture reset. `supabase/migrations` defines the canonical v1 storage model. Data from the legacy Supabase project should be migrated selectively rather than copying legacy schemas wholesale.

## Tiny causal runner

MCP tool `run_model` forwards to the Python function `/api/causal-run` on this same
Vercel project. It uses a purpose-derived key from the existing `CASUAR_MCP_TOKEN`;
no new secret is needed for co-located execution. The endpoint denies unauthenticated
requests. `causal_runtime/UPSTREAM.md` records the engine source and pinned revision.

Omit model/model_id for the synthetic demo, or pass an explicit arithmetic model.
`persist: false` is the inline/demo default, clearly reported in the result. Stored
models and persistence require private `DATABASE_URL` plus the upstream `schema.sql`.
The existing Supabase REST credentials alone do not configure this Postgres path.

Optional `CASUAR_CAUSAL_RUN_URL` overrides the production Python endpoint (HTTPS only).
Use it for an independent engine deployment with the same private secret. The default
is https://casuar-jet.vercel.app/api/causal-run; preview MCP deployments also call this
production endpoint unless overridden. Do not use real patient data in preview tests.

After deployment, refresh the Casuar connector's tool list to discover `run_model`.
