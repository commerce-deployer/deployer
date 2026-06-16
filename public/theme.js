(function () {
  const STORAGE_KEY = 'deployer-theme';

  function t(key) {
    return window.deployerI18n ? window.deployerI18n.t(key) : key;
  }

  function getTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleLabel(theme);
    updateToggleClass(theme);
  }

  function updateToggleLabel(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.setAttribute('aria-label', theme === 'dark' ? t('theme_light_aria') : t('theme_dark_aria'));
    btn.setAttribute('title', theme === 'dark' ? t('theme_light_title') : t('theme_dark_title'));
    const sr = btn.querySelector('.theme-toggle-sr');
    if (sr) sr.textContent = t('theme_toggle_sr');
  }

  function updateToggleClass(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (theme === 'dark') btn.classList.add('theme-toggle--toggled');
    else btn.classList.remove('theme-toggle--toggled');
  }

  function toggleTheme() {
    const theme = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(theme);
  }

  function init() {
    const theme = getTheme();
    setTheme(theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
    window.addEventListener('deployer-lang-changed', () => updateToggleLabel(getTheme()));
    const ready = window.deployerI18n && window.deployerI18n.ready;
    if (ready && typeof ready.then === 'function') {
      ready.then(() => updateToggleLabel(getTheme()));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.deployerToggleTheme = toggleTheme;
})();
