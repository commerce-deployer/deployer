/**
 * Shared offset/limit pager UI (Deployer — same contract as Commerce commerce-pager.js).
 * @global ListPager
 */
(function (global) {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeMeta(body, pageSizeFallback) {
    body = body && typeof body === 'object' ? body : {};
    var limit = Number(body.limit) > 0 ? Number(body.limit) : Number(pageSizeFallback) > 0 ? Number(pageSizeFallback) : 20;
    var offset = Number(body.offset) >= 0 ? Number(body.offset) : 0;
    var total = Number(body.total) >= 0 ? Number(body.total) : 0;
    var totalPages =
      Number(body.total_pages) > 0 ? Number(body.total_pages) : Math.max(1, Math.ceil(total / limit) || 1);
    var page =
      Number(body.page) > 0
        ? Math.min(Number(body.page), totalPages)
        : Math.min(totalPages, Math.floor(offset / limit) + 1);
    return { limit: limit, offset: offset, total: total, totalPages: totalPages, page: page };
  }

  function pagerBtn(offset, label, opts, dataAttr) {
    opts = opts || {};
    var cls = 'btn btn-outline btn-sm' + (opts.active ? ' is-active' : '');
    var attrs =
      ' type="button" class="' +
      cls +
      ' audit-pager__page" ' +
      dataAttr +
      '="' +
      String(offset) +
      '"';
    if (opts.disabled) attrs += ' disabled';
    if (opts.title) attrs += ' title="' + escHtml(opts.title) + '"';
    if (opts.active) attrs += ' aria-current="page"';
    return '<button' + attrs + '>' + escHtml(label) + '</button>';
  }

  function render(pagerEl, meta, opts) {
    opts = opts || {};
    if (!pagerEl) return;
    var tr = typeof opts.tr === 'function' ? opts.tr : function (_k, fb) {
      return fb || '';
    };
    var trf = typeof opts.trf === 'function' ? opts.trf : function (_k, fb, vars) {
      var s = fb || '';
      if (!vars) return s;
      return Object.keys(vars).reduce(function (acc, k) {
        return acc.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      }, s);
    };
    var dataAttr = opts.dataAttr || 'data-list-offset';

    if (!meta || meta.totalPages <= 1) {
      pagerEl.hidden = true;
      pagerEl.innerHTML = '';
      return;
    }

    pagerEl.hidden = false;
    var page = meta.page;
    var limit = meta.limit;
    var totalPages = meta.totalPages;
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);
    var controls = '';

    controls += pagerBtn(
      0,
      '«',
      { disabled: page <= 1, title: tr(opts.firstKey || 'containers_pager_first', 'First') },
      dataAttr,
    );
    controls += pagerBtn(
      (page - 2) * limit,
      '‹',
      { disabled: page <= 1, title: tr(opts.prevKey || 'containers_pager_prev', 'Previous') },
      dataAttr,
    );
    for (var p = start; p <= end; p++) {
      controls += pagerBtn((p - 1) * limit, String(p), { active: p === page }, dataAttr);
    }
    controls += pagerBtn(
      page * limit,
      '›',
      { disabled: page >= totalPages, title: tr(opts.nextKey || 'containers_pager_next', 'Next') },
      dataAttr,
    );
    controls += pagerBtn(
      (totalPages - 1) * limit,
      '»',
      { disabled: page >= totalPages, title: tr(opts.lastKey || 'containers_pager_last', 'Last') },
      dataAttr,
    );

    pagerEl.innerHTML =
      '<span class="audit-pager__info">' +
      escHtml(
        trf(opts.infoKey || 'containers_pager_info', 'Page {page} of {totalPages} · {total} total', {
          page: page,
          totalPages: totalPages,
          total: meta.total,
        }),
      ) +
      '</span><div class="audit-pager__controls">' +
      controls +
      '</div>';
  }

  function bindClick(pagerEl, onOffset, dataAttr) {
    dataAttr = dataAttr || 'data-list-offset';
    if (!pagerEl || pagerEl.dataset.bound) return;
    pagerEl.dataset.bound = '1';
    pagerEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[' + dataAttr + ']');
      if (!btn || btn.disabled) return;
      var offset = Number(btn.getAttribute(dataAttr));
      if (!Number.isFinite(offset) || offset < 0) return;
      onOffset(offset);
    });
  }

  global.ListPager = {
    normalizeMeta: normalizeMeta,
    render: render,
    bindClick: bindClick,
  };
})(typeof window !== 'undefined' ? window : globalThis);
