/** Deploy slotKey and label — containerName only (Docker container name). */

const INSTANCE_LABEL = 'deployer.containerName';

function trimParam(v) {
  if (v == null) return '';
  return String(v).trim();
}

function resolveSlotKey(containerName) {
  return trimParam(containerName) || 'deploy';
}

function normalizeDockerContainerName(containerName) {
  const raw = trimParam(containerName);
  if (!raw) throw new Error('containerName required');
  const name = raw.replace(/\s+/g, '-').toLowerCase().slice(0, 64);
  if (!name) throw new Error('containerName invalid');
  return name;
}

module.exports = {
  INSTANCE_LABEL,
  resolveSlotKey,
  normalizeDockerContainerName,
};
