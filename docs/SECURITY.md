# Security

## Trust boundaries

Mimir has three main boundaries:

1. MCP client → gateway
2. gateway → n8n
3. n8n → external systems such as GitHub, scanners and LLM providers

Each boundary should have independent credentials.

## Required controls

### MCP endpoint

- Keep `MCP_AUTH_TOKEN` random and unique.
- Terminate TLS before exposing the gateway outside your LAN.
- Set `MCP_ALLOWED_HOSTS` to the real hostnames you serve.
- Prefer Cloudflare Access, Tailscale, an authenticated reverse proxy or another network-level control in addition to the application token.

### n8n

- The starter Compose file binds the editor to `127.0.0.1`.
- Do not expose port 5678 directly to the internet.
- Configure a built-in n8n **Header Auth** credential named `Mimir Webhook Auth`.
- Header name: `x-mimir-token`.
- Header value: `N8N_WEBHOOK_TOKEN`.
- Keep `N8N_ENCRYPTION_KEY` stable. Rotating it without migrating credentials can make stored credentials unreadable.

### Workflow design

- Analysis workflows should remain read-only unless a separate write-capable tool is intentionally designed.
- Never place API keys or tokens directly inside exported workflow JSON.
- Prefer credentials/secret injection from Infisical or the runtime.
- Treat repository contents, issue text and PR comments as untrusted input.
- Do not let repository text directly become shell commands, URLs, credential names or workflow IDs.
- Put timeouts and output-size limits around every external call.

## Public repository note

This repository is safe to keep public only if workflow exports contain **credential references, never credential values**. Review every exported workflow before committing it.
