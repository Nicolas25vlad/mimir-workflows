# n8n workflows

Mimir workflows use three internal credential boundaries.

## Required Header Auth credentials

### Mimir Webhook Auth

- header: `x-mimir-token`
- value: `N8N_WEBHOOK_TOKEN`

### Mimir Scanner Auth

- header: `x-mimir-internal-token`
- value: `SCANNER_AUTH_TOKEN`

### Mimir Agent Auth

- header: `x-mimir-agent-token`
- value: `AGENT_AUTH_TOKEN`

If imported placeholder IDs are unresolved, select those credentials manually by name.

## Pipeline

```text
Webhook
   ↓
Scan Repository
   ↓
Run Agent Analysis
   ↓
Shape Result
   ↓
Respond to MCP Gateway
```

The agent stage is optional at runtime. If no provider is configured, the agent-runner returns deterministic-only metadata and the workflow still completes.

If the provider fails, the runner returns `agent-error` metadata instead of destroying the deterministic result.

## Output discipline

Keep deterministic evidence and model analysis separate. Do not silently promote model guesses into deterministic findings.
