# Workflows

The JSON files in this directory are the n8n orchestration layer for Mimir.

They should stay relatively small. Heavy scanning and inference logic belongs in typed workers under `src/`.

## Pipeline

Each current workflow follows the same shape:

```text
Mimir Webhook
      |
      v
Scan Repository
      |
      v
Run Agent Analysis
      |
      v
Shape Result
      |
      v
Respond to MCP Gateway
```

The agent stage is optional at runtime.

If no model provider is configured, the agent-runner returns deterministic-only metadata and the workflow continues.

If the provider fails, deterministic evidence is still returned.

## Credentials

Create three n8n **Header Auth** credentials.

| Name | Header | Value |
| --- | --- | --- |
| `Mimir Webhook Auth` | `x-mimir-token` | `N8N_WEBHOOK_TOKEN` |
| `Mimir Scanner Auth` | `x-mimir-internal-token` | `SCANNER_AUTH_TOKEN` |
| `Mimir Agent Auth` | `x-mimir-agent-token` | `AGENT_AUTH_TOKEN` |

The exported JSON contains placeholder credential references, not secret values.

After import, select the credentials manually if n8n does not resolve the placeholder IDs.

## Current workflows

### Bug Hunt

File: `bug-hunt.json`

Combines:

- deterministic scanner findings;
- severity filtering;
- repository hotspots;
- large-file context;
- optional model analysis.

### Refactor Analysis

File: `refactor-analysis.json`

Combines:

- git churn;
- file size;
- deterministic risk signals;
- ranked refactor candidates;
- optional model recommendations.

### Implementation Plan

File: `implementation-plan.json`

Combines:

- repository structure;
- likely affected paths;
- deterministic baseline plan;
- optional model-generated plan;
- validation and risk context.

## Editing workflows

When modifying a workflow:

1. preserve the public MCP contract unless the change is deliberate;
2. keep credential values out of the export;
3. keep deterministic and probabilistic outputs distinguishable;
4. do not move heavy application logic into large Code nodes;
5. validate the JSON and import it into n8n;
6. update documentation if the pipeline changes.

CI verifies that workflow JSON has the minimum expected n8n structure, but a real n8n import test remains useful before deployment.
