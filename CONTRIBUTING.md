# Contributing

Thanks for helping improve Mimir Workflows.

The project is intentionally small at the public MCP boundary and modular behind it. Contributions should preserve that shape.

## Before changing code

Read:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [AGENTS.md](AGENTS.md)

## Local setup

```bash
git clone https://github.com/Nicolas25vlad/mimir-workflows.git
cd mimir-workflows
npm install
cp .env.example .env
```

For code-only development:

```bash
npm run dev
npm run dev:scanner
npm run dev:agent
```

For the full stack:

```bash
docker compose up -d --build
```

## Validation

Before opening a pull request:

```bash
npm run check
docker build -t mimir-workflows:local .
```

If you change an n8n workflow, verify the exported JSON still imports cleanly.

## Design rules

Please preserve these constraints:

1. MCP tools are stable public contracts.
2. Do not expose a generic arbitrary-workflow execution tool.
3. Deterministic evidence stays separate from model interpretation.
4. Repository content is untrusted data.
5. The scanner never executes repository code.
6. User-controlled repository input must not become arbitrary network access.
7. Secrets must stay out of Git and exported workflow JSON.
8. Provider failures must not erase deterministic results.
9. Expensive analysis should be bounded by file, context, token and timeout limits.
10. Prefer specialized workers over large n8n Code nodes.

## Pull requests

Keep PRs focused. Include:

- what changed;
- why it belongs in Mimir;
- security implications;
- how it was validated;
- any MCP or workflow contract changes.

A PR that changes a public MCP contract should explain the compatibility impact explicitly.
