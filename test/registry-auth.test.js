'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  registryFromImageRef,
  registryConfiguredMatchesImage,
  parseRegistryCredentialsJson,
  resolveRegistryCredentials,
  authconfigForRegistryPull,
  DOCKER_HUB,
} = require('../server/registry-auth');

describe('registry-auth', () => {
  describe('registryFromImageRef', () => {
    it('returns docker.io for library-style names', () => {
      assert.strictEqual(registryFromImageRef('nginx:latest'), DOCKER_HUB);
      assert.strictEqual(registryFromImageRef('user/app:1'), DOCKER_HUB);
    });
    it('returns host for private registry', () => {
      assert.strictEqual(
        registryFromImageRef('registry.example.com/org/app:latest'),
        'registry.example.com'
      );
      assert.strictEqual(
        registryFromImageRef('registry.example.com:5000/foo:tag'),
        'registry.example.com:5000'
      );
    });
  });

  describe('registryConfiguredMatchesImage', () => {
    it('matches exact host', () => {
      assert.ok(registryConfiguredMatchesImage('registry.io', 'registry.io'));
    });
    it('matches host with optional port on image side', () => {
      assert.ok(registryConfiguredMatchesImage('registry.io', 'registry.io:443'));
    });
  });

  describe('authconfigForRegistryPull', () => {
    it('returns null when env incomplete', () => {
      assert.strictEqual(
        authconfigForRegistryPull('registry.io/a:b', { REGISTRY_HOST: 'registry.io' }),
        null
      );
    });
    it('returns null when image is from Docker Hub', () => {
      const env = {
        REGISTRY_HOST: 'registry.io',
        REGISTRY_USER: 'u',
        REGISTRY_PASSWORD: 'p',
      };
      assert.strictEqual(authconfigForRegistryPull('nginx:latest', env), null);
    });
    it('returns authconfig when registry matches', () => {
      const env = {
        REGISTRY_HOST: 'registry.io',
        REGISTRY_USER: 'user1',
        REGISTRY_PASSWORD: 'secret',
      };
      const a = authconfigForRegistryPull('registry.io/app:latest', env);
      assert.ok(a);
      assert.strictEqual(a.username, 'user1');
      assert.strictEqual(a.password, 'secret');
      assert.ok(a.serveraddress.startsWith('https://registry.io'));
    });
    it('prefers REGISTRY_CREDENTIALS_JSON when provided', () => {
      const env = {
        REGISTRY_CREDENTIALS_JSON: JSON.stringify([
          { host: 'registry.remote.tld', user: 'remote-user', password: 'remote-pass' },
          { host: 'registry.other.tld', user: 'other-user', password: 'other-pass' },
        ]),
      };
      const a = authconfigForRegistryPull('registry.remote.tld/org/app:1', env);
      assert.ok(a);
      assert.strictEqual(a.username, 'remote-user');
      assert.strictEqual(a.password, 'remote-pass');
      assert.ok(a.serveraddress.startsWith('https://registry.remote.tld'));
    });
    it('falls back to REGISTRY_HOST/USER/PASSWORD if JSON missing', () => {
      const env = {
        REGISTRY_HOST: 'registry.io',
        REGISTRY_USER: 'single-user',
        REGISTRY_PASSWORD: 'single-pass',
      };
      const a = authconfigForRegistryPull('registry.io/app:latest', env);
      assert.ok(a);
      assert.strictEqual(a.username, 'single-user');
    });
  });

  describe('parseRegistryCredentialsJson', () => {
    it('returns empty for invalid json', () => {
      assert.deepStrictEqual(parseRegistryCredentialsJson('{oops'), []);
    });
    it('returns normalized valid entries', () => {
      const out = parseRegistryCredentialsJson(JSON.stringify([
        { host: 'https://registry.remote.tld/', user: 'u1', password: 'p1' },
        { host: '', user: 'u2', password: 'p2' },
      ]));
      assert.strictEqual(out.length, 1);
      assert.strictEqual(out[0].host, 'registry.remote.tld');
    });
  });

  describe('resolveRegistryCredentials', () => {
    it('uses JSON entries over single env values', () => {
      const env = {
        REGISTRY_CREDENTIALS_JSON: JSON.stringify([{ host: 'registry.remote.tld', user: 'u1', password: 'p1' }]),
        REGISTRY_HOST: 'registry.io',
        REGISTRY_USER: 'u2',
        REGISTRY_PASSWORD: 'p2',
      };
      const out = resolveRegistryCredentials(env);
      assert.strictEqual(out.length, 1);
      assert.strictEqual(out[0].host, 'registry.remote.tld');
    });
  });
});
