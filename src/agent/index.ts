import express, { type NextFunction, type Request, type Response } from 'express';
import * as z from 'zod/v4';

import { secureTokenEquals } from '../auth.js';
import { runAgent, type AgentKind } from './client.js';
import { agentConfig } from './config.js';

const requestSchema = z.object({
  kind: z.enum(['bug-hunt', 'refactor-analysis', 'implementation-plan']),
  input: z.record(z.string(), z.unknown()).default({}),
  scan: z.record(z.string(), z.unknown())
});

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

function requireAgentToken(req: Request, res: Response, next: NextFunction): void {
  if (!secureTokenEquals(agentConfig.authToken, req.header('x-mimir-agent-token'))) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  next();
}

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mimir-agent-runner',
    version: '0.3.0',
    configured: agentConfig.configured,
    model: agentConfig.configured ? agentConfig.model : undefined
  });
});

app.post('/analyze', requireAgentToken, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'invalid_request',
      details: z.flattenError(parsed.error)
    });
    return;
  }

  if (!agentConfig.configured || !agentConfig.baseUrl || !agentConfig.model) {
    res.json({
      configured: false,
      mode: 'deterministic-only',
      reason: 'AGENT_BASE_URL and AGENT_MODEL are not configured'
    });
    return;
  }

  const started = Date.now();

  try {
    const result = await runAgent(
      parsed.data.kind as AgentKind,
      parsed.data.input,
      parsed.data.scan,
      {
        baseUrl: agentConfig.baseUrl,
        model: agentConfig.model,
        ...(agentConfig.apiKey ? { apiKey: agentConfig.apiKey } : {}),
        timeoutMs: agentConfig.timeoutMs,
        maxInputChars: agentConfig.maxInputChars,
        maxOutputTokens: agentConfig.maxOutputTokens,
        temperature: agentConfig.temperature
      }
    );

    res.json({
      configured: true,
      mode: 'agent-assisted',
      model: agentConfig.model,
      latency_ms: Date.now() - started,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('agent analysis failed:', message);

    res.json({
      configured: true,
      mode: 'agent-error',
      model: agentConfig.model,
      latency_ms: Date.now() - started,
      error: {
        message
      }
    });
  }
});

app.listen(agentConfig.port, agentConfig.host, () => {
  console.log(
    `mimir-agent-runner listening on http://${agentConfig.host}:${agentConfig.port} (configured=${agentConfig.configured})`
  );
});
