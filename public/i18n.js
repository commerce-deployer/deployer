(function () {
  var dict = { ru: {}, en: {} };
  var loaded = false;

  function getLang() {
    try {
      var stored = localStorage.getItem('deployer-lang');
      if (stored === 'en' || stored === 'ru') return stored;
    } catch (_) {
      /* ignore */
    }
    var lang = document.documentElement.getAttribute('lang');
    if (lang === 'en' || lang === 'ru') return lang;
    return 'en';
  }

  function t(key) {
    var lang = getLang();
    return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || (dict.ru && dict.ru[key]) || key;
  }

  function tf(key, vars) {
    var s = t(key);
    if (!vars || typeof vars !== 'object') return s;
    Object.keys(vars).forEach(function (k) {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
    });
    return s;
  }

  function looksLikeLocaleKey(s) {
    return /^[a-z][a-z0-9_]{2,}$/.test(String(s || ''));
  }

  function syncDocumentTitle() {
    var sub = document.querySelector('meta[name="deployer-page-title"]');
    if (!sub) return;
    var pagePart = String(sub.getAttribute('content') || '').trim();
    if (!pagePart || looksLikeLocaleKey(pagePart)) {
      pagePart = t(pagePart);
    }
    var brand = t('brand_deployer');
    document.title = pagePart ? brand + ' — ' + pagePart : brand;
  }

  function applyI18n() {
    if (!loaded) return;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      nodes[i].textContent = t(key);
    }
    var htmlNodes = document.querySelectorAll('[data-i18n-html]');
    for (var h = 0; h < htmlNodes.length; h++) {
      htmlNodes[h].innerHTML = t(htmlNodes[h].getAttribute('data-i18n-html'));
    }
    var phNodes = document.querySelectorAll('[data-i18n-placeholder]');
    for (var p = 0; p < phNodes.length; p++) {
      phNodes[p].setAttribute('placeholder', t(phNodes[p].getAttribute('data-i18n-placeholder')));
    }
    var titleNodes = document.querySelectorAll('[data-i18n-title]');
    for (var ti = 0; ti < titleNodes.length; ti++) {
      titleNodes[ti].setAttribute('title', t(titleNodes[ti].getAttribute('data-i18n-title')));
    }
    var ariaNodes = document.querySelectorAll('[data-i18n-aria-label]');
    for (var a = 0; a < ariaNodes.length; a++) {
      ariaNodes[a].setAttribute('aria-label', t(ariaNodes[a].getAttribute('data-i18n-aria-label')));
    }
    var optNodes = document.querySelectorAll('option[data-i18n-option]');
    for (var o = 0; o < optNodes.length; o++) {
      optNodes[o].textContent = t(optNodes[o].getAttribute('data-i18n-option'));
    }
    syncDocumentTitle();
  }

  var loadPromise = Promise.all([
    fetch('/locales/ru.json').then(function (r) {
      return r.ok ? r.json() : {};
    }),
    fetch('/locales/en.json').then(function (r) {
      return r.ok ? r.json() : {};
    }),
  ])
    .then(function (pair) {
      dict.ru = pair[0] || {};
      dict.en = pair[1] || {};
      loaded = true;
      applyI18n();
    })
    .catch(function () {
      loaded = true;
    });

  window.deployerI18n = {
    t: t,
    tf: tf,
    getLang: getLang,
    apply: applyI18n,
    syncDocumentTitle: syncDocumentTitle,
    ready: loadPromise,
    isLoaded: function () {
      return loaded;
    },
  };
})();
