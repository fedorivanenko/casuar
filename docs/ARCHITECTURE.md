# Architecture invariants

## Canonical ownership

- Concepts are global and canonical.
- A biological claim has one canonical record.
- Evidence attaches to claims; sources are not claims.
- Person observations never become generic knowledge automatically.
- Inferred person states are derived and retain provenance.
- Domains are projections over canonical concepts/claims, never parallel biological databases.

## System split

### Knowledge
`objects`, `concepts`, `relation_types`, `claims`, `sources`, `claim_evidence`

### Person
`subjects`, `observations`, `inferred_states`

### Research operations
`research_projects`, `research_questions`, `research_jobs`

### Compute
Stateless/ephemeral workers consume research jobs and write typed results through the Casuar service layer.

## Agent boundary

MCP is an operator surface. Tools should expose domain operations and enforce invariants. Raw SQL should remain an administrative escape hatch, not the normal agent contract.
