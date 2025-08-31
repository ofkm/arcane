import { test, expect, type Page } from '@playwright/test';

async function fetchVolumesWithRetry(page: Page, maxRetries = 3): Promise<any[]> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await page.request.get('/api/volumes');
      const volumes = await response.json();
      return volumes.data;
    } catch (error) {
      retries++;
      console.log(`Attempt ${retries} failed, ${maxRetries - retries} retries left`);
      if (retries >= maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return [];
}

let realVolumes: any[] = [];

test.beforeEach(async ({ page }) => {
  await page.goto('/volumes');
  await page.waitForLoadState('networkidle');
  realVolumes = await fetchVolumesWithRetry(page);
});

function facetIds(title: string) {
  const key = title.toLowerCase();
  return {
    triggerId: `facet-${key}-trigger`,
    contentId: `facet-${key}-content`,
  };
}

async function ensureFacetOpen(page: Page, title: string) {
  const { triggerId, contentId } = facetIds(title);
  const trigger = page.getByTestId(triggerId).first();
  const content = page.getByTestId(contentId).first();

  if (await content.isVisible().catch(() => false)) return { trigger, content };

  if ((await trigger.getAttribute('data-state')) !== 'open') await trigger.click();
  await content.waitFor({ state: 'visible' });
  return { trigger, content };
}

async function ensureUsageOpen(page: Page) {
  const trigger = page.getByTestId('facet-usage-trigger').first();
  const used = page.getByTestId('facet-usage-option-true').first();
  if (await used.isVisible().catch(() => false)) return;
  if ((await trigger.getAttribute('data-state')) !== 'open') await trigger.click();
  await used.waitFor({ state: 'visible' });
}

async function toggleUsageValue(page: Page, value: 'true' | 'false', desired: boolean) {
  // 'true' -> In Use, 'false' -> Unused
  const want = desired ? 'true' : 'false';
  const testId = `facet-usage-option-${value}`;

  for (let attempt = 0; attempt < 6; attempt++) {
    await ensureUsageOpen(page);

    const option = page.getByTestId(testId).first();
    await option.waitFor({ state: 'visible' });

    const current = (await option.getAttribute('aria-selected')) === 'true';
    if (current === desired) return;

    // Try 1: click the label span (avoids pointer-events-none on icons)
    const label = option.locator('span', { hasText: value === 'true' ? 'In Use' : 'Unused' }).first();
    if (await label.isVisible().catch(() => false)) {
      await label.click().catch(() => {});
      try {
        await expect(option).toHaveAttribute('aria-selected', want, { timeout: 400 });
        return;
      } catch {}
    }

    // Try 2: click the leading checkbox chip
    const chip = option.locator('div').first();
    await chip.click({ force: true }).catch(() => {});
    try {
      await expect(option).toHaveAttribute('aria-selected', want, { timeout: 400 });
      return;
    } catch {}

    // Try 3: click center of the option
    const box = await option.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      try {
        await expect(option).toHaveAttribute('aria-selected', want, { timeout: 400 });
        return;
      } catch {}
    }

    // Try 4: keyboard activation via the item
    await option.focus().catch(() => {});
    await option.press('Enter').catch(() => {});
    try {
      await expect(option).toHaveAttribute('aria-selected', want, { timeout: 400 });
      return;
    } catch {}

    // Try 5: synthesize DOM events
    await option
      .evaluate((el) => {
        const fire = (type: string) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        fire('pointerdown');
        fire('pointerup');
        fire('click');
      })
      .catch(() => {});
    try {
      await expect(option).toHaveAttribute('aria-selected', want, { timeout: 400 });
      return;
    } catch {}

    await page.waitForTimeout(120);
  }

  // Final check
  await ensureUsageOpen(page);
  await expect(page.getByTestId(testId)).toHaveAttribute('aria-selected', want);
}

async function setUsage(page: Page, showUsed: boolean, showUnused: boolean) {
  // true -> "In Use", false -> "Unused"
  await toggleUsageValue(page, 'true', showUsed);
  await toggleUsageValue(page, 'false', showUnused);
}

test.describe('Volumes Page', () => {
  test('Volume Page Display', async ({ page }) => {
    await page.goto('/volumes');

    await expect(page.getByRole('heading', { name: 'Volumes', level: 1 })).toBeVisible();
    await expect(page.getByText('Manage your Docker volumes').first()).toBeVisible();
  });

  test('Correct Volume Stat Card Counts', async ({ page }) => {
    await page.goto('/volumes');

    await expect(page.locator('p:has-text("Total Volumes") + p')).toHaveText(realVolumes.length.toString());
  });

  test('Create Volume Sheet Opens', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Create Volume")').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Create New Volume')).toBeVisible();
  });

  test('Display Volume Filters', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    const { content } = await ensureFacetOpen(page, 'Usage');
    await expect(content.getByRole('option', { name: /In Use\b/i })).toBeVisible();
    await expect(content.getByRole('option', { name: /Unused\b/i })).toBeVisible();
  });

  test('Inspect Volume', async ({ page }) => {
    test.skip(!realVolumes.length, 'No volumes available for inspect test');

    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: 'Inspect' }).click();

    await expect(page).toHaveURL(new RegExp(`/volumes/.+`));
  });

  test('Remove Volume', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    const firstRow = await page.getByRole('row', { name: 'my-app-data' });
    await firstRow.getByRole('button', { name: 'Open menu' }).click();

    await page.getByRole('menuitem', { name: 'Remove' }).click();

    await expect(page.getByRole('heading', { name: 'Remove Volume' })).toBeVisible();

    await page.locator('button:has-text("Remove")').click();

    await expect(page.locator('li[data-sonner-toast][data-type="success"] div[data-title]')).toBeVisible();
  });

  test('Create Volume', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Create Volume")').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const volumeName = `test-volume-${Date.now()}`;
    await page.locator('input[id="volume-name-*"]').fill(volumeName);

    await page.getByRole('dialog').locator('button:has-text("Create Volume")').click();

    await expect(
      page.locator(`li[data-sonner-toast][data-type="success"] div[data-title]:has-text("created successfully")`)
    ).toBeVisible();
  });

  test('Disable remove action when volume is in use', async ({ page }) => {
    const volumeInUse = realVolumes.find((vol) => vol.inUse);

    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');
    const volumeRow = page.locator(`tr:has-text("${volumeInUse.name}")`);
    await volumeRow.getByRole('button', { name: 'Open menu' }).click();

    await expect(page.getByRole('menuitem', { name: 'Remove' })).toBeDisabled();
  });

  test('Display correct volume usage badge', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    const usedVolumes = realVolumes.filter((vol) => vol.inUse);
    const unusedVolumes = realVolumes.filter((vol) => !vol.inUse);

    if (usedVolumes.length > 0) {
      await expect(page.locator('text="In Use"').first()).toBeVisible();
    }

    if (unusedVolumes.length > 0) {
      await expect(page.locator('text="Unused"').first()).toBeVisible();
    }
  });
});
