'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  normalizeNetworkEntry,
  toEndpointConfig,
  applyNetworksToCreateOpts,
} = require('../server/networks');

describe('networks', () => {
  it('normalizes string and object entries', () => {
    assert.deepStrictEqual(normalizeNetworkEntry('proxynet'), {
      name: 'proxynet', aliases: [], ipv4Address: '',
    });
    assert.deepStrictEqual(normalizeNetworkEntry({
      name: 'backend',
      aliases: ['db', 'cache'],
      ipv4Address: '172.18.0.5',
    }), {
      name: 'backend', aliases: ['db', 'cache'], ipv4Address: '172.18.0.5',
    });
  });

  it('builds endpoint config with aliases and ip', () => {
    const cfg = toEndpointConfig({ name: 'n', aliases: ['a'], ipv4Address: '10.0.0.2' });
    assert.deepStrictEqual(cfg.Aliases, ['a']);
    assert.deepStrictEqual(cfg.IPAMConfig, { IPv4Address: '10.0.0.2' });
  });

  it('applies networks to createOpts', () => {
    const createOpts = {};
    const hostConfig = {};
    applyNetworksToCreateOpts(createOpts, hostConfig, [{
      name: 'net1', aliases: ['svc'], ipv4Address: '',
    }]);
    assert.ok(createOpts.NetworkingConfig.EndpointsConfig.net1);
    assert.deepStrictEqual(createOpts.NetworkingConfig.EndpointsConfig.net1.Aliases, ['svc']);
  });

  it('uses legacy NetworkMode when networks list is empty', () => {
    const createOpts = {};
    const hostConfig = {};
    applyNetworksToCreateOpts(createOpts, hostConfig, [], 'host');
    assert.strictEqual(hostConfig.NetworkMode, 'host');
    assert.strictEqual(createOpts.NetworkingConfig, undefined);
  });

  it('prefers explicit networks over legacy NetworkMode', () => {
    const createOpts = {};
    const hostConfig = {};
    applyNetworksToCreateOpts(createOpts, hostConfig, ['bridge'], 'host');
    assert.ok(createOpts.NetworkingConfig.EndpointsConfig.bridge);
    assert.strictEqual(hostConfig.NetworkMode, undefined);
  });
});
