'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  enqueueOperation,
  getOperation,
  publicOperation,
  isActive,
  resetForTests,
  MAX_CONCURRENT,
  MAX_QUEUED,
} = require('../server/operations');

describe('operations', () => {
  beforeEach(() => {
    resetForTests();
  });

  it('returns 409 for duplicate active slotKey', () => {
    enqueueOperation({
      kind: 'deploy',
      slotKey: 'inst-1',
      execute: () => new Promise(() => {}),
    });
    assert.throws(
      () =>
        enqueueOperation({
          kind: 'deploy',
          slotKey: 'inst-1',
          execute: () => Promise.resolve({}),
        }),
      (err) => err.statusCode === 409 && err.message === 'operation_in_progress',
    );
  });

  it('runs at most MAX_CONCURRENT operations in parallel', async () => {
    let peak = 0;
    let running = 0;
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    for (let i = 0; i < MAX_CONCURRENT + 3; i += 1) {
      enqueueOperation({
        kind: 'deploy',
        slotKey: `ref-${i}`,
        execute: async () => {
          running += 1;
          peak = Math.max(peak, running);
          await delay(30);
          running -= 1;
          return { ok: true };
        },
      });
    }

    await delay(500);
    assert.ok(peak <= MAX_CONCURRENT, `peak ${peak} > cap ${MAX_CONCURRENT}`);
  });

  it('503 when queued operations exceed MAX_QUEUED', () => {
    for (let i = 0; i < MAX_CONCURRENT + MAX_QUEUED; i += 1) {
      enqueueOperation({
        kind: 'deploy',
        slotKey: `q-${i}`,
        execute: () => new Promise(() => {}),
      });
    }
    assert.throws(
      () =>
        enqueueOperation({
          kind: 'deploy',
          slotKey: 'overflow',
          execute: () => Promise.resolve({}),
        }),
      (err) => err.statusCode === 503 && err.message === 'deployer_busy',
    );
  });

  it('marks operation succeeded with result', async () => {
    const op = enqueueOperation({
      kind: 'deploy',
      slotKey: 'done-1',
      execute: async ({ onPhase }) => {
        onPhase('pulling_image', 'pull');
        return { container: { id: 'abc' } };
      },
    });
    await new Promise((r) => setTimeout(r, 50));
    const stored = getOperation(op.id);
    assert.equal(stored.status, 'succeeded');
    assert.equal(stored.result.container.id, 'abc');
    assert.equal(isActive(stored), false);
    assert.ok(publicOperation(stored).operationId);
  });
});
