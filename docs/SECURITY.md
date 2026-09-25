# Security

## Trust boundaries

Mimir has four meaningful boundaries:

1. MCP client → gateway
2. gateway → n8n
3. n8n → repository scanner
4. n8n/workers → external systems such as GitHub and LLM providers

Use independent credentials for each boundary.

## MCP endpoint

- Keep `MCP_AUTH_TOKEN` random and unique.
- Terminate TLS before exposing the gateway outside your LAN.
- Set `MCP_ALLOWED_HOSTS` to the real hostnames you serve.
- Prefer Cloudflare Access, Tailscale or another network-level control in addition to the application token.
- Bearer comparison uses constant-time comparison after length validation.

## n8n

- The starter Compose file binds the editor to `127.0.0.1`.
- Do not expose port 5678 directly to the internet.
- Configure `Mimir Webhook Auth` with header `x-mimir-token`.
- Configure `Mimir Scanner Auth` with header `x-mimir-internal-token`.
- Keep `N8N_ENCRYPTION_KEY` stable.

## Repository scanner

The scanner is intentionally not a general clone/fetch service.

Controls:

- only `owner/name`, github.com HTTPS URLs and github.com SSH URLs are accepted;
- arbitrary hosts are rejected before git starts;
- refs starting with `-` or containing control characters are rejected;
- git runs without a shell;
- interactive credential prompts are disabled;
- GitHub credentials are passed through git configuration environment values, not embedded in clone URLs;
- repository code is never executed;
- content, file-count, history-depth and timeout budgets are bounded;
- binary/generated/dependency directories are skipped;
- secret-like evidence is redacted;
- checkouts live under ephemeral `/tmp` and are removed in `finally`;
- Compose runs the scanner read-only, capability-free, with `no-new-privileges` and a bounded tmpfs;
- scanner port 8790 is not published to the host.

For private repositories, prefer a fine-grained read-only GitHub token restricted to the smallest repository set. A GitHub App installation token is the planned long-term credential model.

## Workflow design

- Keep analysis workflows read-only unless a separate write tool is intentionally designed.
- Never place API keys or tokens inside exported workflow JSON.
- Treat repository contents, issue text and PR comments as untrusted input.
- Never convert repository text directly into shell commands, URLs, credential names or workflow IDs.
- Put timeouts and output-size limits around external calls.

## Public repository note

This repository can remain public as long as exported workflow files contain credential references only, never credential values.
