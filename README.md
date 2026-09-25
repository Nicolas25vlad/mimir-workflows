<p align="center">
  <img src="docs/assets/mimir.svg" alt="Mimir Workflows" width="720" />
</p>

<p align="center">
  Self-hosted engineering agent workflows, exposed to AI clients through MCP and orchestrated with n8n.
</p>

<p align="center">
  <a href="https://github.com/Nicolas25vlad/mimir-workflows/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Nicolas25vlad/mimir-workflows/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg"></a>
  <img alt="MCP" src="https://img.shields.io/badge/MCP-2026--07--28-7E9CD8">
  <img alt="n8n" src="https://img.shields.io/badge/orchestrator-n8n-C0A36E">
</p>

---

## What is Mimir?

**Mimir Workflows** is a small, self-hosted automation layer for recurring software-engineering work.

Instead of making an AI client repeatedly perform mechanical repository analysis inside the chat context, Mimir exposes stable MCP tools and delegates the heavy lifting to n8n workflows running in your homelab.

```text
ChatGPT / Codex / MCP client
            │
            │ MCP over Streamable HTTP
            ▼
      Mimir MCP Gateway
            │
            │ authenticated webhook
            ▼
             n8n
        ┌────┼─────┐
        ▼    ▼     ▼
   scanners  LLMs  GitHub
        └────┬─────┘
             ▼
     structured result
```

The gateway exposes **semantic tools**, not a generic `execute_workflow(id)` escape hatch. That keeps the MCP surface predictable, auditable and much harder to misuse.

## Initial MCP tools

| Tool | Purpose |
| --- | --- |
| `bug_hunt` | Inspect a repository/ref for likely bugs, regressions and suspicious edge cases. |
| `refactor_analysis` | Identify maintainability hotspots and build a focused refactor proposal. |
| `implementation_plan` | Convert a feature, issue or engineering request into an implementation plan. |

The bundled n8n workflows are executable **contract-first starters**. They validate MCP → gateway → n8n end to end and deliberately leave provider-specific scanner/LLM nodes pluggable.

## Quick start

### 1. Configure

```bash
cp .env.example .env
```

Generate independent secrets:

```bash
openssl rand -hex 32
```

Use separate values for `MCP_AUTH_TOKEN`, `N8N_WEBHOOK_TOKEN` and `N8N_ENCRYPTION_KEY`.

### 2. Start

```bash
docker compose up -d --build
```

- n8n editor: `http://localhost:5678`
- MCP endpoint: `http://localhost:8787/mcp`
- health: `http://localhost:8787/healthz`

### 3. Configure n8n webhook authentication

In n8n, create one **Header Auth** credential:

- credential name: `Mimir Webhook Auth`
- header name: `x-mimir-token`
- header value: the same value as `N8N_WEBHOOK_TOKEN`

### 4. Import and activate workflows

Import the JSON files under `workflows/`:

- `bug-hunt.json`
- `refactor-analysis.json`
- `implementation-plan.json`

If n8n cannot resolve the credential placeholder automatically, select **Mimir Webhook Auth** on each Webhook node, then activate the workflows.

### 5. Smoke test

```bash
curl -s http://localhost:8787/healthz
```

Then list MCP tools:

```bash
curl -s -X POST http://localhost:8787/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MCP_AUTH_TOKEN` | yes | - | Bearer token required by the MCP endpoint. |
| `MCP_HOST` | no | `0.0.0.0` | Gateway bind address. |
| `MCP_PORT` | no | `8787` | Gateway port. |
| `MCP_ALLOWED_HOSTS` | no | `localhost,127.0.0.1` | Comma-separated host allowlist used by the MCP Express adapter. |
| `N8N_BASE_URL` | yes | `http://n8n:5678` | Base URL used by the gateway to reach n8n. |
| `N8N_WEBHOOK_TOKEN` | yes | - | Value sent in the `x-mimir-token` header. |
| `N8N_TIMEOUT_MS` | no | `120000` | Maximum workflow request time. |
| `N8N_ENCRYPTION_KEY` | yes | - | Encrypts n8n credentials at rest. |

For a public tunnel, add the public hostname to `MCP_ALLOWED_HOSTS` and terminate TLS before the gateway.

## Repository layout

```text
.
├── src/
│   ├── config.ts
│   ├── index.ts
│   └── n8n-client.ts
├── workflows/
│   ├── bug-hunt.json
│   ├── refactor-analysis.json
│   └── implementation-plan.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   └── assets/mimir.svg
├── .github/workflows/ci.yml
├── compose.yml
├── Dockerfile
└── AGENTS.md
```

## Design principles

- **MCP is the contract.** Clients never need n8n workflow IDs or internal topology.
- **n8n orchestrates.** Long-lived business logic belongs in workers, scanners or explicit agent nodes, not giant Code nodes.
- **Structured in, structured out.** Workflows return compact JSON instead of walls of model prose.
- **Read-only by default.** Analysis tools do not modify repositories.
- **Secrets never enter workflow exports.** Use n8n credentials, Infisical or runtime secret injection.
- **GitOps-friendly.** Runtime config is containerized so the service can be registered in a separate homelab GitOps repository.

## Roadmap

- [x] MCP gateway over Streamable HTTP
- [x] Bearer protection for MCP
- [x] Authenticated n8n webhook boundary
- [x] Importable starter workflows
- [x] Docker Compose bootstrap
- [x] CI typecheck/build
- [ ] GitHub App integration
- [ ] Repository scanner worker
- [ ] LLM provider adapters
- [ ] Workflow result persistence
- [ ] PR-triggered background analyses
- [ ] OpenTelemetry traces and per-workflow cost metrics

## Security

n8n binds to localhost in the starter Compose file. The gateway is the intended external boundary.

See [docs/SECURITY.md](docs/SECURITY.md) for the threat model and deployment checklist.

## License

MIT © 2026 Nicolas Vlad.
