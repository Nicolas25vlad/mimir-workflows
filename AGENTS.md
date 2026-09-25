# AGENTS.md

## Project intent

Mimir Workflows exposes recurring engineering automation to MCP clients while using n8n as the orchestration layer.

## Non-negotiable architecture

- MCP tool names are public contracts. Do not rename them casually.
- Never expose a generic arbitrary-workflow execution tool.
- Keep analysis tools read-only by default.
- Keep secrets out of Git and exported n8n JSON.
- Prefer deterministic scanners before LLM analysis when possible.
- Return compact structured JSON with evidence, not unbounded prose.
- n8n orchestrates; specialized workers perform heavy compute.

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Before opening a PR:

```bash
npm run check
docker build -t mimir-workflows:local .
```

Validate every JSON file under `workflows/` parses and imports cleanly into the supported n8n version.

## Adding a workflow

1. Define the MCP tool contract first.
2. Add the n8n webhook path under `mimir/<workflow-name>`.
3. Require the `Mimir Webhook Auth` Header Auth credential.
4. Validate inputs before expensive work.
5. Add deterministic analysis stages.
6. Add LLM/agent stages only where they improve signal.
7. Deduplicate and normalize results.
8. Return a bounded structured response.
9. Update README and architecture docs.
