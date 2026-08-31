# Casuar

Casuar builds auditable executable models from explicit mechanistic specifications.

## Generated model pipeline

```text
ModelSpec
  -> GLM-5.3-Flash compiler
  -> Qwen3-Coder-30B-A3B independent review
  -> Vercel Sandbox (Python 3.13)
  -> tests
  -> calculate(inputs)
```

The compiler is intentionally not a research agent: it is told not to invent scientific claims and only translates an explicit `ModelSpec` into deterministic Python plus standard-library `unittest` tests.

### Packages

- `packages/model-spec` — canonical executable-model contract
- `packages/model-compiler` — Vercel AI Gateway compiler
- `packages/model-reviewer` — independent semantic/safety review
- `packages/sandbox` — disposable Python execution
- `packages/runtime` — compile -> review -> execute orchestration
- `apps/demo` — non-medical linear end-to-end example

### Models

Defaults are configurable:

```bash
CASUAR_COMPILER_MODEL=zai/glm-5.3-flash
CASUAR_REVIEWER_MODEL=alibaba/qwen3-coder-30b-a3b
```

### Authentication

AI Gateway accepts `AI_GATEWAY_API_KEY` or Vercel OIDC. For local Sandbox development, link the checkout to a Vercel project and pull the development environment:

```bash
vercel link
vercel env pull .env
```

The same Vercel-linked environment can authenticate AI Gateway and Sandbox. When the persistent Casuar API runs outside Vercel (for example Railway), its Vercel Sandbox credentials should be injected as service secrets rather than passed into generated code.

### Run

```bash
pnpm install
pnpm typecheck
pnpm demo
```

Generated code receives no Casuar/database/provider secrets. Sandboxes are non-persistent and are stopped in `finally` after every run.
