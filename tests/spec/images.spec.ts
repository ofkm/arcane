import { test, expect, type Page } from '@playwright/test';

async function fetchImagesWithRetry(page: Page, maxRetries = 3): Promise<any[]> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await page.request.get('/api/environments/0/images');
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}`);
      }
      const body = await response.json().catch(() => null as any);
      const data = Array.isArray(body?.data) ? body.data : [];
      return data;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) return [];
      await page.waitForTimeout(1000);
    }
  }
  return [];
}

let realImages: any[] = [];

test.beforeEach(async ({ page }) => {
  await page.goto('/images');
  await page.waitForLoadState('networkidle');

  try {
    const images = await fetchImagesWithRetry(page);
    realImages = Array.isArray(images) ? images : [];
  } catch {
    realImages = [];
  }

  console.log(`Found ${realImages.length} real images for testing`);
});

test.describe('Images Page', () => {
  test('should display the images page title and description', async ({ page }) => {
    await page.goto('/images');

    await expect(page.getByRole('heading', { name: 'Images', level: 1 })).toBeVisible();
    await expect(page.getByText('View and Manage your Container images').first()).toBeVisible();
  });

  test('should display stats cards with correct counts and size', async ({ page }) => {
    await page.goto('/images');

    await expect(page.locator('p:has-text("Total Images") + p')).toHaveText(realImages.length.toString());
    await expect(page.locator('p:has-text("Total Size") + p')).not.toBeEmpty();
  });

  test('should display the image table when images exist', async ({ page }) => {
    await page.goto('/images');

    await page.waitForLoadState('networkidle');

    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Repository' })).toBeVisible();
  });

  test('should open the Pull Image dialog', async ({ page }) => {
    await page.goto('/images');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Pull Image")').first().click();
    await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Pull Docker Image")')).toBeVisible();
  });

  test('should open the Prune Unused Images dialog', async ({ page }) => {
    await page.goto('/images');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Prune Unused")').click();
    await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Prune Unused Images")')).toBeVisible();
  });

  test('should navigate to image details on inspect click', async ({ page }) => {
    await page.goto('/images');

    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: 'Inspect' }).click();
  });

  test('should pull image from dropdown menu', async ({ page }) => {
    test.skip(!realImages.length, 'No images available for pull API test');
    await page.goto('/images');

    await page.waitForLoadState('networkidle');

    const firstRow = await page.getByRole('row', { name: 'ghcr.io/linuxserver/nginx' });
    await firstRow.getByRole('button', { name: 'Open menu' }).click();

    await page.getByRole('menuitem', { name: 'Pull' }).click();

    await page.waitForLoadState('networkidle');

    await expect(page.locator(`li[data-sonner-toast][data-type="success"] div[data-title]`)).toBeVisible();
  });

  test('should call remove API on row action remove click and confirmation', async ({ page }) => {
    test.skip(!realImages.length, 'No images available for remove API test');
    await page.goto('/images');

    await page.waitForLoadState('networkidle');

    const deleteableImage = realImages.find((img) => img.repoTags?.[0]?.includes('ghcr.io/linuxserver/radarr'));
    test.skip(!deleteableImage, 'No deletable images available');

    const firstRow = await page.getByRole('row', { name: 'ghcr.io/linuxserver/radarr' });
    await firstRow.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: 'Remove' }).click();
    console.log(firstRow);

    await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Remove Image")')).toBeVisible();

    await page.locator('button:has-text("Remove")').click();

    await expect(page.locator('li[data-sonner-toast][data-type="success"] div[data-title]')).toBeVisible();
  });

  test('should call prune API on prune click and confirmation', async ({ page }) => {
    await page.goto('/images');

    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Prune Unused")').click();

    await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Prune Unused Images")')).toBeVisible();

    await page.locator('button:has-text("Prune Images")').click();

    await expect(page.locator(`li[data-sonner-toast][data-type="success"] div[data-title]:has-text("pruned")`)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should pull image via form', async ({ page }) => {
    await page.goto('/images');

    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Pull Image")').first().click();
    await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Pull Docker Image")')).toBeVisible();

    const imageNameFull = 'ghcr.io/linuxserver/nginx:latest';
    const imageName = 'ghcr.io/linuxserver/nginx';
    await page.locator('input[id="image-name-*"]').fill(imageName);

    await page.locator('button[type="submit"]:has-text("Pull Image")').click();

    await expect(page.locator('li[data-sonner-toast][data-type="success"] div[data-title]')).toBeVisible();
  });
});
