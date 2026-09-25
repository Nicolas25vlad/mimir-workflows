import assert from 'node:assert/strict';
import test from 'node:test';

import { secureTokenEquals } from './auth.js';

test('secureTokenEquals accepts the same token', () => {
  assert.equal(secureTokenEquals('a'.repeat(32), 'a'.repeat(32)), true);
});

test('secureTokenEquals rejects missing, different, and differently sized tokens', () => {
  assert.equal(secureTokenEquals('a'.repeat(32), undefined), false);
  assert.equal(secureTokenEquals('a'.repeat(32), 'b'.repeat(32)), false);
  assert.equal(secureTokenEquals('a'.repeat(32), 'a'.repeat(31)), false);
});
