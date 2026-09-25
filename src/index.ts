import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { NextFunction, Request, Response } from 'express';
import * as z from 'zod/v4';

import { secureTokenEquals } from './auth.js';
import { config } from './config.js';
import { N8nClient, type WorkflowName } from './n8n-client.js';

const n8n = new N8nClient();

function resultText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function callWorkflow(
  workflow: WorkflowName,
  payload: Record<string, unknown>
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  try {
    const result = await n8n.run(workflow, payload);

    return {
      content: [{ type: 'text', text: resultText(result) }],
      structuredContent: result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      content: [{ type: 'text', text: message }],
      isError: true
    };
  }
}

function createServer(): McpServer {
  const server = new McpServer({
    name: 'mimir-workflows',
    version: '0.2.0'
  });

  server.registerTool(
    'bug_hunt',
    {
      title: 'Bug Hunt',
      description:
        'Run a read-only bug hunt workflow against a Git repository and return structured findings.',
      inputSchema: z.object({
        repository: z.string().min(1).describe('GitHub repository in owner/name form or a GitHub URL'),
        ref: z.string().min(1).default('main'),
        scope: z.string().min(1).default('full'),
        minimum_severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        focus: z.array(z.string().min(1)).max(12).default([])
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (input) => callWorkflow('bug-hunt', input)
  );

  server.registerTool(
    'refactor_analysis',
    {
      title: 'Refactor Analysis',
      description:
        'Analyze maintainability hotspots and return a scoped refactor proposal without modifying the repository.',
      inputSchema: z.object({
        repository: z.string().min(1),
        ref: z.string().min(1).default('main'),
        target: z.string().min(1).default('repository'),
        objective: z
          .enum(['maintainability', 'performance', 'testability', 'architecture', 'simplicity'])
          .default('maintainability'),
        constraints: z.array(z.string().min(1)).max(12).default([])
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (input) => callWorkflow('refactor-analysis', input)
  );

  server.registerTool(
    'implementation_plan',
    {
      title: 'Implementation Plan',
      description:
        'Turn a feature, issue or engineering request into an ordered implementation plan grounded in a repository.',
      inputSchema: z.object({
        repository: z.string().min(1),
        ref: z.string().min(1).default('main'),
        request: z.string().min(3),
        depth: z.enum(['compact', 'standard', 'deep']).default('standard'),
        constraints: z.array(z.string().min(1)).max(20).default([])
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (input) => callWorkflow('implementation-plan', input)
  );

  return server;
}

const handler = createMcpHandler(() => createServer());
const nodeHandler = toNodeHandler(handler);

const app = createMcpExpressApp({
  host: config.host,
  allowedHosts: config.allowedHosts
});

function requireGatewayToken(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  if (!secureTokenEquals(config.mcpAuthToken, token)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  next();
}

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mimir-workflows',
    version: '0.2.0'
  });
});

app.all('/mcp', requireGatewayToken, (req, res) => {
  void nodeHandler(req, res, req.body);
});

app.listen(config.port, config.host, () => {
  console.log(
    `mimir-workflows listening on http://${config.host}:${config.port} (MCP: /mcp)`
  );
});
