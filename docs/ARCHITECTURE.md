# Architecture

Mimir is split into two intentionally boring layers.

## 1. MCP gateway

The TypeScript gateway owns the public tool contract.

Responsibilities:

- expose semantic MCP tools over Streamable HTTP;
- validate tool arguments with Zod;
- protect the endpoint with a bearer token;
- translate tool calls into stable n8n webhook requests;
- enforce workflow timeouts;
- return structured workflow results.

It should **not** clone repositories, call arbitrary shell commands, or contain large prompt chains.

## 2. n8n orchestration

n8n owns orchestration.

A mature workflow may coordinate:

1. repository metadata and diff collection;
2. deterministic scanners such as Semgrep, CodeQL or language-native linters;
3. focused LLM agents;
4. evidence normalization;
5. duplicate finding removal;
6. confidence/severity scoring;
7. compact result synthesis.

The initial JSON exports are contract-first starters. They keep the webhook paths and input/output shape stable while those internal nodes evolve.

## Boundary contract

MCP tool names are stable API surface:

- `bug_hunt`
- `refactor_analysis`
- `implementation_plan`

n8n webhook paths are internal implementation details:

- `/webhook/mimir/bug-hunt`
- `/webhook/mimir/refactor-analysis`
- `/webhook/mimir/implementation-plan`

Do not expose a generic "run any workflow" MCP tool. It couples clients to internal IDs and widens the blast radius of mistakes.

## Suggested future workers

Keep expensive or specialized work outside giant n8n Code nodes:

- `repo-scanner`: checkout, tree inventory, language detection, diff collection;
- `static-analysis`: Semgrep/CodeQL/linter adapters;
- `agent-runner`: provider-neutral LLM calls and structured outputs;
- `result-store`: persistence keyed by repository/ref/PR/run ID.

n8n then stays what it is good at: routing, fan-out/fan-in, retries, scheduling and visibility.
