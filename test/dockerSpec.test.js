'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  parseMemoryBytes,
  parseCpusNano,
  parsePidsLimit,
  resolveParamPlacement,
  applyContainerRuntimeSpec,
} = require('../server/dockerSpec');

describe('dockerSpec', () => {
  describe('parseMemoryBytes', () => {
    it('parses suffix units', () => {
      assert.strictEqual(parseMemoryBytes('512m'), 512 * 1024 ** 2);
      assert.strictEqual(parseMemoryBytes('1g'), 1024 ** 3);
    });
    it('returns null for invalid', () => {
      assert.strictEqual(parseMemoryBytes(''), null);
      assert.strictEqual(parseMemoryBytes('abc'), null);
    });
  });

  describe('parseCpusNano', () => {
    it('converts cpus to nanoCPUs', () => {
      assert.strictEqual(parseCpusNano('0.5'), 500000000);
      assert.strictEqual(parseCpusNano('2'), 2000000000);
    });
  });

  describe('parsePidsLimit', () => {
    it('parses positive integer', () => {
      assert.strictEqual(parsePidsLimit('100'), 100);
      assert.strictEqual(parsePidsLimit(''), null);
    });
  });

  describe('applyContainerRuntimeSpec', () => {
    it('sets user, entrypoint, command and limits', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        user: '1000:1000',
        entrypoint: ['/entry.sh'],
        command: ['--serve'],
        limits: { memory: '256m', cpus: '1', pidsLimit: '50' },
      });
      assert.strictEqual(createOpts.User, '1000:1000');
      assert.deepStrictEqual(createOpts.Entrypoint, ['/entry.sh']);
      assert.deepStrictEqual(createOpts.Cmd, ['--serve']);
      assert.strictEqual(hostConfig.Memory, 256 * 1024 ** 2);
      assert.strictEqual(hostConfig.NanoCpus, 1000000000);
      assert.strictEqual(hostConfig.PidsLimit, 50);
    });

    it('merges SecurityOpt array from dockerParams, dropping unsafe values', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [
          { key: 'SecurityOpt', value: 'no-new-privileges:true' },
          { key: 'SecurityOpt', value: 'seccomp:unconfined' },
          { key: 'SecurityOpt', value: 'apparmor=unconfined' },
          { key: 'SecurityOpt', value: 'label:disable' },
        ],
      });
      assert.deepStrictEqual(hostConfig.SecurityOpt, ['no-new-privileges:true']);
    });

    it('ignores privileged-escalation keys (Privileged, CapAdd, Devices)', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [
          { key: 'Privileged', value: 'true' },
          { key: 'CapAdd', value: 'SYS_ADMIN' },
          { key: 'Devices', value: '[{"PathOnHost":"/dev/sda","PathInContainer":"/dev/sda"}]' },
          { key: 'DeviceCgroupRules', value: 'b 8:* rmw' },
          { key: 'host.Privileged', value: 'true' },
        ],
      });
      assert.strictEqual(hostConfig.Privileged, undefined);
      assert.strictEqual(hostConfig.CapAdd, undefined);
      assert.strictEqual(hostConfig.Devices, undefined);
      assert.strictEqual(hostConfig.DeviceCgroupRules, undefined);
    });

    it('auto-detects config scope for Healthcheck', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [{
          key: 'Healthcheck',
          value: '{"Test":["CMD-SHELL","curl -f localhost"],"Interval":30000000000}',
        }],
      });
      assert.ok(createOpts.Healthcheck);
      assert.deepStrictEqual(createOpts.Healthcheck.Test, ['CMD-SHELL', 'curl -f localhost']);
    });

    it('supports host. prefix override', () => {
      assert.deepStrictEqual(resolveParamPlacement('host.IpcMode'), { scope: 'host', key: 'IpcMode' });
      assert.deepStrictEqual(resolveParamPlacement('config.WorkingDir'), { scope: 'config', key: 'WorkingDir' });
    });

    it('applies GPU DeviceRequests on host scope', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [{
          key: 'DeviceRequests',
          value: '[{"Driver":"nvidia","Count":1,"Capabilities":[["gpu"]]}]',
        }],
      });
      assert.ok(Array.isArray(hostConfig.DeviceRequests));
      assert.strictEqual(hostConfig.DeviceRequests[0].Driver, 'nvidia');
    });

    it('applies Healthcheck JSON on config scope (legacy scope field)', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [{
          scope: 'config',
          key: 'Healthcheck',
          value: '{"Test":["CMD-SHELL","curl -f localhost"],"Interval":30000000000}',
        }],
      });
      assert.ok(createOpts.Healthcheck);
      assert.deepStrictEqual(createOpts.Healthcheck.Test, ['CMD-SHELL', 'curl -f localhost']);
    });

    it('ignores blocked keys', () => {
      const createOpts = { Labels: {} };
      const hostConfig = { Binds: [] };
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [{ scope: 'host', key: 'Binds', value: '/evil:/data' }, { scope: 'config', key: 'User', value: 'root' }],
      });
      assert.deepStrictEqual(hostConfig.Binds, []);
      assert.strictEqual(createOpts.User, undefined);
    });

    it('applies LogConfig, Ulimits and non-host IpcMode on host scope', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [
          { key: 'LogConfig', value: '{"Type":"json-file","Config":{"max-size":"10m"}}' },
          { key: 'Ulimits', value: '[{"Name":"nofile","Soft":65536,"Hard":65536}]' },
          { key: 'IpcMode', value: 'private' },
        ],
      });
      assert.strictEqual(hostConfig.LogConfig.Type, 'json-file');
      assert.strictEqual(hostConfig.IpcMode, 'private');
      assert.ok(Array.isArray(hostConfig.Ulimits));
      assert.strictEqual(hostConfig.Ulimits[0].Name, 'nofile');
    });

    it('drops host value for namespace keys (IpcMode/PidMode)', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [
          { key: 'IpcMode', value: 'host' },
          { key: 'PidMode', value: 'host' },
          { key: 'UTSMode', value: 'host' },
        ],
      });
      assert.strictEqual(hostConfig.IpcMode, undefined);
      assert.strictEqual(hostConfig.PidMode, undefined);
      assert.strictEqual(hostConfig.UTSMode, undefined);
    });

    it('applies memorySwap limit and bool host flags', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        limits: { memory: '512m', memorySwap: '1g' },
        dockerParams: [
          { key: 'ReadonlyRootfs', value: 'true' },
          { key: 'ShmSize', value: '67108864' },
        ],
      });
      assert.strictEqual(hostConfig.Memory, 512 * 1024 ** 2);
      assert.strictEqual(hostConfig.MemorySwap, 1024 ** 3);
      assert.strictEqual(hostConfig.ReadonlyRootfs, true);
      assert.strictEqual(hostConfig.ShmSize, 67108864);
    });

    it('does not apply blocked NetworkMode via dockerParams', () => {
      const createOpts = {};
      const hostConfig = {};
      applyContainerRuntimeSpec(createOpts, hostConfig, {
        dockerParams: [{ key: 'NetworkMode', value: 'host' }],
      });
      assert.strictEqual(hostConfig.NetworkMode, undefined);
    });
  });
});
