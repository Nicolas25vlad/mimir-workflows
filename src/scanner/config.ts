import * as z from 'zod/v4';

const envSchema = z.object({
  SCANNER_HOST: z.string().default('0.0.0.0'),
  SCANNER_PORT: z.coerce.number().int().min(1).max(65535).default(8790),
  SCANNER_AUTH_TOKEN: z.string().min(24),
  SCANNER_TIMEOUT_MS: z.coerce.number().int().min(5000).max(900000).default(120000),
  SCANNER_GIT_DEPTH: z.coerce.number().int().min(1).max(500).default(80),
  SCANNER_MAX_FILES: z.coerce.number().int().min(10).max(1000).default(180),
  SCANNER_MAX_FILE_BYTES: z.coerce.number().int().min(1024).max(1048576).default(262144),
  SCANNER_MAX_TOTAL_BYTES: z.coerce.number().int().min(65536).max(33554432).default(4194304),
  GITHUB_TOKEN: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid scanner environment configuration:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

export const scannerConfig = {
  host: env.SCANNER_HOST,
  port: env.SCANNER_PORT,
  authToken: env.SCANNER_AUTH_TOKEN,
  timeoutMs: env.SCANNER_TIMEOUT_MS,
  gitDepth: env.SCANNER_GIT_DEPTH,
  maxFiles: env.SCANNER_MAX_FILES,
  maxFileBytes: env.SCANNER_MAX_FILE_BYTES,
  maxTotalBytes: env.SCANNER_MAX_TOTAL_BYTES,
  githubToken: env.GITHUB_TOKEN?.trim() || undefined
} as const;
