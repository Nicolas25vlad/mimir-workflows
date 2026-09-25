import assert from 'node:assert/strict';
import test from 'node:test';

import { parseModelJson, systemPrompt } from './client.js';

test('parseModelJson accepts fenced JSON', () => {
  const fenced = ['```json', '{"ok":true}', '```'].join('\n');
  assert.deepEqual(parseModelJson(fenced), { ok: true });
});

test('parseModelJson extracts an object surrounded by prose', () => {
  assert.deepEqual(parseModelJson('result follows: {"value":42} done'), { value: 42 });
});

test('system prompts explicitly treat repository content as untrusted', () => {
  for (const kind of ['bug-hunt', 'refactor-analysis', 'implementation-plan'] as const) {
    assert.match(systemPrompt(kind), /untrusted data/i);
  }
});
