'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  unwrapOperationResponse,
  waitForOperation,
  runAsyncAction,
} = require('../public/operationPoll.js');

describe('operationPoll', () => {
  describe('unwrapOperationResponse', () => {
    it('returns nested operation from API envelope', () => {
      const op = { status: 'running', operationId: 'abc' };
      assert.deepStrictEqual(unwrapOperationResponse({ ok: true, operation: op }), op);
    });

    it('returns body when already unwrapped', () => {
      const op = { status: 'succeeded', result: { ok: true } };
      assert.deepStrictEqual(unwrapOperationResponse(op), op);
    });

    it('passes through nullish values', () => {
      assert.strictEqual(unwrapOperationResponse(null), null);
      assert.strictEqual(unwrapOperationResponse(undefined), undefined);
    });
  });

  describe('waitForOperation', () => {
    it('resolves when nested operation succeeds', async () => {
      let calls = 0;
      const apiFn = async () => {
        calls += 1;
        if (calls === 1) {
          return { ok: true, operation: { status: 'running', phase: 'pulling_image' } };
        }
        return {
          ok: true,
          operation: { status: 'succeeded', result: { container: { id: 'c1', name: 'app' } } },
        };
      };
      const op = await waitForOperation('op-1', apiFn, { defaultDelayMs: 1, maxAttempts: 5 });
      assert.strictEqual(op.status, 'succeeded');
      assert.strictEqual(op.result.container.id, 'c1');
      assert.strictEqual(calls, 2);
    });

    it('throws when operation fails', async () => {
      const apiFn = async () => ({
        ok: true,
        operation: { status: 'failed', error: 'Container not found' },
      });
      await assert.rejects(
        () => waitForOperation('op-2', apiFn, { defaultDelayMs: 1, maxAttempts: 3 }),
        /Container not found/,
      );
    });

    it('throws on timeout when operation stays running', async () => {
      const apiFn = async () => ({
        ok: true,
        operation: { status: 'running' },
      });
      await assert.rejects(
        () => waitForOperation('op-3', apiFn, { defaultDelayMs: 1, maxAttempts: 3 }),
        /Timeout waiting for operation/,
      );
    });
  });

  describe('runAsyncAction', () => {
    it('polls when response includes operationId', async () => {
      let pollCount = 0;
      const apiFn = async (path, opts = {}) => {
        if (path.startsWith('/api/operations/')) {
          pollCount += 1;
          return {
            ok: true,
            operation: {
              status: pollCount >= 2 ? 'succeeded' : 'running',
              result: { removed: true },
            },
          };
        }
        assert.strictEqual(opts.method, 'DELETE');
        return { ok: true, operation: { operationId: 'del-1' } };
      };
      const op = await runAsyncAction('/api/containers/x', apiFn, { method: 'DELETE' }, { defaultDelayMs: 1 });
      assert.strictEqual(op.status, 'succeeded');
      assert.strictEqual(op.result.removed, true);
      assert.ok(pollCount >= 2);
    });

    it('returns immediate result when no operationId', async () => {
      const apiFn = async () => ({ ok: true, container: { id: 'sync' } });
      const result = await runAsyncAction('/api/deploy', apiFn, { method: 'POST' }, { defaultDelayMs: 1 });
      assert.strictEqual(result.container.id, 'sync');
    });
  });
});
