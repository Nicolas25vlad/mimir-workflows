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
  <img alt="scanner" src="https://img.shields.io/badge/scanner-deterministic-98BB6C">
</p>

---

## What is Mimir?

**Mimir Workflows** is a self-hosted automation layer for recurring software-engineering analysis.

The public surface is MCP. n8n owns orchestration. A separate read-only repository scanner does the cheap deterministic work before an LLM ever sees the problem.

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
        ┌────┴──────────────┐
        ▼                   ▼
 deterministic          agent / LLM
 repo-scanner            stages
        │                   │
        └─────────┬─────────┘
                  ▼
          structured result
```

The gateway exposes semantic tools rather than a generic `execute_workflow(id)` escape hatch. Clients never need to know n8n workflow IDs or internal topology.

## MCP tools

| Tool | Current behavior |
| --- | --- |
| `bug_hunt` | Clones a GitHub ref read-only, scans deterministic bug/security/debt patterns, filters by severity and returns evidence + hotspots. |
| `refactor_analysis` | Combines git churn, large-file metrics and risk findings into ranked refactor candidates. |
| `implementation_plan` | Grounds a phased implementation plan in repository structure, hotspots, risk signals and path relevance. |

The next layer is agent synthesis: Semgrep/CodeQL adapters and provider-neutral LLM workers can be inserted after the deterministic scan without changing the MCP contracts.

## Repository scanner

The scanner currently collects:

- repository/ref → immutable commit SHA;
- bounded file inventory and language distribution;
- recent commit metadata;
- files with the most recent churn;
- largest analyzed source/config files;
- deterministic findings for risky patterns such as dynamic eval, disabled TLS verification, empty exception handling and secret-like literals;
- redacted excerpts from a small set of project entry/config files.

It deliberately rejects non-GitHub clone hosts. This prevents workflows from turning repository input into a generic network fetch primitive.

## Quick start

### 1. Configure

```bash
cp .env.example .env
```

Generate **four different** secrets:

```bash
openssl rand -hex 32
```

Use independent values for:

- `MCP_AUTH_TOKEN`
- `N8N_WEBHOOK_TOKEN`
- `SCANNER_AUTH_TOKEN`
- `N8N_ENCRYPTION_KEY`

For private repositories, also set `GITHUB_TOKEN` to a read-only token with access only to the repositories Mimir should inspect.

### 2. Start

```bash
docker compose up -d --build
```

- n8n editor: `http://localhost:5678`
- MCP endpoint: `http://localhost:8787/mcp`
- gateway health: `http://localhost:8787/healthz`
- scanner: internal Docker network only

### 3. Configure n8n credentials

Create two **Header Auth** credentials in n8n.

**Mimir Webhook Auth**

- header: `x-mimir-token`
- value: `N8N_WEBHOOK_TOKEN`

**Mimir Scanner Auth**

- header: `x-mimir-internal-token`
- value: `SCANNER_AUTH_TOKEN`

The workflow JSON exports reference those credential names but never contain their values.

### 4. Import and activate workflows

Import:

- `workflows/bug-hunt.json`
- `workflows/refactor-analysis.json`
- `workflows/implementation-plan.json`

If n8n cannot resolve credential placeholders automatically, select the two credentials above in the Webhook and Scan Repository nodes.

### 5. Smoke test

```bash
curl -s http://localhost:8787/healthz
```

List MCP tools:

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
| `MCP_ALLOWED_HOSTS` | no | `localhost,127.0.0.1` | Host allowlist used by the MCP Express adapter. |
| `N8N_BASE_URL` | yes | `http://n8n:5678` | Internal n8n URL. |
| `N8N_WEBHOOK_TOKEN` | yes | - | Gateway → n8n shared secret. |
| `N8N_TIMEOUT_MS` | no | `120000` | Workflow request timeout. |
| `SCANNER_AUTH_TOKEN` | yes | - | n8n → scanner shared secret. |
| `SCANNER_GIT_DEPTH` | no | `80` | Git history depth used for churn analysis. |
| `SCANNER_MAX_FILES` | no | `180` | Maximum files whose contents are analyzed. |
| `SCANNER_MAX_FILE_BYTES` | no | `262144` | Per-file analysis limit. |
| `SCANNER_MAX_TOTAL_BYTES` | no | `4194304` | Total content budget per scan. |
| `GITHUB_TOKEN` | no | empty | Read-only GitHub token for private repositories. |
| `N8N_ENCRYPTION_KEY` | yes | - | Encrypts n8n credentials at rest. |

## Repository layout

```text
.
├── src/
│   ├── scanner/
│   │   ├── config.ts
│   │   ├── index.ts
│   │   └── repository.ts
│   ├── auth.ts
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

- **MCP is the contract.** Internal workflows can evolve without breaking clients.
- **Deterministic before probabilistic.** Cheap scanners reduce context and give agents evidence.
- **n8n orchestrates.** Heavy compute belongs in explicit workers rather than giant Code nodes.
- **Structured in, structured out.** Bounded JSON beats unbounded model prose.
- **Read-only by default.** Analysis tools do not modify repositories.
- **Secrets never enter exports.** Use n8n credentials, Infisical or runtime secret injection.
- **GitOps-friendly.** Runtime state and deployment configuration remain easy to register in a separate homelab GitOps repository.

## Roadmap

- [x] MCP gateway over Streamable HTTP
- [x] Bearer protection for MCP
- [x] Authenticated n8n webhook boundary
- [x] Docker Compose bootstrap
- [x] CI typecheck/tests/build
- [x] Repository scanner worker
- [x] Git churn + bounded source inventory
- [x] Deterministic first-pass findings
- [ ] GitHub App installation auth
- [ ] Semgrep / CodeQL worker adapters
- [ ] Provider-neutral LLM agent runner
- [ ] Workflow result persistence and cache
- [ ] PR-triggered background analyses
- [ ] OpenTelemetry traces and per-workflow cost metrics

## Security

n8n binds to localhost. The scanner has no published host port, runs read-only with a bounded `/tmp`, and drops Linux capabilities in the starter Compose deployment.

See [docs/SECURITY.md](docs/SECURITY.md).

## License

MIT © 2026 Nicolas Vlad.
