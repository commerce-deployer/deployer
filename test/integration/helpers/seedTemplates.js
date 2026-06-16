'use strict';

const path = require('path');

const DEFAULT_SEED_DIR = path.join(__dirname, '../../../templates-default');

function seedTemplatesDir(targetDir, sourceDir = DEFAULT_SEED_DIR) {
  const { syncTemplatesFromDefault } = require('../../../server/templates');
  return syncTemplatesFromDefault(targetDir, sourceDir);
}

module.exports = {
  DEFAULT_SEED_DIR,
  seedTemplatesDir,
};
