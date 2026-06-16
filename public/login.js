function t(key) {
  return window.deployerI18n ? window.deployerI18n.t(key) : key;
}

function translateErr(message) {
  if (window.deployerTranslateApiError) return window.deployerTranslateApiError(message);
  return message;
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('login-error');
  errEl.hidden = true;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.value.trim(),
        password: form.password.value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      window.location.href = '/index.html';
      return;
    }
    errEl.textContent = translateErr(data.error) || t('err_login');
    errEl.hidden = false;
  } catch (err) {
    errEl.textContent = translateErr(err.message) || t('err_network');
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
});
