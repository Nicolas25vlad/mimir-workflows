# Architecture

Mimir has four runtime layers.

## 1. MCP gateway

Owns the public tool contract and authentication. It translates semantic tool calls into stable n8n webhooks.

## 2. n8n orchestration

Owns routing, fan-out/fan-in, retries and workflow visibility.

Current path:

1. authenticate the MCP-originated webhook;
2. call the deterministic repository scanner;
3. call the optional agent runner with the scan as bounded context;
4. shape deterministic and probabilistic outputs separately;
5. return structured JSON to the MCP gateway.

## 3. Repository scanner

A read-only GitHub-only worker.

It resolves refs, performs shallow ephemeral fetches, inventories bounded source/config files, computes churn, detects large files and applies deterministic rules.

It never executes repository code.

## 4. Agent runner

An internal provider-neutral inference worker.

It accepts:

- workflow kind;
- original tool input;
- deterministic repository scan.

It then:

- treats repository content as untrusted prompt data;
- bounds serialized model context;
- sends a structured system/user prompt to an administrator-configured OpenAI-compatible chat-completions endpoint;
- requests JSON mode when supported;
- retries without JSON-mode flags when a compatible provider rejects them;
- normalizes structured or partially structured output;
- degrades to deterministic-only or agent-error metadata without taking down the workflow.

Provider URLs are runtime configuration, not user-controlled workflow input.

## Boundaries

Public MCP tools:

- `bug_hunt`
- `refactor_analysis`
- `implementation_plan`

Internal endpoints:

- n8n webhooks under `/webhook/mimir/*`
- scanner: `POST http://repo-scanner:8790/scan`
- agent runner: `POST http://agent-runner:8791/analyze`

Each boundary has a different shared secret.

## Analysis ladder

1. repository context;
2. deterministic scanning;
3. focused agent reasoning;
4. synthesis/deduplication;
5. optional write-capable workflows behind separate explicit contracts.

Do not collapse those layers into a generic arbitrary workflow or shell execution primitive.
