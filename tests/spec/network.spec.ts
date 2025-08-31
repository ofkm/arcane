import { test, expect, type Page } from '@playwright/test';

type NetworkSummary = { id: string; name: string; driver?: string; scope?: string };

async function fetchNetworksWithRetry(page: Page, maxRetries = 3): Promise<NetworkSummary[]> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const res = await page.request.get('/api/networks');
      const json = await res.json();
      const data = Array.isArray(json) ? json : json?.data?.data ?? json?.data ?? [];
      return (data ?? []) as NetworkSummary[];
    } catch {
      retries++;
      if (retries >= maxRetries) throw new Error('Failed to fetch networks');
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return [];
}

let realNetworks: NetworkSummary[] = [];

test.beforeEach(async ({ page }) => {
  await page.goto('/networks');
  await page.waitForLoadState('networkidle');
  realNetworks = await fetchNetworksWithRetry(page);
});

test.describe('Networks Page', () => {
  test('Page renders with heading and subtitle', async ({ page }) => {
    await page.goto('/networks');
    await expect(page.getByRole('heading', { level: 1, name: 'Networks' })).toBeVisible();
    await expect(page.getByText('Manage your Docker networks').first()).toBeVisible();
  });

  test('Stat cards show correct counts', async ({ page }) => {
    await page.goto('/networks');

    const total = realNetworks.length;
    const bridgeCount = realNetworks.filter((n) => n.driver === 'bridge').length;

    await expect(page.locator('p:has-text("Total Networks") + p')).toHaveText(String(total));
    await expect(page.locator('p:has-text("Bridge Networks") + p')).toHaveText(String(bridgeCount));
  });

  test('Table displays when networks exist, else empty state', async ({ page }) => {
    await page.goto('/networks');
    await page.waitForLoadState('networkidle');

    if (realNetworks.length > 0) {
      await expect(page.locator('table')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Name' })).toBeVisible();
    } else {
      await expect(page.getByText('No networks found')).toBeVisible();
    }
  });

  test('Open Create Network sheet', async ({ page }) => {
    await page.goto('/networks');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Create Network")').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Create Network', async ({ page }) => {
    await page.goto('/networks');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Create Network")').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const networkName = `test-network-${Date.now()}`;
    // Prefer label "Name" if available
    const nameInput = page.getByLabel('Name').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(networkName);
    } else {
      await page.locator('input[id^="network-name-"]').first().fill(networkName);
    }

    await page.getByRole('dialog').locator('button:has-text("Create Network")').click();

    await expect(page.locator('li[data-sonner-toast][data-type="success"] div[data-title]')).toBeVisible();
  });

  test('Inspect Network from row actions', async ({ page }) => {
    await page.goto('/networks');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: 'Inspect' }).click();

    await expect(page).toHaveURL(/\/networks\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Remove Network from table', async ({ page }) => {
    const networkName = 'my-test-network';

    await page.goto('/networks');
    await page.waitForLoadState('networkidle');

    const row = page.locator('tbody tr', { has: page.getByText(networkName) }).first();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: 'Remove' }).click();

    await expect(page.getByRole('heading', { name: 'Delete Network' })).toBeVisible();
    await page.locator('button:has-text("Delete")').click();

    await expect(page.locator('li[data-sonner-toast][data-type="success"] div[data-title]')).toBeVisible();
  });

  test('Default networks cannot be removed on details page', async ({ page }) => {
    const bridge = realNetworks.find((n) => n.name === 'bridge');

    await page.goto(`/networks/${bridge.id}`);
    await page.waitForLoadState('networkidle');

    const removeBtn = page.getByRole('button', { name: 'Remove Network' });
    await expect(removeBtn).toBeDisabled();
  });

  test('Details page shows usage badge', async ({ page }) => {
    await page.goto(`/networks/${realNetworks[0].id}`);
    await page.waitForLoadState('networkidle');

    const inUse = page.locator('text=In Use');
    const unused = page.locator('text=Unused');
    await expect(inUse.first().or(unused.first())).toBeVisible();
  });
});
