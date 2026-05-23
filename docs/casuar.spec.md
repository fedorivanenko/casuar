# Casuar

Casuar is a causality engine for building deterministic mechanistic models, defining measurement surfaces, projecting interventions, and evaluating intervention effects with do-calculus.

dynamic structural causal model

state[t+1] = mechanism_by_regime(state[t], inputs[t], params)
observations[t] = measurement(state[t])
do(intervention) = modify input/mechanism

Each tiny module can be a deterministic miniature state machine:

current module state + inputs + params
→ next module state + outputs

Example:

follicle_maturity[t], FSH[t], params
→ follicle_maturity[t+1], estradiol[t+1]

 But not every module must be deterministic forever. Better default:

   deterministic mechanism core
   + optional uncertainty wrapper

Example deterministic core:

lh_readiness = max(0, estradiol - threshold) * gain

Uncertainty wrapper:

threshold ~ distribution
estradiol_observed = estradiol_true + measurement_noise
ovulation_event ~ Bernoulli(sigmoid(lh_readiness))


 Yes. Good mental model:

 ```txt
   next_state = f(current_state, inputs, params)
 ```

 For uncertainty:

 ```txt
   distribution_over_next_state = f(current_state, inputs, params)
 ```


   module_step: State × Inputs × Params → State × Outputs
   prob_module_step: State × Inputs × Params → Distribution[State × Outputs]

 ### Example architecture

 ```txt
   casuar/
     schema.py       # Pydantic YAML schema
     compiler.py     # YAML -> executable model
     engine.py       # simulate/project/do()
     mechanisms.py   # safe built-in functions
 ```

 ### MVP flow

   models/ovulation.yaml
           ↓
   Pydantic validates schema
           ↓
   Compiler builds modules/graph/functions
           ↓
   Engine runs step() over days
           ↓
   Results as DataFrame/JSON

---

 Casuar engine = YAML-driven dynamic structural causal model runner.

 It loads small auditable mechanism modules, validates them, compiles them into
 executable state-transition functions, then simulates biology over time. Each
 module has explicit inputs, state, params, outputs, causal claims, evidence refs,
 and optional coarse/fine implementations behind same contract. Interventions use
 do() semantics: override inputs/mechanisms/events, run baseline vs scenario
 projections, compare trajectories with uncertainty. Start deterministic + simple
 ovulation modules; later add probabilistic wrappers, personalization, more regimes
 like preconception, pregnancy, postpartum.

---

### MVP: interpret/compile to functions in memory

   YAML → validated objects → function registry calls

 Example YAML says:

   function: cappedGrowth

 Engine calls existing TS function:

   functions.cappedGrowth(...)

 ### Later: generate code

  YAML → generated TypeScript/Python/JAX code
 
  So accurate phrase:

  YAML schemas/specs → validated model graph → executable state-transition functions


## Engine

engine = model language + compiler + simulator + do-calculus-ish projection

 Engine has 4 parts:

   1. schema design
   2. compiler
   3. runtime simulator
   4. intervention/explanation layer

 ### 1. Schema design

 Defines model language:

   variables, state, params, mechanisms, modules, claims, evidence, regimes

### 2. Compiler

Turns YAML spec into executable graph/functions:
   YAML → validated model → dependency graph → step functions

### 3. Runtime simulator

Runs model over time:
   state[t+1] = step(state[t], inputs[t], params)

### 4. Intervention/explanation

 Runs counterfactuals:
  baseline vs do(intervention)
 
 Explains path:
   estradiol → LH surge → ovulation → progesterone
 with evidence refs.

 So:
  engine = model language + compiler + simulator + do-calculus-ish projection
