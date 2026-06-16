'use strict';

function unwrapOperationResponse(body) {
  if (!body || typeof body !== 'object') return body;
  return body.operation && typeof body.operation === 'object' ? body.operation : body;
}

function translateOpError(message) {
  if (typeof window !== 'undefined' && window.deployerTranslateApiError) {
    return window.deployerTranslateApiError(message);
  }
  return message;
}

async function waitForOperation(operationId, apiFn, options = {}) {
  const maxAttempts = options.maxAttempts ?? 120;
  const defaultDelayMs = options.defaultDelayMs ?? 1500;
  for (let i = 0; i < maxAttempts; i += 1) {
    const body = await apiFn('/api/operations/' + encodeURIComponent(operationId));
    const op = unwrapOperationResponse(body);
    if (!op || typeof op !== 'object') {
      throw new Error(translateOpError('Invalid operation response'));
    }
    if (op.status === 'succeeded') return op;
    if (op.status === 'failed') {
      throw new Error(translateOpError(op.error || op.message || 'Operation failed'));
    }
    await new Promise((r) => setTimeout(r, defaultDelayMs));
  }
  throw new Error(translateOpError('Timeout waiting for operation'));
}

async function runAsyncAction(path, apiFn, fetchOpts = {}, options = {}) {
  const result = await apiFn(path, fetchOpts);
  const opId = result?.operation?.operationId;
  if (opId) return waitForOperation(opId, apiFn, options);
  return result;
}

const operationPoll = { unwrapOperationResponse, waitForOperation, runAsyncAction };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = operationPoll;
} else {
  window.deployerOperationPoll = operationPoll;
}
