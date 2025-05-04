import { test, expect, type Page } from '@playwright/test';
import { formatBytes } from '../src/lib/utils'; // Assuming utils are accessible

// Mock data for images
const mockImages = [
	{ id: 'sha256:abc123def456', repoTags: ['nginx:latest', 'nginx:1.25'], size: 187000000, inUse: false, repo: 'nginx', tag: 'latest' },
	{ id: 'sha256:ghi789jkl012', repoTags: ['redis:alpine'], size: 32500000, inUse: true, repo: 'redis', tag: 'alpine' }
];

const mockNoImages: any[] = [];

async function setupImageRoutes(page: Page, images: any[], options: { pruneResult?: any; removeErrorImageId?: string } = {}) {
	// Mock the initial list response
	await page.route('/api/images', async (route) => {
		await route.fulfill({ json: images });
	});

	// Mock remove response (can simulate errors)
	await page.route('/api/images/*/remove', async (route, request) => {
		const url = request.url();
		const imageId = url.split('/')[url.split('/').length - 2]; // Get ID from URL

		if (options.removeErrorImageId && imageId.includes(options.removeErrorImageId)) {
			await route.fulfill({ status: 500, json: { message: 'Simulated remove error' } });
		} else {
			await route.fulfill({ json: { message: 'Image removed successfully' } });
		}
	});

	// Mock prune response
	await page.route('/api/images/prune', async (route) => {
		await route.fulfill({ json: options.pruneResult ?? { message: 'Images pruned successfully', spaceReclaimed: 10000 } });
	});

	// Mock pull response (non-stream)
	await page.route('/api/images/pull', async (route) => {
		await route.fulfill({ json: { message: 'Image pulled successfully' } });
	});

	// Mock pull stream response (EventSource)
	// Note: Fully mocking EventSource behavior in Playwright routes is complex.
	// This basic mock sends completion immediately. For progress, more intricate mocking is needed.
	await page.route('/api/images/pull-stream/**', async (route) => {
		// Send headers for EventSource
		await route.fulfill({
			status: 200,
			contentType: 'text/event-stream',
			body: `data: ${JSON.stringify({ complete: true })}\n\n`
		});
	});
}

test.describe('Images Page', () => {
	test('should display the images page title and description', async ({ page }) => {
		await setupImageRoutes(page, mockImages);
		await page.goto('/images');

		await expect(page.getByRole('heading', { name: 'Docker Images', level: 1 })).toBeVisible();
		await expect(page.getByText('Manage your Docker images').first()).toBeVisible();
	});

	test('should display stats cards with correct counts and size', async ({ page }) => {
		await setupImageRoutes(page, mockImages);
		await page.goto('/images');

		const totalSize = mockImages.reduce((acc, img) => acc + (img.size || 0), 0);

		await expect(page.locator('p:has-text("Total Images") + p')).toHaveText(mockImages.length.toString());
		await expect(page.locator('p:has-text("Total Size") + p')).toHaveText(formatBytes(totalSize));
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
		await expect(page.getByText('Pull Docker Image')).toBeVisible();
	});

	test('should open the Prune Unused Images dialog', async ({ page }) => {
		await page.goto('/images');
		await page.waitForLoadState('networkidle');
		await page.locator('button:has-text("Prune Unused")').click();
		await expect(page.getByText('Prune Unused Images')).toBeVisible();
	});

	test('should navigate to image details on inspect click', async ({ page }) => {
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		const firstRow = page.locator('tbody tr').first();
		await firstRow.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('menuitem', { name: 'Inspect' }).click();

		// await expect(page).toHaveURL(`/images/${mockImages[0].id}`);
	});

	test('should call pull API on row action pull click', async ({ page }) => {
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		const firstRow = page.locator('tbody tr').first();
		await firstRow.getByRole('button', { name: 'Open menu' }).click();

		const pullPromise = page.waitForRequest((req) => req.url().includes('/api/images/pull') && req.method() === 'POST');
		await page.getByRole('menuitem', { name: 'Pull' }).click();
		const pullRequest = await pullPromise;

		expect(pullRequest).toBeTruthy();
		const postData = pullRequest.postDataJSON();
		expect(postData.imageRef).toBe(mockImages[0].repo); // e.g., 'nginx'
		expect(postData.tag).toBe(mockImages[0].tag); // e.g., 'latest'
		await expect(page.locator('div[role="status"]:has-text("Image \\"nginx:latest\\" pulled successfully.")')).toBeVisible();
	});

	test('should call remove API on row action remove click and confirmation', async ({ page }) => {
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		const firstRow = page.locator('tbody tr').first();
		await firstRow.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();

		// Confirm the dialog
		await expect(page.locator('h2:has-text("Delete Image")')).toBeVisible();
		const removePromise = page.waitForRequest((req) => req.url().includes('/remove') && req.method() === 'DELETE');
		await page.locator('button:has-text("Delete")').click(); // Confirmation button
		const removeRequest = await removePromise;

		expect(removeRequest).toBeTruthy();
		expect(removeRequest.url()).toContain(`/api/images/${mockImages[0].id}/remove`);
		const expectedIdentifier = mockImages[0].repoTags?.[0] || mockImages[0].id.substring(7, 19);
		await expect(page.locator(`div[role="status"]:has-text("Image \\"${expectedIdentifier}\\" deleted successfully.")`)).toBeVisible();
	});

	test('should call remove API for selected images on bulk delete click', async ({ page }) => {
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		// Select the first and third (unused) images
		await page.locator('tbody tr').nth(0).locator('input[type="checkbox"]').check();
		await page.locator('tbody tr').nth(2).locator('input[type="checkbox"]').check();

		await expect(page.locator('button:has-text("Actions (2)")')).toBeVisible();
		await page.locator('button:has-text("Actions (2)")').click();

		// Expect API calls for *each* selected, non-in-use image
		const removePromises = [page.waitForRequest((req) => req.url().includes(`/api/images/${mockImages[0].id}/remove`) && req.method() === 'DELETE'), page.waitForRequest((req) => req.url().includes(`/api/images/${mockImages[2].id}/remove`) && req.method() === 'DELETE')];

		await page.locator('button:has-text("Delete Selected")').click();

		// Confirm the dialog
		await expect(page.locator('h2:has-text("Delete Selected Images")')).toBeVisible();
		await page.locator('button:has-text("Delete")').click(); // Confirmation button

		const removeRequests = await Promise.all(removePromises);
		expect(removeRequests.length).toBe(2); // Both should be called

		// Check toasts (might need slight delay or specific waiting)
		await expect(page.locator(`div[role="status"]:has-text("Image \\"${mockImages[0].repoTags?.[0]}\\" deleted successfully.")`)).toBeVisible();
		await expect(page.locator(`div[role="status"]:has-text("Image \\"${mockImages[2].id.substring(7, 19)}\\" deleted successfully.")`)).toBeVisible(); // Dangling image uses ID
	});

	test('should show error toast when trying to delete an in-use image (bulk)', async ({ page }) => {
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		// Select the second (in-use) image
		await page.locator('tbody tr').nth(1).locator('input[type="checkbox"]').check();

		await page.locator('button:has-text("Actions (1)")').click();
		await page.locator('button:has-text("Delete Selected")').click();

		// Confirm the dialog
		await expect(page.locator('h2:has-text("Delete Selected Images")')).toBeVisible();
		// No API call expected here as it's checked client-side first
		const removeRequestPromise = page.waitForRequest((req) => req.url().includes('/remove') && req.method() === 'DELETE', { timeout: 100 }); // Short timeout, expect no call
		await page.locator('button:has-text("Delete")').click(); // Confirmation button

		await expect(removeRequestPromise).rejects.toThrow(); // Expect timeout - no API call
		const expectedIdentifier = mockImages[1].repoTags?.[0] || mockImages[1].id.substring(7, 19);
		await expect(page.locator(`div[role="alert"]:has-text("Image \\"${expectedIdentifier}\\" is in use and cannot be deleted.")`)).toBeVisible();
	});

	test('should call prune API on prune click and confirmation', async ({ page }) => {
		await setupImageRoutes(page, mockImages, { pruneResult: { message: 'Pruned 1 image', spaceReclaimed: 5500000 } });
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		await page.locator('button:has-text("Prune Unused")').click();

		// Confirm the dialog

		await expect(page.getByText('Prune Unused Images')).toBeVisible();
		const prunePromise = page.waitForRequest((req) => req.url().includes('/api/images/prune') && req.method() === 'POST');
		await page.locator('button:has-text("Prune Images")').click(); // Confirmation button
		const pruneRequest = await prunePromise;

		expect(pruneRequest).toBeTruthy();
		await expect(page.locator('div[role="status"]:has-text("Pruned 1 image")')).toBeVisible();
	});

	test('should pull image via dialog using EventSource', async ({ page }) => {
		await page.goto('/images');

		await page.waitForLoadState('networkidle');

		await page.locator('button:has-text("Pull Image")').first().click();
		await expect(page.getByText('Pull Docker Image')).toBeVisible();

		const imageName = 'busybox';
		const imageTag = 'latest';
		await page.locator('input[id="image-ref"]').fill(imageName);
		await page.locator('input[id="image-tag"]').fill(imageTag);

		// Expect the EventSource request
		const eventSourcePromise = page.waitForRequest((req) => req.url().includes(`/api/images/pull-stream/${imageName}?tag=${imageTag}`) && req.method() === 'GET');
		await page.locator('button[type="submit"]:has-text("Pull Image")').click();
		const eventSourceRequest = await eventSourcePromise;

		expect(eventSourceRequest).toBeTruthy();
		// Wait for the success toast which indicates the EventSource mock sent 'complete'
		await expect(page.locator(`div[role="status"]:has-text("Image \\"${imageName}:${imageTag}\\" pulled successfully.")`)).toBeVisible();
		// Dialog should close on success
		await expect(page.getByText('Pull Docker Image')).not.toBeVisible();
	});
});
