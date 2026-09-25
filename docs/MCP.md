# MCP integration

Mimir exposes one MCP endpoint:

```text
POST /mcp
```

The default local URL is:

```text
http://localhost:8787/mcp
```

A remote deployment should use HTTPS.

## Authentication

Every MCP request must include:

```http
Authorization: Bearer <MCP_AUTH_TOKEN>
```

The token is independent from n8n, scanner and agent-runner credentials.

## Transport

Mimir uses MCP over Streamable HTTP.

Clients should perform the normal MCP initialization handshake and tool discovery. Avoid hand-coding raw JSON-RPC unless you are debugging the protocol itself.

## Available tools

### bug_hunt

Input:

```json
{
  "repository": "owner/repository",
  "ref": "main",
  "scope": "full",
  "minimum_severity": "medium",
  "focus": []
}
```

Important result fields:

```text
summary
deterministic_findings
agent_analysis
hotspots
largest_files
languages
```

### refactor_analysis

Input:

```json
{
  "repository": "owner/repository",
  "ref": "main",
  "target": "repository",
  "objective": "maintainability",
  "constraints": []
}
```

Important result fields:

```text
summary
deterministic_candidates
agent_analysis
hotspots
largest_files
```

### implementation_plan

Input:

```json
{
  "repository": "owner/repository",
  "ref": "main",
  "request": "Describe the change",
  "depth": "standard",
  "constraints": []
}
```

Important result fields:

```text
affected_candidates
plan
deterministic_baseline_plan
agent_analysis
repository_context
```

## Repository identifiers

The scanner accepts:

```text
owner/repository
https://github.com/owner/repository
https://github.com/owner/repository.git
git@github.com:owner/repository.git
```

Non-GitHub repository hosts are rejected intentionally.

## Private repositories

Set `GITHUB_TOKEN` in the scanner runtime.

Prefer a fine-grained read-only credential scoped only to repositories Mimir should inspect.

## Connecting a remote client

At a high level, a client needs:

```text
URL: https://mimir.example.com/mcp
Header: Authorization: Bearer <MCP_AUTH_TOKEN>
Transport: Streamable HTTP
```

Exact UI steps vary by MCP client. Keep the public endpoint behind HTTPS and preferably an additional network or identity layer.
