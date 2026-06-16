'use strict';

/** Deploy docker-getting-started via UI and delete that container. */
const { chromium } = require('playwright');
const { dockerRemoveByNamePrefix } = require('../test/integration/helpers/cleanupIntegration');

const BASE = process.env.DEPLOYER_UI_BASE_URL || 'http://127.0.0.1:3000';

(async () => {
  const removed = await dockerRemoveByNamePrefix('ui-smoke-');
  if (removed.length) {
    console.log(`Deploy UI: pre-cleanup removed ${removed.length} stale ui-smoke-* container(s)`);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const hostPort = 18000 + Math.floor(Math.random() * 1000);
  const deployContainerName = `ui-smoke-${Date.now().toString(36)}`;

  page.on('dialog', (d) => d.accept());

  await page.goto(`${BASE}/login.html`);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html');

  await page.waitForSelector('#containers-list');
  const beforeCount = await page.locator('#containers-list .container-row').count();

  await page.locator('[data-deploy="docker-getting-started"]').click();
  await page.waitForSelector('#modal-overlay:not([hidden])');
  await page.fill('input[name="containerName"]', deployContainerName);
  await page.fill('input[name="HOST_PORT"]', String(hostPort));
  await page.click('#deploy-form button[type="submit"]');

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const count = await page.locator('#containers-list .container-row').count();
    if (count > beforeCount) break;
    await page.waitForTimeout(1000);
  }
  const afterDeployCount = await page.locator('#containers-list .container-row').count();
  if (afterDeployCount <= beforeCount) {
    throw new Error('container not listed after deploy');
  }

  const newRow = page.locator('#containers-list .container-row').nth(beforeCount);
  const containerId = await newRow.getAttribute('data-id');
  const containerName = await newRow.locator('.name').textContent();
  console.log(
    `Deploy UI: deployed container id=${containerId} name=${containerName} port=${hostPort}`,
  );

  await newRow.locator('.btn-delete-container').click();
  await page.waitForSelector('#delete-modal-overlay:not([hidden])');
  await page.click('#delete-modal-container-only');

  const rowSel = `#containers-list .container-row[data-id="${containerId}"]`;
  await page.locator(rowSel).waitFor({ state: 'detached', timeout: 120000 });

  const afterCount = await page.locator('#containers-list .container-row').count();
  if (afterCount !== beforeCount) {
    throw new Error(
      `expected ${beforeCount} container(s) after delete, got ${afterCount} (deleted wrong row?)`,
    );
  }

  await browser.close();
  console.log('Deploy UI smoke: OK');
})().catch((e) => {
  console.error('Deploy UI smoke FAIL:', e.message);
  process.exit(1);
});
