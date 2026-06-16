'use strict';

function unwrapOperation(body) {
  if (!body || typeof body !== 'object') return body;
  return body.operation && typeof body.operation === 'object' ? body.operation : body;
}

async function pollOperation(getOperation, operationId, options = {}) {
  const maxAttempts = options.maxAttempts ?? 180;
  const delayMs = options.delayMs ?? 1000;
  for (let i = 0; i < maxAttempts; i += 1) {
    const body = await getOperation(operationId);
    const op = unwrapOperation(body);
    if (!op || typeof op !== 'object') {
      throw new Error('Invalid operation response');
    }
    if (op.status === 'succeeded') return op;
    if (op.status === 'failed') {
      throw new Error(op.error || op.message || 'Operation failed');
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Timeout waiting for operation ${operationId}`);
}

function applyManifestParams(raw, ctx) {
  const out = {};
  for (const [key, val] of Object.entries(raw || {})) {
    out[key] = String(val)
      .replace(/\{\{suffix\}\}/g, ctx.suffix)
      .replace(/\{\{hostPort\}\}/g, String(ctx.hostPort));
  }
  return out;
}

function applyManifestContainerName(raw, ctx) {
  return String(raw || '')
    .replace(/\{\{suffix\}\}/g, ctx.suffix)
    .replace(/\{\{hostPort\}\}/g, String(ctx.hostPort));
}

module.exports = {
  unwrapOperation,
  pollOperation,
  applyManifestParams,
  applyManifestContainerName,
};
