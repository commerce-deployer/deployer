/**
 * Volumes: bind mounts (under DEPLOY_BASE_PATH) and named Docker volumes.
 */
const path = require('path');

const NAMED_VOLUME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

function normalizeVolumeEntry(raw) {
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    const idx = s.indexOf(':');
    if (idx <= 0) return null;
    const hostPart = s.slice(0, idx);
    const rest = s.slice(idx + 1);
    const restIdx = rest.indexOf(':');
    if (restIdx > 0) {
      return {
        type: 'bind',
        source: hostPart.trim(),
        container: rest.slice(0, restIdx).trim(),
        mode: rest.slice(restIdx + 1).trim().toLowerCase() === 'ro' ? 'ro' : 'rw',
      };
    }
    return { type: 'bind', source: hostPart.trim(), container: rest.trim(), mode: 'rw' };
  }
  if (!raw || typeof raw !== 'object') return null;
  const type = String(raw.type || 'bind').trim().toLowerCase() === 'volume' ? 'volume' : 'bind';
  const source = String(raw.source ?? raw.host ?? '').trim();
  const container = String(raw.container ?? raw.target ?? '').trim();
  const mode = String(raw.mode || 'rw').trim().toLowerCase() === 'ro' ? 'ro' : 'rw';
  if (!source || !container) return null;
  return { type, source, container, mode };
}

function validateVolumePaths(volumes, deployBasePathResolved) {
  if (!Array.isArray(volumes)) return;
  const base = deployBasePathResolved;
  for (const raw of volumes) {
    const vol = normalizeVolumeEntry(raw);
    if (!vol) continue;
    if (vol.type === 'volume') {
      if (!NAMED_VOLUME_RE.test(vol.source)) {
        throw new Error(`Invalid named volume: ${vol.source}`);
      }
      continue;
    }
    const hostPath = path.resolve(vol.source);
    const underBase = hostPath === base || hostPath.startsWith(base + path.sep);
    if (!underBase) {
      throw new Error(`Volume host path is outside DEPLOY_BASE_PATH: ${vol.source}`);
    }
  }
}

function applyVolumesToHostConfig(hostConfig, volumes) {
  const binds = [];
  const mounts = [];
  for (const raw of volumes || []) {
    const vol = normalizeVolumeEntry(raw);
    if (!vol) continue;
    if (vol.type === 'volume') {
      mounts.push({
        Type: 'volume',
        Source: vol.source,
        Target: vol.container,
        ReadOnly: vol.mode === 'ro',
      });
    } else {
      const bind = vol.mode === 'ro'
        ? `${vol.source}:${vol.container}:ro`
        : `${vol.source}:${vol.container}`;
      binds.push(bind);
    }
  }
  if (binds.length) hostConfig.Binds = binds;
  if (mounts.length) hostConfig.Mounts = mounts;
}

function bindHostPaths(volumes) {
  const out = [];
  for (const raw of volumes || []) {
    const vol = normalizeVolumeEntry(raw);
    if (vol?.type === 'bind') out.push(vol.source);
  }
  return out;
}

module.exports = {
  normalizeVolumeEntry,
  validateVolumePaths,
  applyVolumesToHostConfig,
  bindHostPaths,
};
