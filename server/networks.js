/**
 * Attach container to Docker networks: name, aliases, static IPv4.
 */

function normalizeNetworkEntry(raw) {
  if (typeof raw === 'string') {
    const name = raw.trim();
    return name ? { name, aliases: [], ipv4Address: '' } : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim();
  if (!name) return null;
  let aliases = [];
  if (Array.isArray(raw.aliases)) {
    aliases = raw.aliases.map((a) => String(a).trim()).filter(Boolean);
  } else if (raw.aliases) {
    aliases = String(raw.aliases).split(',').map((a) => a.trim()).filter(Boolean);
  }
  return {
    name,
    aliases,
    ipv4Address: String(raw.ipv4Address || raw.ipv4 || '').trim(),
  };
}

function toEndpointConfig(net) {
  const cfg = {};
  if (net.aliases?.length) cfg.Aliases = net.aliases;
  if (net.ipv4Address) cfg.IPAMConfig = { IPv4Address: net.ipv4Address };
  return cfg;
}

function applyNetworksToCreateOpts(createOpts, hostConfig, networks, legacyNetwork) {
  const list = (networks || []).map(normalizeNetworkEntry).filter(Boolean);
  if (list.length > 0) {
    createOpts.NetworkingConfig = { EndpointsConfig: {} };
    for (const net of list) {
      createOpts.NetworkingConfig.EndpointsConfig[net.name] = toEndpointConfig(net);
    }
    return;
  }
  const legacy = legacyNetwork ? String(legacyNetwork).trim() : '';
  if (legacy) hostConfig.NetworkMode = legacy;
}

module.exports = {
  normalizeNetworkEntry,
  toEndpointConfig,
  applyNetworksToCreateOpts,
};
