'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function isSkipRequested() {
  return process.env.DEPLOYER_TEST_SKIP_DOCKER === '1';
}

async function isDockerAvailable() {
  if (isSkipRequested()) return false;
  try {
    await execFileAsync('docker', ['info'], { timeout: 15000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  isDockerAvailable,
  isSkipRequested,
};
