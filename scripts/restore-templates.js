'use strict';

const { restoreDeployerTemplatesZeroState } = require('../server/templates');

const result = restoreDeployerTemplatesZeroState();
console.log(`Restored ${result.copied.length} template(s) from ${result.sourceDir}`);
console.log(`Target: ${result.targetDir}`);
if (result.removed.length) {
  console.log(`Removed test artifacts: ${result.removed.join(', ')}`);
}
