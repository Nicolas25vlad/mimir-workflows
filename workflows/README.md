# n8n workflows

The workflow JSON files are importable orchestration definitions for Mimir.

## Required credentials

Create two n8n **Header Auth** credentials.

### Mimir Webhook Auth

- header: `x-mimir-token`
- value: `N8N_WEBHOOK_TOKEN`

Used by the public workflow Webhook nodes.

### Mimir Scanner Auth

- header: `x-mimir-internal-token`
- value: `SCANNER_AUTH_TOKEN`

Used by the internal `Scan Repository` HTTP Request nodes.

If imported credential IDs cannot be resolved, select these credentials manually by name.

## Contract

| Workflow | Webhook path | Deterministic behavior |
| --- | --- | --- |
| Bug Hunt | `mimir/bug-hunt` | Severity-filtered findings + hotspots + large files |
| Refactor Analysis | `mimir/refactor-analysis` | Ranked candidates from churn, size and risk signals |
| Implementation Plan | `mimir/implementation-plan` | Repository-grounded affected paths + phased validation plan |

The scanner endpoint is internal:

`POST http://repo-scanner:8790/scan`

Internal nodes may evolve without breaking MCP clients as long as the workflow output contract remains compatible.
