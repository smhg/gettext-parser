import { describe, it } from 'node:test';
import assert from 'node:assert';
import { po, mo } from '../index.js';

describe('esm module', () => {
  it('should allow named imports', () => {
    assert.strictEqual(typeof po.parse, 'function');
    assert.strictEqual(typeof po.compile, 'function');
    assert.strictEqual(typeof mo.parse, 'function');
    assert.strictEqual(typeof mo.compile, 'function');
  });
});
