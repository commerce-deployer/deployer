'use strict';

const { execFileSync } = require('child_process');

function writeFileInContainer(containerRef, containerFilePath, content) {
  const b64 = Buffer.from(String(content), 'utf8').toString('base64');
  execFileSync(
    'docker',
    ['exec', containerRef, 'sh', '-c', `echo ${b64} | base64 -d > ${containerFilePath}`],
    { stdio: 'ignore', timeout: 30000, windowsHide: true },
  );
}

function readFileInContainer(containerRef, containerFilePath) {
  return execFileSync('docker', ['exec', containerRef, 'cat', containerFilePath], {
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
  });
}

module.exports = {
  writeFileInContainer,
  readFileInContainer,
};
