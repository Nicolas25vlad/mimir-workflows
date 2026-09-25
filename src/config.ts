import * as z from 'zod/v4';

const envSchema = z.object({
  MCP_HOST: z.string().default('0.0.0.0'),
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  MCP_ALLOWED_HOSTS: z.string().default('localhost,127.0.0.1'),
  MCP_AUTH_TOKEN: z.string().min(24),
  N8N_BASE_URL: z.string().url().default('http://n8n:5678'),
  N8N_WEBHOOK_TOKEN: z.string().min(24),
  N8N_TIMEOUT_MS: z.coerce.number().int().min(1000).max(900000).default(120000)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

export const config = {
  host: env.MCP_HOST,
  port: env.MCP_PORT,
  allowedHosts: env.MCP_ALLOWED_HOSTS.split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  mcpAuthToken: env.MCP_AUTH_TOKEN,
  n8nBaseUrl: env.N8N_BASE_URL.replace(/\/$/, ''),
  n8nWebhookToken: env.N8N_WEBHOOK_TOKEN,
  n8nTimeoutMs: env.N8N_TIMEOUT_MS
} as const;
