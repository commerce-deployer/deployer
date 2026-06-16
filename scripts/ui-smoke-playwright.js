'use strict';

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`PAGEERROR: ${e.message}`));

  const failed = [];
  page.on('response', (res) => {
    const url = res.url();
    if ((url.includes('.js') || url.includes('/api/')) && res.status() >= 400) {
      failed.push(`${res.status()} ${url}`);
    }
  });

  await page.goto('http://127.0.0.1:3000/login.html', { waitUntil: 'networkidle' });
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 15000 });
  await page.waitForTimeout(2500);

  const cards = await page.locator('.template-card').count();
  const listHtml = await page.locator('#templates-list').innerHTML();
  const deployerApiType = await page.evaluate(() => typeof window.deployerApi);
  const templatesFetch = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/templates', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const text = await r.text();
      return { status: r.status, isArray: false, len: text.length, preview: text.slice(0, 120) };
    } catch (e) {
      return { error: e.message };
    }
  });

  let parsedCount = 0;
  try {
    const data = JSON.parse(templatesFetch.preview.startsWith('[') ? templatesFetch.preview : '[]');
    parsedCount = Array.isArray(data) ? data.length : -1;
  } catch (_) {}

  const shot = path.join(__dirname, '..', 'test-artifacts-ui-check.png');
  await page.screenshot({ path: shot, fullPage: true });

  console.log('URL:', page.url());
  console.log('deployerApi typeof:', deployerApiType);
  console.log('template cards in DOM:', cards);
  console.log('templates-list preview:', listHtml.replace(/\s+/g, ' ').slice(0, 300));
  console.log('in-page fetch /api/templates:', templatesFetch);
  console.log('failed responses:', failed);
  console.log('console:', logs.join('\n') || '(none)');
  console.log('screenshot:', shot);

  await browser.close();
  if (cards === 0) process.exit(2);
})().catch((e) => {
  console.error('PLAYWRIGHT FAIL', e);
  process.exit(1);
});
