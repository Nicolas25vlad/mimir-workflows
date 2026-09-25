# Security

## Trust boundaries

1. MCP client → gateway
2. gateway → n8n
3. n8n → repository scanner
4. n8n → agent runner
5. scanner/agent runner → GitHub or configured model provider

Every boundary uses a separate credential.

## MCP

- random `MCP_AUTH_TOKEN`;
- TLS before internet exposure;
- explicit host allowlist;
- constant-time token comparison;
- network-level access control recommended.

## n8n

- editor bound to localhost in starter Compose;
- separate Header Auth credentials for gateway, scanner and agent runner;
- stable `N8N_ENCRYPTION_KEY`;
- workflow exports contain credential references only.

## Repository scanner

- GitHub-only repository parsing;
- arbitrary clone hosts rejected;
- no shell interpolation;
- repository code never executed;
- file/history/timeout budgets;
- secret-like evidence redaction;
- ephemeral checkout cleanup;
- internal-only port;
- read-only container, dropped capabilities, no-new-privileges.

## Agent runner

Repository content, README text, comments, commit subjects and code excerpts are considered untrusted prompt data.

Controls:

- model provider URL is administrator-controlled environment configuration, never taken from MCP input;
- only HTTP/HTTPS provider URLs are accepted;
- input context and output tokens are capped;
- prompt explicitly rejects instructions embedded in repository content;
- model output is returned as probabilistic analysis, separate from deterministic evidence;
- provider errors do not fail the deterministic workflow;
- provider API keys are never echoed in responses or logs by Mimir;
- agent-runner port is internal-only;
- container runs read-only with dropped capabilities and no-new-privileges.

For hosted providers, configure the narrowest possible API credential. For local inference, keep the provider on a private network.

## Public repository note

This repository can remain public only while secrets stay in Infisical/runtime/n8n credentials and never in committed workflow exports.
