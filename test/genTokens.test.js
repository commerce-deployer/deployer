const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createGenCache, resolveGenToken, isGenToken, REGISTERED } = require('../server/genTokens');

describe('genTokens', () => {
  it('isGenToken matches GEN_* only', () => {
    assert.equal(isGenToken('GEN_UUID'), true);
    assert.equal(isGenToken('gen_uuid'), true);
    assert.equal(isGenToken('NAME'), false);
    assert.equal(isGenToken('GEN'), false);
  });

  it('resolveGenToken returns UUID v4 format', () => {
    const cache = createGenCache();
    const value = resolveGenToken('GEN_UUID', cache);
    assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('resolveGenToken reuses one value per deploy cache', () => {
    const cache = createGenCache();
    const a = resolveGenToken('GEN_UUID', cache);
    const b = resolveGenToken('GEN_UUID', cache);
    assert.equal(a, b);
  });

  it('REGISTERED lists GEN_UUID', () => {
    assert.ok(REGISTERED.some((t) => t.id === 'GEN_UUID'));
  });
});
