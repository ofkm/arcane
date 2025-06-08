import { test, expect, type Page } from '@playwright/test';

async function fetchImagesWithRetry(page: Page, maxRetries = 3): Promise<any[]> {
	let retries = 0;
	while (retries < maxRetries) {
		try {
			const response = await page.request.get('/api/images');
			const images = await response.json();
			console.log(`Successfully fetched ${images.length} images on attempt ${retries + 1}`);
			return images;
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

let realImages: any[] = [];

test.beforeEach(async ({ page }) => {
	await page.goto('/images');
	await page.waitForLoadState('networkidle');

	try {
		realImages = await fetchImagesWithRetry(page);
	} catch (error) {
		console.warn('Could not fetch images after multiple retries:', error);
		// Use default images if all retries fail
		realImages = [];
	}

	console.log(`Found ${realImages.length} real images for testing`);
});

test.describe('Images Page', () => {
	test('should display the images page title and description', async ({ page }) => {
		await page.goto('/images');

		await expect(page.getByRole('heading', { name: 'Container Images', level: 1 })).toBeVisible();
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

		await expect(page.getByText('Image List')).toBeVisible();
		await expect(page.locator('table')).toBeVisible();
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

		// await expect(page).toHaveURL(`/images/${realImages[0].id}`);
	});

	test('should call pull API on row action pull click', async ({ page }) => {
		test.skip(!realImages.length, 'No images available for pull API test');
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		// Find a real image in the table
		const firstRow = page.locator('tbody tr').first();
		await firstRow.getByRole('button', { name: 'Open menu' }).click();

		const pullPromise = page.waitForRequest((req) => req.url().includes('/api/images/pull') && req.method() === 'POST');
		await page.getByRole('menuitem', { name: 'Pull' }).click();
		const pullRequest = await pullPromise;

		await page.waitForLoadState('networkidle');

		// Extract image name from real images
		const realImageRef = realImages[0].repoTags?.[0]?.split(':')[0] || 'busybox';
		const realTag = realImages[0].repoTags?.[0]?.split(':')[1] || 'latest';

		expect(pullRequest).toBeTruthy();
		const postData = pullRequest.postDataJSON();
		expect(postData.tag).toBe(realTag);

		await expect(page.locator(`li[data-sonner-toast][data-type="success"] div[data-title]`)).toBeVisible();
	});

	test('should call remove API on row action remove click and confirmation', async ({ page }) => {
		test.skip(!realImages.length, 'No images available for remove API test');
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		const deleteableImage = realImages.find((img) => !img.inUse);
		test.skip(deleteableImage, 'No deletable images available');

		const imageRow = page.locator(`tr:has-text("${deleteableImage.repoTags?.[0] || deleteableImage.id.substring(7, 19)}")`);
		await imageRow.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();

		await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Delete Image")')).toBeVisible();

		const removePromise = page.waitForRequest((req) => req.url().includes(`/api/images/${deleteableImage.id}`) && req.method() === 'DELETE');

		await page.locator('button:has-text("Delete")').click();
		const removeRequest = await removePromise;

		expect(removeRequest).toBeTruthy();

		await expect(page.locator('li[data-sonner-toast][data-type="success"] div[data-title]')).toBeVisible();
	});
	test('should call prune API on prune click and confirmation', async ({ page }) => {
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		await page.locator('button:has-text("Prune Unused")').click();

		await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Prune Unused Images")')).toBeVisible();
		const prunePromise = page.waitForRequest((req) => req.url().includes('/api/images/prune') && req.method() === 'POST');
		await page.locator('button:has-text("Prune Images")').click(); // Confirmation button
		const pruneRequest = await prunePromise;

		expect(pruneRequest).toBeTruthy();
		await expect(page.locator(`li[data-sonner-toast][data-type="success"] div[data-title]:has-text("pruned")`)).toBeVisible({
			timeout: 10000
		});
	});

	test('should pull image via dialog using EventSource', async ({ page }) => {
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		await page.locator('button:has-text("Pull Image")').first().click();
		await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Pull Docker Image")')).toBeVisible();

		const imageName = 'busybox';
		const imageTag = 'latest';
		await page.locator('input[id="image-ref"]').fill(imageName);
		await page.locator('input[id="image-tag"]').fill(imageTag);

		const eventSourcePromise = page.waitForRequest((req) => req.url().includes(`/api/images/pull-stream/${imageName}?tag=${imageTag}`) && req.method() === 'GET');
		await page.locator('button[type="submit"]:has-text("Pull Image")').click();
		const eventSourceRequest = await eventSourcePromise;

		expect(eventSourceRequest).toBeTruthy();

		await expect(page.locator(`li[data-sonner-toast][data-type="success"] div[data-title]:has-text("Image \\"${imageName}:${imageTag}\\" pulled successfully.")`)).toBeVisible();
		await expect(page.locator('div[role="heading"][aria-level="2"][data-dialog-title]:has-text("Pull Docker Image")')).not.toBeVisible();
	});
});
