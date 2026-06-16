'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function dockerRemoveContainer(containerIdOrName) {
  const id = String(containerIdOrName || '').trim();
  if (!id) return false;
  try {
    await execFileAsync('docker', ['rm', '-f', id], { timeout: 60000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function dockerRemoveByNamePrefix(prefix) {
  const p = String(prefix || '').trim();
  if (!p) return [];
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['ps', '-a', '--format', '{{.Names}}'],
      { timeout: 30000, windowsHide: true },
    );
    const removed = [];
    for (const name of stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
      if (name.startsWith(p)) {
        if (await dockerRemoveContainer(name)) removed.push(name);
      }
    }
    return removed;
  } catch {
    return [];
  }
}

async function restoreIntegrationZeroState(options = {}) {
  const containerIds = options.containerIds || [];
  const namePrefixes = options.namePrefixes || ['inst-int-smoke-', 'inst-commerce-int-'];
  const removedIds = [];

  for (const id of containerIds) {
    if (await dockerRemoveContainer(id)) removedIds.push(id);
  }

  const removedByPrefix = [];
  for (const prefix of namePrefixes) {
    removedByPrefix.push(...(await dockerRemoveByNamePrefix(prefix)));
  }

  let templates = null;
  if (options.restoreTemplates) {
    const { restoreDeployerTemplatesZeroState } = require('../../../server/templates');
    templates = restoreDeployerTemplatesZeroState();
  }

  return { removedIds, removedByPrefix, templates };
}

module.exports = {
  dockerRemoveContainer,
  dockerRemoveByNamePrefix,
  restoreIntegrationZeroState,
};
