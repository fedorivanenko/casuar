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
