/**
 * Offset/limit pagination (aligned with Commerce listPagination contract).
 */

const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_LIMIT_MAX = 100;

const CONTAINERS_LIST_DEFAULT_LIMIT = 20;
const CONTAINERS_LIST_MAX_LIMIT = 100;

function parseListQuery(query, { defaultLimit = DEFAULT_LIST_LIMIT, maxLimit = DEFAULT_LIST_LIMIT_MAX } = {}) {
  const limitRaw = query?.limit != null ? Number(query.limit) : defaultLimit;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(maxLimit, Math.floor(limitRaw))
      : defaultLimit;
  const offsetRaw = query?.offset != null ? Number(query.offset) : 0;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
  return { limit, offset };
}

function paginateList(items, opts = {}) {
  const list = Array.isArray(items) ? items : [];
  const { limit, offset } = parseListQuery(
    { limit: opts.limit, offset: opts.offset },
    { defaultLimit: opts.defaultLimit, maxLimit: opts.maxLimit },
  );
  const total = list.length;
  const total_pages = Math.max(1, Math.ceil(total / limit) || 1);
  const page = Math.min(total_pages, Math.floor(offset / limit) + 1);
  return {
    items: list.slice(offset, offset + limit),
    total,
    has_more: offset + limit < total,
    offset,
    limit,
    page,
    total_pages,
  };
}

module.exports = {
  DEFAULT_LIST_LIMIT,
  DEFAULT_LIST_LIMIT_MAX,
  CONTAINERS_LIST_DEFAULT_LIMIT,
  CONTAINERS_LIST_MAX_LIMIT,
  parseListQuery,
  paginateList,
};
