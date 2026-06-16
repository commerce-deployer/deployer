/** Reserved {{GEN_*}} substitution tokens — one value per deploy per type. */

const crypto = require('crypto');

const GEN_TOKEN_RE = /^GEN_[A-Z0-9_]+$/;

/** @type {Record<string, () => string>} */
const GENERATORS = {
  GEN_UUID: () => crypto.randomUUID(),
};

const REGISTERED = Object.entries(GENERATORS).map(([id, fn]) => ({
  id,
  description: id === 'GEN_UUID'
    ? 'UUID v4 (36 chars, RFC 4122) — one value per deploy'
    : '',
}));

function isGenToken(key) {
  return GEN_TOKEN_RE.test(String(key || '').trim().toUpperCase());
}

function createGenCache() {
  return new Map();
}

function resolveGenToken(rawKey, cache) {
  const key = String(rawKey || '').trim().toUpperCase();
  if (!isGenToken(key)) return null;
  const generate = GENERATORS[key];
  if (!generate) return null;
  if (cache.has(key)) return cache.get(key);
  const value = generate();
  cache.set(key, value);
  return value;
}

module.exports = {
  GENERATORS,
  REGISTERED,
  isGenToken,
  createGenCache,
  resolveGenToken,
};
