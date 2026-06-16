/** Docker HostConfig.RestartPolicy — see docker run --restart */
const RESTART_POLICIES = ['no', 'always', 'unless-stopped', 'on-failure'];

function normalizeRestartPolicy(raw) {
  const v = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
  return RESTART_POLICIES.includes(v) ? v : '';
}

function normalizeRestartMaxRetries(raw) {
  if (raw == null || raw === '') return null;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toDockerRestartPolicy(raw, maxRetriesRaw) {
  const name = normalizeRestartPolicy(raw) || 'unless-stopped';
  const policy = { Name: name };
  const maxRetries = normalizeRestartMaxRetries(maxRetriesRaw);
  if (name === 'on-failure' && maxRetries != null) {
    policy.MaximumRetryCount = maxRetries;
  }
  return policy;
}

module.exports = {
  RESTART_POLICIES,
  normalizeRestartPolicy,
  normalizeRestartMaxRetries,
  toDockerRestartPolicy,
};
