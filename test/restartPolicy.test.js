'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { normalizeRestartPolicy, toDockerRestartPolicy } = require('../server/restartPolicy');

describe('restartPolicy', () => {
  it('normalizes docker restart names', () => {
    assert.strictEqual(normalizeRestartPolicy('unless-stopped'), 'unless-stopped');
    assert.strictEqual(normalizeRestartPolicy('unless_stopped'), 'unless-stopped');
    assert.strictEqual(normalizeRestartPolicy('on-failure'), 'on-failure');
    assert.strictEqual(normalizeRestartPolicy(''), '');
    assert.strictEqual(normalizeRestartPolicy('bogus'), '');
  });

  it('defaults to unless-stopped for docker', () => {
    assert.deepStrictEqual(toDockerRestartPolicy(''), { Name: 'unless-stopped' });
    assert.deepStrictEqual(toDockerRestartPolicy('no'), { Name: 'no' });
    assert.deepStrictEqual(toDockerRestartPolicy('always'), { Name: 'always' });
  });

  it('sets MaximumRetryCount for on-failure', () => {
    assert.deepStrictEqual(toDockerRestartPolicy('on-failure', '5'), {
      Name: 'on-failure',
      MaximumRetryCount: 5,
    });
  });
});
