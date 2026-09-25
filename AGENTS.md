# AGENTS.md

## Project intent

Mimir Workflows exposes recurring engineering automation to MCP clients while using n8n as the orchestration layer.

## Non-negotiable architecture

- MCP tool names are public contracts. Do not rename them casually.
- Never expose a generic arbitrary-workflow execution tool.
- Never turn repository input into arbitrary URL fetching.
- Keep analysis tools read-only by default.
- Keep secrets out of Git and exported n8n JSON.
- Prefer deterministic scanners before LLM analysis.
- Return compact structured JSON with evidence, not unbounded prose.
- n8n orchestrates; specialized workers perform heavy compute.
- Repository code is untrusted. Do not execute it inside the scanner.

## Development

```bash
npm install
cp .env.example .env
npm run dev
npm run dev:scanner
```

Before opening a PR:

```bash
npm run check
docker build -t mimir-workflows:local .
```

## Scanner rules

When adding deterministic rules:

1. prefer high-signal patterns over huge noisy rule sets;
2. return path + line + concise explanation;
3. redact credentials and secret-like literals;
4. cap findings;
5. add a unit test;
6. do not execute repository files to learn about them.

## Adding a workflow

1. Define or preserve the MCP tool contract.
2. Add the n8n webhook path under `mimir/<workflow-name>`.
3. Require `Mimir Webhook Auth`.
4. Use `Mimir Scanner Auth` for scanner calls.
5. Validate inputs before expensive work.
6. Add deterministic analysis stages first.
7. Add LLM/agent stages only where they improve signal.
8. Deduplicate and normalize results.
9. Return a bounded structured response.
10. Update README, architecture, security docs and tests.
