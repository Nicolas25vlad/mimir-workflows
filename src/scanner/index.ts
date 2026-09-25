import express, { type NextFunction, type Request, type Response } from 'express';
import * as z from 'zod/v4';

import { secureTokenEquals } from '../auth.js';
import { scannerConfig } from './config.js';
import { scanRepository } from './repository.js';

const requestSchema = z.object({
  repository: z.string().min(1).max(300),
  ref: z.string().min(1).max(240).default('main')
});

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

function requireScannerToken(req: Request, res: Response, next: NextFunction): void {
  if (!secureTokenEquals(scannerConfig.authToken, req.header('x-mimir-internal-token'))) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  next();
}

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mimir-repo-scanner',
    version: '0.3.0'
  });
});

app.post('/scan', requireScannerToken, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'invalid_request',
      details: z.flattenError(parsed.error)
    });
    return;
  }

  try {
    const result = await scanRepository(parsed.data.repository, parsed.data.ref, {
      timeoutMs: scannerConfig.timeoutMs,
      gitDepth: scannerConfig.gitDepth,
      maxFiles: scannerConfig.maxFiles,
      maxFileBytes: scannerConfig.maxFileBytes,
      maxTotalBytes: scannerConfig.maxTotalBytes,
      ...(scannerConfig.githubToken ? { githubToken: scannerConfig.githubToken } : {})
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('scan failed:', message);

    res.status(422).json({
      error: 'scan_failed',
      message
    });
  }
});

app.listen(scannerConfig.port, scannerConfig.host, () => {
  console.log(
    `mimir-repo-scanner listening on http://${scannerConfig.host}:${scannerConfig.port}`
  );
});
