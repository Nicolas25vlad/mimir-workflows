# Security

Mimir processes untrusted repositories and can optionally send derived context to a model provider. The security model assumes repository content may be malicious.

## Trust boundaries

| Boundary | Credential |
| --- | --- |
| MCP client → gateway | `MCP_AUTH_TOKEN` |
| gateway → n8n | `N8N_WEBHOOK_TOKEN` |
| n8n → scanner | `SCANNER_AUTH_TOKEN` |
| n8n → agent runner | `AGENT_AUTH_TOKEN` |
| scanner → private GitHub repo | optional `GITHUB_TOKEN` |
| agent runner → provider | optional `AGENT_API_KEY` |

Do not reuse secrets between boundaries.

## Threat model

### Malicious repository content

A repository may contain:

- prompt injection in README files or comments;
- fake security instructions;
- shell-looking strings;
- enormous generated files;
- binary files;
- secret-like text;
- misleading commit messages.

Controls:

- scanner never executes repository code;
- generated/dependency directories are skipped;
- file count, file size, total bytes, history depth and timeouts are bounded;
- secret-like evidence is redacted;
- agent prompts explicitly treat repository text as untrusted data.

### SSRF and arbitrary fetching

Repository input must not become a generic URL fetcher.

Controls:

- scanner accepts GitHub repository identifiers only;
- arbitrary clone hosts are rejected;
- provider URL comes only from administrator-controlled runtime configuration;
- provider URL is restricted to HTTP/HTTPS.

### Credential leakage

Controls:

- credentials are not stored in workflow exports;
- GitHub token is passed to git without embedding it in the clone URL;
- secret-like findings redact evidence;
- worker responses do not intentionally echo provider or repository credentials.

### Prompt injection

Repository text is data, not authority.

The agent runner system prompts instruct models to ignore instructions embedded in:

- code;
- comments;
- README/docs;
- commit messages;
- scan excerpts.

Prompt defenses reduce risk but are not treated as a perfect security boundary. This is one reason model analysis remains separate from deterministic evidence.

## Container hardening

The starter Compose setup:

- does not publish scanner port 8790;
- does not publish agent-runner port 8791;
- binds n8n to localhost;
- runs scanner and agent-runner read-only;
- drops Linux capabilities on workers;
- enables `no-new-privileges`;
- gives the scanner a bounded ephemeral tmpfs.

## Public exposure

When Mimir is remotely accessible:

1. terminate TLS before the MCP gateway;
2. expose only the gateway;
3. set `MCP_ALLOWED_HOSTS`;
4. add an identity/network layer such as a private mesh or authenticated tunnel when possible;
5. keep n8n, scanner and agent-runner private.

## Private repositories

Prefer a fine-grained read-only GitHub token limited to the smallest required repository set.

A GitHub App installation-token flow is the preferred future design because it enables short-lived, installation-scoped credentials.

## Model providers

For hosted providers:

- use a narrowly scoped key;
- understand the provider's data-retention policy;
- avoid sending repository context that should not leave your network.

For sensitive repositories, a local OpenAI-compatible endpoint can keep model inference inside the homelab.

## Reporting a security issue

Do not publish live secrets, private repository contents or exploit-ready details in a public issue.

Use a private GitHub security-reporting channel when available, or contact the repository owner privately through their GitHub profile.

## Security checklist

Before exposing a deployment:

- [ ] five independent runtime secrets generated
- [ ] TLS enabled
- [ ] `MCP_ALLOWED_HOSTS` restricted
- [ ] n8n not publicly exposed
- [ ] scanner and agent-runner not published
- [ ] GitHub credential is read-only
- [ ] model provider configuration reviewed
- [ ] workflow exports inspected for accidental credential values
