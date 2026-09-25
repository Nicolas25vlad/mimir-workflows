<p align="center">
  <img src="docs/assets/mimir.svg" alt="Mimir Workflows" width="720" />
</p>

<p align="center">
  Self-hosted engineering agent workflows, exposed through MCP and orchestrated with n8n.
</p>

<p align="center">
  <a href="https://github.com/Nicolas25vlad/mimir-workflows/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Nicolas25vlad/mimir-workflows/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg"></a>
  <img alt="MCP" src="https://img.shields.io/badge/MCP-2026--07--28-7E9CD8">
  <img alt="n8n" src="https://img.shields.io/badge/orchestrator-n8n-C0A36E">
  <img alt="scanner" src="https://img.shields.io/badge/scanner-deterministic-98BB6C">
  <img alt="agent" src="https://img.shields.io/badge/agent-provider--neutral-938AA9">
</p>

---

## What is Mimir?

**Mimir Workflows** is a self-hosted automation layer for recurring software-engineering analysis.

The public contract is MCP. n8n owns orchestration. A deterministic repository scanner gathers bounded evidence first, then an optional provider-neutral agent stage can reason over that evidence.

```text
ChatGPT / Codex / MCP client
            │
            ▼
      Mimir MCP Gateway
            │
            ▼
             n8n
        ┌────┴─────────────┐
        ▼                  ▼
 deterministic         provider-neutral
 repo-scanner          agent-runner
        │                  │
        └────────┬─────────┘
                 ▼
         structured result
```

If no model provider is configured, Mimir continues working in deterministic-only mode.

## MCP tools

| Tool | Behavior |
| --- | --- |
| `bug_hunt` | Deterministic bug/security/debt findings plus optional model analysis. |
| `refactor_analysis` | Ranked refactor candidates from churn, size and risk signals plus optional model analysis. |
| `implementation_plan` | Repository-grounded plan with deterministic fallback and optional agent-generated plan. |

Deterministic evidence and probabilistic analysis are returned as separate fields on purpose.

## Agent runner

The agent runner speaks a small internal contract and calls any **OpenAI-compatible chat completions endpoint** configured through environment variables.

That means the workflow itself does not care whether the backend is:

- NVIDIA NIM;
- vLLM;
- an Ollama-compatible OpenAI endpoint;
- another OpenAI-compatible provider.

The runtime uses `AGENT_BASE_URL`, `AGENT_MODEL`, and optionally `AGENT_API_KEY`.

Repository content is explicitly treated as untrusted prompt data. Agent prompts instruct the model to ignore instructions embedded in code, docs, comments and commit messages.

If the provider is unavailable, the runner returns `agent-error` metadata and the deterministic workflow still completes.

## Quick start

### 1. Configure

```bash
cp .env.example .env
```

Generate independent secrets:

```bash
openssl rand -hex 32
```

Use different values for:

- `MCP_AUTH_TOKEN`
- `N8N_WEBHOOK_TOKEN`
- `SCANNER_AUTH_TOKEN`
- `AGENT_AUTH_TOKEN`
- `N8N_ENCRYPTION_KEY`

For private repositories, set a read-only `GITHUB_TOKEN`.

To enable agent-assisted mode, set:

```dotenv
AGENT_BASE_URL=https://your-provider.example/v1
AGENT_API_KEY=...
AGENT_MODEL=your-model
```

Leave those blank to run deterministic-only.

### 2. Start

```bash
docker compose up -d --build
```

- n8n editor: `http://localhost:5678`
- MCP endpoint: `http://localhost:8787/mcp`
- scanner and agent-runner: Docker-internal only

### 3. Configure n8n credentials

Create three Header Auth credentials.

**Mimir Webhook Auth**

- header: `x-mimir-token`
- value: `N8N_WEBHOOK_TOKEN`

**Mimir Scanner Auth**

- header: `x-mimir-internal-token`
- value: `SCANNER_AUTH_TOKEN`

**Mimir Agent Auth**

- header: `x-mimir-agent-token`
- value: `AGENT_AUTH_TOKEN`

### 4. Import workflows

Import the JSON files from `workflows/` and attach the credentials above if n8n cannot resolve the placeholder IDs automatically.

## Runtime configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MCP_AUTH_TOKEN` | yes | - | MCP bearer token |
| `N8N_WEBHOOK_TOKEN` | yes | - | gateway → n8n |
| `SCANNER_AUTH_TOKEN` | yes | - | n8n → scanner |
| `AGENT_AUTH_TOKEN` | yes | - | n8n → agent runner |
| `GITHUB_TOKEN` | no | empty | private repository read access |
| `AGENT_BASE_URL` | no | empty | OpenAI-compatible `/v1` base URL |
| `AGENT_API_KEY` | no | empty | provider credential |
| `AGENT_MODEL` | no | empty | provider model ID |
| `AGENT_TIMEOUT_MS` | no | `120000` | provider timeout |
| `AGENT_MAX_INPUT_CHARS` | no | `120000` | model context budget guard |
| `AGENT_MAX_OUTPUT_TOKENS` | no | `2500` | output cap |
| `N8N_ENCRYPTION_KEY` | yes | - | n8n credential encryption |

See `.env.example` for scanner limits and remaining settings.

## Repository layout

```text
src/
├── agent/
│   ├── client.ts
│   ├── config.ts
│   └── index.ts
├── scanner/
│   ├── config.ts
│   ├── index.ts
│   └── repository.ts
├── auth.ts
├── config.ts
├── index.ts
└── n8n-client.ts

workflows/
├── bug-hunt.json
├── refactor-analysis.json
└── implementation-plan.json
```

## Design principles

- **MCP is the contract.**
- **Deterministic before probabilistic.**
- **Evidence and model interpretation stay separate.**
- **n8n orchestrates; workers compute.**
- **Analysis is read-only by default.**
- **Repository content is untrusted.**
- **Secrets stay in runtime credentials, never exported workflow JSON.**
- **Provider failure must degrade gracefully, not break the deterministic path.**

## Roadmap

- [x] MCP gateway
- [x] n8n orchestration
- [x] deterministic repository scanner
- [x] Git churn + bounded source inventory
- [x] deterministic first-pass findings
- [x] provider-neutral agent runner
- [x] deterministic fallback when agent provider is disabled/unavailable
- [ ] GitHub App installation auth
- [ ] Semgrep / CodeQL adapters
- [ ] result persistence + cache
- [ ] PR-triggered background analyses
- [ ] OpenTelemetry traces and token-cost metrics

## Security

The scanner and agent-runner are not published to the host in the starter Compose file. Both use separate authentication boundaries, run read-only, drop Linux capabilities and use `no-new-privileges`.

See [docs/SECURITY.md](docs/SECURITY.md).

## License

MIT © 2026 Nicolas Vlad.
