'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const templates = require('../server/templates');
const { applyContainerRuntimeSpec } = require('../server/dockerSpec');
const { applyVolumesToHostConfig } = require('../server/volumes');
const { applyNetworksToCreateOpts } = require('../server/networks');
const { toDockerRestartPolicy } = require('../server/restartPolicy');

describe('template to docker createOpts integration', () => {
  it('builds a rich createOpts shape from template spec', () => {
    const template = {
      image: 'nginx:alpine',
      containerName: 'web-{{NAME}}',
      platform: 'linux/amd64',
      user: 'nginx',
      restartPolicy: 'on-failure',
      restartMaxRetries: 2,
      pullPolicy: 'ifNotPresent',
      waitHealthy: true,
      waitHealthyTimeoutSec: 60,
      ports: [{ containerPort: 80, hostPort: '{{PORT}}', protocol: 'tcp' }],
      networks: [{ name: 'proxynet', aliases: 'web' }],
      env: [{ name: 'ENV', value: '{{ENV}}' }],
      volumes: [{ type: 'bind', source: '{{DEPLOY_BASE_PATH}}/{{NAME}}/html', container: '/usr/share/nginx/html', mode: 'ro' }],
      labels: ['traefik.enable=true'],
      entrypoint: [],
      command: ['nginx', '-g', 'daemon off;'],
      limits: { memory: '256m', cpus: '0.25' },
      dockerParams: [
        { key: 'Healthcheck', value: '{"Test":["CMD-SHELL","wget -qO- localhost || exit 1"],"Interval":10000000000}' },
        { key: 'ReadonlyRootfs', value: 'true' },
      ],
      fields: [
        { key: 'NAME', default: 'site' },
        { key: 'PORT', default: '8080' },
        { key: 'ENV', default: 'prod' },
      ],
    };

    const { spec } = templates.applyParams(template, { NAME: 'demo' }, { deployBasePath: '/opt/deploy-data', containerName: 'demo-box' });
    const hostConfig = { PortBindings: {}, RestartPolicy: toDockerRestartPolicy(spec.restartPolicy, spec.restartMaxRetries) };
    applyVolumesToHostConfig(hostConfig, spec.volumes);
    const createOpts = {
      Image: spec.image,
      name: spec.name,
      Env: spec.env.map((e) => `${e.name}=${e.value}`),
      HostConfig: hostConfig,
      Labels: {},
    };
    if (spec.platform) createOpts.Platform = spec.platform;
    applyNetworksToCreateOpts(createOpts, hostConfig, spec.networks);
    for (const p of spec.ports) {
      const key = `${p.containerPort}/${p.protocol}`;
      if (p.hostPort) hostConfig.PortBindings[key] = [{ HostPort: String(p.hostPort) }];
    }
    applyContainerRuntimeSpec(createOpts, hostConfig, spec);

    assert.strictEqual(createOpts.Image, 'nginx:alpine');
    assert.strictEqual(createOpts.name, 'demo-box');
    assert.strictEqual(createOpts.Platform, 'linux/amd64');
    assert.strictEqual(createOpts.User, 'nginx');
    assert.deepStrictEqual(createOpts.Cmd, ['nginx', '-g', 'daemon off;']);
    assert.strictEqual(hostConfig.RestartPolicy.Name, 'on-failure');
    assert.strictEqual(hostConfig.RestartPolicy.MaximumRetryCount, 2);
    assert.strictEqual(hostConfig.PortBindings['80/tcp'][0].HostPort, '8080');
    assert.ok(createOpts.NetworkingConfig.EndpointsConfig.proxynet);
    assert.ok(hostConfig.Binds.some((b) => b.includes('/opt/deploy-data/demo/html')));
    assert.strictEqual(hostConfig.Memory, 256 * 1024 ** 2);
    assert.strictEqual(hostConfig.ReadonlyRootfs, true);
    assert.ok(createOpts.Healthcheck);
    assert.strictEqual(spec.waitHealthy, true);
  });
});
