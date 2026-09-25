# Deployment

This guide describes the intended homelab deployment shape for Mimir Workflows.

## Recommended topology

```text
Internet / private client
          |
          | HTTPS
          v
 reverse proxy / tunnel
          |
          v
   mcp-gateway:8787
          |
          v
         n8n
      /        \
     v          v
scanner      agent-runner
```

Only the MCP gateway should normally be reachable from outside the Docker network.

The starter Compose file binds the n8n editor to localhost and does not publish the scanner or agent-runner.

## Secrets

Keep these values independent:

```text
MCP_AUTH_TOKEN
N8N_WEBHOOK_TOKEN
SCANNER_AUTH_TOKEN
AGENT_AUTH_TOKEN
N8N_ENCRYPTION_KEY
```

For a GitOps-managed homelab, inject them from your secret manager at deploy time rather than committing a generated `.env`.

Optional credentials:

- `GITHUB_TOKEN`: read-only private repository access;
- `AGENT_API_KEY`: hosted model provider access.

## First deployment

```bash
cp .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
```

Check the gateway:

```bash
curl -fsS http://localhost:8787/healthz
```

Check service logs if necessary:

```bash
docker compose logs --tail=100 mcp-gateway
docker compose logs --tail=100 repo-scanner
docker compose logs --tail=100 agent-runner
docker compose logs --tail=100 n8n
```

## n8n bootstrap

Create these Header Auth credentials:

| Credential | Header |
| --- | --- |
| `Mimir Webhook Auth` | `x-mimir-token` |
| `Mimir Scanner Auth` | `x-mimir-internal-token` |
| `Mimir Agent Auth` | `x-mimir-agent-token` |

Use the corresponding secrets from the runtime environment.

Import and activate all JSON files under `workflows/`.

## Reverse proxy or tunnel

Expose only:

```text
/mcp
/healthz
```

Terminate TLS before traffic reaches the gateway.

When using a public hostname, add it to `MCP_ALLOWED_HOSTS`.

Example:

```dotenv
MCP_ALLOWED_HOSTS=mimir.example.com,localhost,127.0.0.1
```

Do not expose:

- n8n port 5678;
- scanner port 8790;
- agent-runner port 8791.

## GitOps

The Mimir repository should remain application-focused.

A separate homelab GitOps repository can own:

- deployment enable/disable state;
- image/source revision;
- reverse proxy or tunnel configuration;
- secret references;
- resource limits;
- restart policy;
- monitoring configuration.

That keeps infrastructure lifecycle separate from Mimir's application code.

## Resource limits

The repository scanner is intentionally bounded by:

- `SCANNER_GIT_DEPTH`;
- `SCANNER_MAX_FILES`;
- `SCANNER_MAX_FILE_BYTES`;
- `SCANNER_MAX_TOTAL_BYTES`;
- `SCANNER_TIMEOUT_MS`.

The agent runner is bounded by:

- `AGENT_MAX_INPUT_CHARS`;
- `AGENT_MAX_OUTPUT_TOKENS`;
- `AGENT_TIMEOUT_MS`.

Tune these before increasing container resources.

## Updating

```bash
git pull --ff-only
docker compose up -d --build
```

After changes to workflow JSON, re-import or update the corresponding n8n workflows deliberately. Do not assume application container updates modify n8n's persisted workflow state.

## Rollback

Application rollback:

```bash
git checkout <known-good-commit>
docker compose up -d --build
```

n8n stores state in the `n8n_data` volume. Treat workflow/credential changes as persistent state and back them up separately from the application checkout.
