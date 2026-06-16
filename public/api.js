'use strict';

const API_ERROR_KEYS = {
  Unauthorized: 'err_unauthorized',
  'Not authenticated': 'err_not_authenticated',
  'Invalid credentials': 'err_invalid_credentials',
  'Username and password required': 'err_username_password_required',
  'Server configuration error': 'err_server_config',
  rate_limit_exceeded: 'err_rate_limit',
  'Too many attempts': 'err_rate_limit_login',
  'Too many requests': 'err_rate_limit',
  'Too many disk usage requests': 'err_rate_limit',
  'Too many log requests': 'err_rate_limit',
  'Template not found': 'err_template_not_found',
  'Template id required': 'err_template_id_required_api',
  'Save failed': 'err_save_failed',
  'Delete failed': 'err_delete_failed',
  'templateId required': 'err_template_id_deploy',
  'params required': 'err_params_required',
  'containerName required': 'err_container_name_required',
  'Invalid params': 'err_invalid_params',
  'Deploy failed': 'err_deploy_failed',
  operation_not_found: 'err_operation_not_found',
  operation_failed: 'err_operation_failed',
  'Operation failed': 'err_operation_failed',
  'Timeout waiting for operation': 'err_operation_timeout',
  'Invalid operation response': 'err_invalid_operation_response',
  'Failed to list containers': 'err_list_containers',
  'Failed to get container': 'err_get_container',
  'Failed to get stats': 'err_get_stats',
  'Failed to get disk usage': 'err_get_disk',
  'Failed to get logs': 'err_get_logs',
  'Failed to restart': 'err_restart_failed',
  'Failed to stop': 'err_stop_failed',
  'Failed to start': 'err_start_failed',
  'Failed to delete container': 'err_delete_container_failed',
  'Container not found': 'err_container_not_found',
  'Request failed': 'err_request_failed',
};

function translateApiError(message, retryAfterSec) {
  const raw = String(message || '').trim();
  if (!raw) {
    return localizeApi('err_request_failed', null, retryAfterSec);
  }
  if (/^err_[a-z0-9_]+$/.test(raw)) {
    return localizeApi(raw, null, retryAfterSec);
  }
  const key = API_ERROR_KEYS[raw];
  if (key) return localizeApi(key, null, retryAfterSec);
  const limitMatchEn = raw.match(/^Container limit reached:\s*(\d+)\s*\/\s*(\d+)/i);
  if (limitMatchEn) {
    return localizeApi('err_container_limit', { count: limitMatchEn[1], limit: limitMatchEn[2] }, retryAfterSec);
  }
  return raw;
}

function localizeApi(key, vars, retryAfterSec) {
  if (typeof window !== 'undefined' && window.deployerI18n) {
    if (key === 'err_rate_limit' && retryAfterSec != null) {
      return window.deployerI18n.tf(key, { sec: retryAfterSec });
    }
    if (vars) return window.deployerI18n.tf(key, vars);
    return window.deployerI18n.t(key);
  }
  return key;
}

/** fetch with cookie session; /api/* responses are always JSON. */
function deployerApi(path, opts = {}) {
  const headers = {
    Accept: 'application/json',
    ...(opts.headers || {}),
  };
  return fetch(path, { credentials: 'same-origin', ...opts, headers }).then(async (r) => {
    const text = await r.text();
    if (r.status === 401) {
      const onLoginPage = /login\.html$/i.test(window.location.pathname);
      if (!onLoginPage && !String(path).includes('/api/login')) {
        window.location.href = '/login.html';
      }
      throw new Error(translateApiError('Unauthorized'));
    }
    if (r.ok) {
      if (!text) return {};
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(translateApiError('err_not_json'));
      }
    }
    let message = r.statusText || 'Request failed';
    let retryAfterSec;
    try {
      const d = text ? JSON.parse(text) : {};
      if (d.error) message = d.error;
      if (d.retryAfterSec != null) retryAfterSec = d.retryAfterSec;
    } catch (_) {}
    throw new Error(translateApiError(message, retryAfterSec));
  });
}

const apiExports = { deployerApi, translateApiError, API_ERROR_KEYS };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiExports;
} else {
  window.deployerApi = deployerApi;
  window.deployerTranslateApiError = translateApiError;
}
