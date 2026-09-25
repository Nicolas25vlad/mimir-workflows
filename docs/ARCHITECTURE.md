# Architecture

Mimir has three runtime layers.

## 1. MCP gateway

The TypeScript gateway owns the public contract.

Responsibilities:

- expose semantic MCP tools over Streamable HTTP;
- validate tool arguments with Zod;
- protect the endpoint with a bearer token;
- translate tool calls into stable n8n webhook requests;
- enforce workflow timeouts;
- return structured workflow results.

It should not clone repositories, execute repository code, or contain large prompt chains.

## 2. n8n orchestration

n8n owns routing and composition.

Current workflows:

1. receive and authenticate the MCP-originated webhook;
2. call the internal repository scanner;
3. turn deterministic context into a bounded workflow-specific result;
4. respond to the MCP gateway.

Future workflows can fan out to static-analysis workers and LLM agents after the scanner without changing MCP clients.

## 3. Repository scanner

The scanner is an internal read-only worker.

It:

- accepts only GitHub repositories;
- resolves a requested ref to a commit;
- performs a shallow fetch into an ephemeral directory;
- inventories bounded source/config content;
- computes recent git churn;
- detects language mix and large files;
- applies deterministic bug/security/debt rules;
- redacts secret-like evidence;
- removes the checkout after every request.

The scanner does **not** execute repository code, dependency install scripts, builds, tests, hooks, or arbitrary shell supplied by the repository.

## Boundary contract

MCP tools are stable API surface:

- `bug_hunt`
- `refactor_analysis`
- `implementation_plan`

Internal webhook paths:

- `/webhook/mimir/bug-hunt`
- `/webhook/mimir/refactor-analysis`
- `/webhook/mimir/implementation-plan`

Internal scanner endpoint:

- `POST http://repo-scanner:8790/scan`

Every boundary has a separate secret.

Do not expose a generic "run any workflow", "clone arbitrary URL", or "execute repository command" primitive.

## Analysis ladder

Mimir should grow in this order:

1. deterministic repository context;
2. deterministic static analysis;
3. focused agent analysis over selected evidence;
4. synthesis and deduplication;
5. optional write-capable workflows behind separate explicit tools.

That ordering keeps cost, hallucination surface, and blast radius low.
