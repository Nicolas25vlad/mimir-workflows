# n8n workflows

The JSON files in this directory are importable starter workflows.

They intentionally implement the stable webhook contract before choosing a specific scanner or LLM provider. After import:

1. create a Header Auth credential named `Mimir Webhook Auth`;
2. use header `x-mimir-token`;
3. use the same value configured as `N8N_WEBHOOK_TOKEN` in the gateway;
4. attach the credential to each Webhook node;
5. activate the workflows.

## Contract

All workflows receive a JSON body from the MCP gateway and return a JSON object.

Keep these webhook paths stable:

| Workflow | Path |
| --- | --- |
| Bug Hunt | `mimir/bug-hunt` |
| Refactor Analysis | `mimir/refactor-analysis` |
| Implementation Plan | `mimir/implementation-plan` |

Internal nodes can change freely without breaking MCP clients.
