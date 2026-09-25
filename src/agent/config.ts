import * as z from 'zod/v4';

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional()
);

const optionalHttpUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    }, 'AGENT_BASE_URL must use http or https')
    .optional()
);

const envSchema = z.object({
  AGENT_HOST: z.string().default('0.0.0.0'),
  AGENT_PORT: z.coerce.number().int().min(1).max(65535).default(8791),
  AGENT_AUTH_TOKEN: z.string().min(24),
  AGENT_BASE_URL: optionalHttpUrl,
  AGENT_API_KEY: optionalText,
  AGENT_MODEL: optionalText,
  AGENT_TIMEOUT_MS: z.coerce.number().int().min(5000).max(900000).default(120000),
  AGENT_MAX_INPUT_CHARS: z.coerce.number().int().min(10000).max(500000).default(120000),
  AGENT_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(16000).default(2500),
  AGENT_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid agent-runner environment configuration:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

export const agentConfig = {
  host: env.AGENT_HOST,
  port: env.AGENT_PORT,
  authToken: env.AGENT_AUTH_TOKEN,
  baseUrl: env.AGENT_BASE_URL?.replace(/\/$/, ''),
  apiKey: env.AGENT_API_KEY?.trim() || undefined,
  model: env.AGENT_MODEL?.trim() || undefined,
  timeoutMs: env.AGENT_TIMEOUT_MS,
  maxInputChars: env.AGENT_MAX_INPUT_CHARS,
  maxOutputTokens: env.AGENT_MAX_OUTPUT_TOKENS,
  temperature: env.AGENT_TEMPERATURE,
  configured: Boolean(env.AGENT_BASE_URL && env.AGENT_MODEL)
} as const;
