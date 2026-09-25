import { config } from './config.js';

export type WorkflowName = 'bug-hunt' | 'refactor-analysis' | 'implementation-plan';

export interface WorkflowResult {
  status?: string;
  workflow?: string;
  run_id?: string;
  [key: string]: unknown;
}

export class N8nClient {
  async run(workflow: WorkflowName, payload: Record<string, unknown>): Promise<WorkflowResult> {
    const url = new URL(`/webhook/mimir/${workflow}`, config.n8nBaseUrl);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-mimir-token': config.n8nWebhookToken
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.n8nTimeoutMs)
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(
        `n8n workflow "${workflow}" failed with HTTP ${response.status}: ${body.slice(0, 500)}`
      );
    }

    if (!body) {
      return { status: 'completed', workflow };
    }

    try {
      return JSON.parse(body) as WorkflowResult;
    } catch {
      return {
        status: 'completed',
        workflow,
        raw: body
      };
    }
  }
}
