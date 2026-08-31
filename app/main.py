import os

import psycopg
from fastapi import FastAPI, HTTPException

app = FastAPI(title="Casuar Compute", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/db-health")
def db_health() -> dict[str, object]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured")

    try:
        with psycopg.connect(database_url, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select
                      current_database(),
                      exists(select 1 from pg_namespace where nspname = 'casuar'),
                      exists(
                        select 1
                        from information_schema.tables
                        where table_schema = 'casuar' and table_name = 'subjects'
                      )
                    """
                )
                database, schema_exists, subjects_exists = cur.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"database connection failed: {type(exc).__name__}") from exc

    return {
        "status": "ok",
        "database": database,
        "casuar_schema": schema_exists,
        "subjects_table": subjects_exists,
    }
