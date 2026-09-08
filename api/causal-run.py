import os

CANONICAL_SUPABASE_PROJECT_REF = "itsszsqxjqzaecqlbidk"

# Never persist against a stale/foreign database configuration. Inline simulations
# still work without DATABASE_URL; persistence is enabled only after Vercel is
# explicitly pointed at the canonical Casuar project.
if os.environ.get("CASUAR_SUPABASE_PROJECT_REF") != CANONICAL_SUPABASE_PROJECT_REF:
    os.environ.pop("DATABASE_URL", None)

from causal_runtime.endpoint import Handler

class handler(Handler):
    pass
