/**
 * Docker API limits and extra createContainer parameters.
 * dockerParams: { key, value } — scope inferred from key name
 * or host.Key / config.Key prefix (legacy: scope field in JSON).
 */

/** ContainerConfig parameters (process/image inside container). */
const CONFIG_KEYS = new Set([
  'Healthcheck', 'WorkingDir', 'Hostname', 'Domainname', 'MacAddress',
  'StopSignal', 'StopTimeout', 'Shell', 'Platform',
  'OpenStdin', 'Tty', 'AttachStdin', 'AttachStdout', 'AttachStderr',
]);

const CONFIG_BOOL_KEYS = new Set(['OpenStdin', 'Tty', 'AttachStdin', 'AttachStdout', 'AttachStderr']);

const HOST_ARRAY_KEYS = new Set([
  'SecurityOpt', 'CapDrop', 'Dns', 'DnsSearch', 'DnsOptions',
  'ExtraHosts', 'Tmpfs', 'GroupAdd', 'DeviceRequests',
]);

const HOST_BOOL_KEYS = new Set(['Init', 'ReadonlyRootfs', 'AutoRemove', 'PublishAllPorts']);

const BOOL_KEYS = new Set([...HOST_BOOL_KEYS, ...CONFIG_BOOL_KEYS]);

const BLOCKED_HOST_KEYS = new Set([
  'Binds', 'Mounts', 'NetworkMode', 'PortBindings', 'RestartPolicy',
  'NanoCpus', 'Memory', 'PidsLimit', 'Links',
  // Full host access bypasses volume jail (DEPLOY_BASE_PATH) — blocked.
  'Privileged', 'CapAdd', 'Devices', 'DeviceCgroupRules',
]);

/** SecurityOpt: hardening only (e.g. no-new-privileges); isolation stripping disallowed. */
const UNSAFE_SECURITY_OPT_RE = /unconfined|^label[=:]disable$|^no-new-privileges[=:]false$/i;

/** For these keys, value `host` (shared host namespace) is dropped. */
const HOST_NAMESPACE_KEYS = new Set(['IpcMode', 'PidMode', 'UsernsMode', 'UTSMode', 'CgroupnsMode']);

function safeSecurityOptValues(parsed) {
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.filter((v) => typeof v === 'string' && v.trim() && !UNSAFE_SECURITY_OPT_RE.test(v.trim()));
}

const BLOCKED_CONFIG_KEYS = new Set([
  'Image', 'Env', 'Labels', 'ExposedPorts', 'NetworkingConfig', 'HostConfig', 'name',
  'Entrypoint', 'Cmd', 'User', 'Volumes',
]);

function parseMemoryBytes(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(b|k|m|g|kb|mb|gb)?$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num) || num < 0) return null;
  const unit = m[2] || 'b';
  const mult = { b: 1, k: 1024, kb: 1024, m: 1024 ** 2, mb: 1024 ** 2, g: 1024 ** 3, gb: 1024 ** 3 };
  return Math.round(num * (mult[unit] || 1));
}

function parseCpusNano(raw) {
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1e9);
}

function parsePidsLimit(raw) {
  if (raw == null || raw === '') return null;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDockerParamValue(key, raw) {
  const v = String(raw ?? '').trim();
  if (!v) return null;
  if (v.startsWith('{') || v.startsWith('[')) {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  if (BOOL_KEYS.has(key)) {
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  return v;
}

function normalizeScope(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return s === 'host' ? 'host' : s === 'config' ? 'config' : '';
}

/**
 * Target scope in Docker API.
 * @returns {{ scope: 'config'|'host', key: string }}
 */
function resolveParamPlacement(rawKey, explicitScope) {
  const trimmed = String(rawKey || '').trim();
  if (!trimmed) return { scope: 'host', key: '' };

  const prefixMatch = trimmed.match(/^(host|config)\.(.+)$/i);
  if (prefixMatch) {
    return { scope: prefixMatch[1].toLowerCase(), key: prefixMatch[2].trim() };
  }

  const scoped = normalizeScope(explicitScope);
  if (scoped) {
    return { scope: scoped, key: trimmed };
  }

  if (CONFIG_KEYS.has(trimmed)) {
    return { scope: 'config', key: trimmed };
  }

  return { scope: 'host', key: trimmed };
}

/** Editor display key (without prefix / legacy scope). */
function dockerParamKeyForEditor(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const raw = String(entry.key || '').trim();
  if (/^(host|config)\./i.test(raw)) return raw;
  return raw;
}

function normalizeDockerParam(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const value = entry.value != null ? String(entry.value) : '';
  if (!value.trim()) return null;
  const { scope, key } = resolveParamPlacement(entry.key, entry.scope);
  if (!key) return null;
  return { scope, key, value: value.trim() };
}

function applyDockerParam(hostConfig, createOpts, param) {
  const normalized = normalizeDockerParam(param);
  if (!normalized) return;
  const { scope, key, value } = normalized;
  if (scope === 'host' && BLOCKED_HOST_KEYS.has(key)) return;
  if (scope === 'config' && BLOCKED_CONFIG_KEYS.has(key)) return;

  const target = scope === 'host' ? hostConfig : createOpts;
  let parsed = parseDockerParamValue(key, value);
  if (parsed == null) return;
  if (scope === 'host' && key === 'SecurityOpt') {
    parsed = safeSecurityOptValues(parsed);
    if (!parsed.length) return;
  }
  if (scope === 'host' && HOST_NAMESPACE_KEYS.has(key) && String(parsed).trim().toLowerCase() === 'host') {
    return;
  }

  if (HOST_ARRAY_KEYS.has(key)) {
    if (!Array.isArray(target[key])) target[key] = [];
    if (Array.isArray(parsed)) target[key].push(...parsed);
    else target[key].push(parsed);
    return;
  }
  target[key] = parsed;
}

function applyLimits(hostConfig, limits) {
  if (!limits || typeof limits !== 'object') return;
  const memory = parseMemoryBytes(limits.memory);
  if (memory != null) hostConfig.Memory = memory;
  const nano = parseCpusNano(limits.cpus);
  if (nano != null) hostConfig.NanoCpus = nano;
  const pids = parsePidsLimit(limits.pidsLimit);
  if (pids != null) hostConfig.PidsLimit = pids;
  const memorySwap = parseMemoryBytes(limits.memorySwap);
  if (memorySwap != null) hostConfig.MemorySwap = memorySwap;
}

function applyContainerRuntimeSpec(createOpts, hostConfig, spec) {
  if (spec.user) createOpts.User = spec.user;
  if (Array.isArray(spec.entrypoint) && spec.entrypoint.length > 0) {
    createOpts.Entrypoint = spec.entrypoint;
  }
  if (Array.isArray(spec.command) && spec.command.length > 0) {
    createOpts.Cmd = spec.command;
  }
  applyLimits(hostConfig, spec.limits);
  for (const param of spec.dockerParams || []) {
    applyDockerParam(hostConfig, createOpts, param);
  }
}

module.exports = {
  parseMemoryBytes,
  parseCpusNano,
  parsePidsLimit,
  resolveParamPlacement,
  dockerParamKeyForEditor,
  normalizeDockerParam,
  applyContainerRuntimeSpec,
  CONFIG_KEYS,
  BLOCKED_HOST_KEYS,
  BLOCKED_CONFIG_KEYS,
};
