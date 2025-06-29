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
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return [];
}

let realVolumes: any[] = [];

test.beforeEach(async ({ page }) => {
  await page.goto('/volumes');
  await page.waitForLoadState('networkidle');

  try {
    realVolumes = await fetchVolumesWithRetry(page);
  } catch (error) {
    console.warn('Could not fetch volumes after multiple retries:', error);
    realVolumes = [];
  }
});

test.describe('Volumes Page', () => {
  test('should display the volumes page title and description', async ({ page }) => {
    await page.goto('/volumes');

    await expect(page.getByRole('heading', { name: 'Volumes', level: 1 })).toBeVisible();
    await expect(page.getByText('Manage your Docker volumes').first()).toBeVisible();
  });

  test('should display stats cards with correct counts', async ({ page }) => {
    await page.goto('/volumes');

    await expect(page.locator('p:has-text("Total Volumes") + p')).toHaveText(realVolumes.length.toString());
  });

  test('should display the volume table when volumes exist', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    if (realVolumes.length > 0) {
      await expect(page.getByText('Volume List')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    } else {
      await expect(page.getByText('No volumes found')).toBeVisible();
    }
  });

  test('should open the Create Volume dialog', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Create Volume")').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Create New Volume')).toBeVisible();
  });

  test('should display filter dropdown and allow filtering', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Filter")').click();
    await expect(page.getByText('Volume Usage')).toBeVisible();
    await expect(page.getByText('Show Used Volumes')).toBeVisible();
    await expect(page.getByText('Show Unused Volumes')).toBeVisible();
  });

  test('should navigate to volume details on inspect click', async ({ page }) => {
    test.skip(!realVolumes.length, 'No volumes available for inspect test');

    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: 'Inspect' }).click();

    await expect(page).toHaveURL(new RegExp(`/volumes/.+`));
  });

  test('should call remove API on row action delete click and confirmation', async ({ page }) => {
    test.skip(!realVolumes.length, 'No volumes available for remove API test');

    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    const unusedVolume = 'my-app-data';
    test.skip(!unusedVolume, 'No unused volumes available for deletion test');

    const firstRow = await page.getByRole('row', { name: 'my-app-data' });
    await firstRow.getByRole('button', { name: 'Open menu' }).click();

    await page.getByRole('menuitem', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'Delete Volume' })).toBeVisible();

    const removePromise = page.waitForRequest((req) => req.url().includes(`/api/volumes/my-app-data`) && req.method() === 'DELETE');

    await page.locator('button:has-text("Delete")').click();
    const removeRequest = await removePromise;

    expect(removeRequest).toBeTruthy();

    await expect(page.locator('li[data-sonner-toast][data-type="success"] div[data-title]')).toBeVisible();
  });

  test('should create volume via form', async ({ page }) => {
    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Create Volume")').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const volumeName = `test-volume-${Date.now()}`;
    await page.locator('input[id="volume-name-*"]').fill(volumeName);

    await page.getByRole('dialog').locator('button:has-text("Create Volume")').click();

    await expect(page.locator(`li[data-sonner-toast][data-type="success"] div[data-title]:has-text("created successfully")`)).toBeVisible();
  });

  test('should disable delete action for volumes in use', async ({ page }) => {
    test.skip(!realVolumes.length, 'No volumes available for in-use test');

    const volumeInUse = realVolumes.find((vol) => vol.inUse);
    test.skip(!volumeInUse, 'No volumes in use found for test');

    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    const volumeRow = page.locator(`tr:has-text("${volumeInUse.Name}")`);
    await volumeRow.getByRole('button', { name: 'Open menu' }).click();

    const deleteButton = page.getByRole('menuitem', { name: 'Delete' });
    await expect(deleteButton).toBeDisabled();
  });

  test('should display correct status badges for volume usage', async ({ page }) => {
    test.skip(!realVolumes.length, 'No volumes available for status badge test');

    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    // Check for "In Use" and "Unused" badges
    const usedVolumes = realVolumes.filter((vol) => vol.inUse);
    const unusedVolumes = realVolumes.filter((vol) => !vol.inUse);

    if (usedVolumes.length > 0) {
      await expect(page.locator('text="In Use"').first()).toBeVisible();
    }

    if (unusedVolumes.length > 0) {
      await expect(page.locator('text="Unused"').first()).toBeVisible();
    }
  });

  test('should filter volumes by usage status', async ({ page }) => {
    test.skip(!realVolumes.length, 'No volumes available for filter test');

    const usedVolumes = realVolumes.filter((vol) => vol.inUse);
    const unusedVolumes = realVolumes.filter((vol) => !vol.inUse);

    // Skip if we don't have both types
    test.skip(usedVolumes.length === 0 || unusedVolumes.length === 0, 'Need both used and unused volumes for filter test');

    await page.goto('/volumes');
    await page.waitForLoadState('networkidle');

    // Open filter dropdown
    await page.locator('button:has-text("Filter")').click();

    // Uncheck "Show Used Volumes"
    await page.getByText('Show Used Volumes').click();

    // Close dropdown
    await page.locator('button:has-text("Filter")').click();

    // Should only show unused volumes
    await expect(page.locator('tbody tr')).toHaveCount(unusedVolumes.length);

    // Open filter dropdown again
    await page.locator('button:has-text("Filter")').click();

    // Check "Show Used Volumes" and uncheck "Show Unused Volumes"
    await page.getByText('Show Used Volumes').click();
    await page.getByText('Show Unused Volumes').click();

    // Close dropdown
    await page.locator('button:has-text("Filter")').click();

    // Should only show used volumes
    await expect(page.locator('tbody tr')).toHaveCount(usedVolumes.length);
  });
});
