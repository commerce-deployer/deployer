'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');
const {
  normalizeVolumeEntry,
  validateVolumePaths,
  applyVolumesToHostConfig,
} = require('../server/volumes');

const base = path.join(os.tmpdir(), 'deployer-vol-test');

describe('volumes', () => {
  it('normalizes bind and named volume entries', () => {
    assert.deepStrictEqual(
      normalizeVolumeEntry({ host: '/data', container: '/app', mode: 'ro' }),
      { type: 'bind', source: '/data', container: '/app', mode: 'ro' },
    );
    assert.deepStrictEqual(
      normalizeVolumeEntry({ type: 'volume', source: 'cache-vol', container: '/cache' }),
      { type: 'volume', source: 'cache-vol', container: '/cache', mode: 'rw' },
    );
    assert.deepStrictEqual(
      normalizeVolumeEntry('/host/path:/in/container:ro'),
      { type: 'bind', source: '/host/path', container: '/in/container', mode: 'ro' },
    );
  });

  it('validates bind under base and allows named volumes', () => {
    assert.doesNotThrow(() => validateVolumePaths(
      [{ type: 'bind', source: path.join(base, 'x'), container: '/data' }],
      base,
    ));
    assert.doesNotThrow(() => validateVolumePaths(
      [{ type: 'volume', source: 'my-vol', container: '/data' }],
      base,
    ));
    assert.throws(
      () => validateVolumePaths([{ type: 'bind', source: '/etc', container: '/x' }], base),
      /outside DEPLOY_BASE_PATH/,
    );
  });

  it('applies Binds and Mounts to hostConfig', () => {
    const hostConfig = {};
    applyVolumesToHostConfig(hostConfig, [
      { type: 'bind', source: '/a', container: '/a', mode: 'ro' },
      { type: 'volume', source: 'data', container: '/data', mode: 'rw' },
    ]);
    assert.deepStrictEqual(hostConfig.Binds, ['/a:/a:ro']);
    assert.strictEqual(hostConfig.Mounts.length, 1);
    assert.strictEqual(hostConfig.Mounts[0].Type, 'volume');
    assert.strictEqual(hostConfig.Mounts[0].ReadOnly, false);
  });
});
