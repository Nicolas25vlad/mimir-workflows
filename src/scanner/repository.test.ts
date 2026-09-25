import assert from 'node:assert/strict';
import test from 'node:test';

import { parseGitHubRepository, scanText } from './repository.js';

test('parseGitHubRepository accepts shorthand and GitHub URLs', () => {
  assert.deepEqual(parseGitHubRepository('openai/openai-node'), {
    owner: 'openai',
    name: 'openai-node'
  });
  assert.deepEqual(parseGitHubRepository('https://github.com/openai/openai-node.git'), {
    owner: 'openai',
    name: 'openai-node'
  });
  assert.deepEqual(parseGitHubRepository('git@github.com:openai/openai-node.git'), {
    owner: 'openai',
    name: 'openai-node'
  });
});

test('parseGitHubRepository rejects arbitrary clone hosts', () => {
  assert.throws(() => parseGitHubRepository('https://example.com/a/b.git'));
});

test('scanText detects risky patterns and redacts secret-like values', () => {
  const findings = scanText(
    'src/example.ts',
    [
      'const apiKey = "super-secret-value-123";',
      'eval(input);',
      'try { work(); } catch (error) {}',
      '// TODO remove fallback'
    ].join('\n')
  );

  assert.equal(findings.some((item) => item.rule === 'hardcoded-secret-like'), true);
  assert.equal(findings.some((item) => item.rule === 'dynamic-eval'), true);
  assert.equal(findings.some((item) => item.rule === 'empty-catch'), true);
  assert.equal(findings.some((item) => item.rule === 'todo-marker'), true);

  const secret = findings.find((item) => item.rule === 'hardcoded-secret-like');
  assert.equal(secret?.evidence, '[redacted]');
});
