# Casuar

Casuar is a YAML-driven dynamic structural causal model engine.

It builds executable mechanistic models from small auditable modules, simulates
state over time, and projects interventions using `do()` semantics.

## Core model

A Casuar model evolves over time:

```txt
state[t+1] = transition(state[t], inputs[t], params, regime[t])
observations[t] = measurement(state[t], params)
```

An intervention overrides an input, mechanism, parameter, or event:

```txt
do(intervention) = modify input/mechanism/parameter/event
```

## Modules

Each module is a small state-transition mechanism:

```txt
module_step: State × Inputs × Params → State × Outputs
```

Example:

```txt
follicle_maturity[t], FSH[t], params
→ follicle_maturity[t+1], estradiol[t+1]
```

Modules are deterministic by default, with optional uncertainty wrappers:

```txt
prob_module_step: State × Inputs × Params → Distribution[State × Outputs]
```

Example deterministic core:

```txt
lh_readiness = max(0, estradiol - threshold) * gain
```

Example uncertainty wrapper:

```txt
threshold ~ distribution
estradiol_observed = estradiol_true + measurement_noise
ovulation_event ~ Bernoulli(sigmoid(lh_readiness))
```

## Engine

The engine has four parts:

1. **Model language** — schemas for variables, state, params, mechanisms, modules,
   claims, evidence, regimes, and interventions.
2. **Compiler** — validates YAML specs and builds a dependency graph plus executable
   step functions.
3. **Simulator** — runs the model over time.
4. **Intervention and explanation layer** — compares baseline vs `do()` scenarios
   and explains causal paths with evidence references.

## Execution flow

```txt
models/ovulation.yaml
→ schema validation
→ dependency graph
→ executable state-transition functions
→ simulation/projection
→ trajectories, intervention effects, explanations
```

## Implementation

MVP uses interpreted function calls, not generated code:

```txt
YAML spec → validated model graph → function registry calls
```

Example:

```yaml
function: cappedGrowth
```

The engine calls an existing implementation:

```ts
functions.cappedGrowth(...)
```

Code generation is optional later:

```txt
YAML spec → generated TypeScript/Python/JAX code
```

## Roadmap

Start with deterministic ovulation modules:

```txt
follicle growth → estradiol → LH surge → ovulation → progesterone
```

Later add:

- probabilistic wrappers
- personalization
- coarse/fine module implementations
- evidence-linked causal claims
- regimes for preconception, conception, pregnancy, and postpartum
