'use strict';

/** Images without registry prefix are Docker Hub. */
const DOCKER_HUB = 'docker.io';

function normalizeRegistryHost(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

/**
 * Extract registry host from full image name (as in docker pull).
 * @param {string} imageRef
 * @returns {string}
 */
function registryFromImageRef(imageRef) {
  if (!imageRef || typeof imageRef !== 'string') return DOCKER_HUB;
  let s = imageRef.split('@')[0].trim();
  const lastColon = s.lastIndexOf(':');
  const lastSlash = s.lastIndexOf('/');
  if (lastColon > lastSlash && lastSlash >= 0) {
    const afterColon = s.slice(lastColon + 1);
    if (/^[A-Za-z0-9._-]+$/.test(afterColon) && !afterColon.includes('/')) {
      s = s.slice(0, lastColon);
    }
  }
  const idx = s.indexOf('/');
  if (idx === -1) return DOCKER_HUB;
  const first = s.slice(0, idx);
  if (first.includes('.') || first.includes(':') || first === 'localhost') {
    return first;
  }
  return DOCKER_HUB;
}

function registryConfiguredMatchesImage(configuredHost, imageRegistry) {
  const a = normalizeRegistryHost(configuredHost).toLowerCase();
  const b = normalizeRegistryHost(imageRegistry).toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const ah = a.split(':')[0];
  const bh = b.split(':')[0];
  return ah === bh && (a === ah || b === bh);
}

function parseRegistryCredentialsJson(raw) {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        host: normalizeRegistryHost(item?.host),
        user: typeof item?.user === 'string' ? item.user.trim() : '',
        password: typeof item?.password === 'string' ? item.password : '',
      }))
      .filter((item) => item.host && item.user && item.password);
  } catch {
    return [];
  }
}

function resolveRegistryCredentials(env) {
  const fromJson = parseRegistryCredentialsJson(env.REGISTRY_CREDENTIALS_JSON || '');
  if (fromJson.length > 0) return fromJson;

  const host = normalizeRegistryHost(env.REGISTRY_HOST || '');
  const user = (env.REGISTRY_USER || '').trim();
  const pass = (env.REGISTRY_PASSWORD || '').trim();
  if (!host || !user || !pass) return [];
  return [{ host, user, password: pass }];
}

/**
 * @param {string} imageRef
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ username: string, password: string, serveraddress: string } | null}
 */
function authconfigForRegistryPull(imageRef, env) {
  const creds = resolveRegistryCredentials(env || {});
  if (creds.length === 0) return null;

  const imgReg = registryFromImageRef(imageRef);
  const match = creds.find((entry) => registryConfiguredMatchesImage(entry.host, imgReg));
  if (!match) return null;

  const h = normalizeRegistryHost(match.host);
  const isLocal =
    h === 'localhost' ||
    h.startsWith('localhost:') ||
    /^127\.\d+\.\d+\.\d+/.test(h) ||
    /^\[?::1\]?(:\d+)?$/.test(h);
  const serveraddress = isLocal ? `http://${h}/v1/` : `https://${h}/v1/`;

  return {
    username: match.user,
    password: match.password,
    serveraddress,
  };
}

module.exports = {
  DOCKER_HUB,
  normalizeRegistryHost,
  registryFromImageRef,
  registryConfiguredMatchesImage,
  parseRegistryCredentialsJson,
  resolveRegistryCredentials,
  authconfigForRegistryPull,
};
