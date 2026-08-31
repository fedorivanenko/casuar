# Casuar

Casuar is a health-targeted autonomous research and computation engine.

## v0

- Supabase Postgres is the source of truth.
- Python + FastAPI provide deterministic compute and orchestration.
- Railway is the intended runtime.
- `model_runs` records each computation/reasoning pass.

## Run locally

```bash
uv sync
uv run uvicorn app.main:app --reload
```
