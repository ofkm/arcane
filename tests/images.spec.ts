import { test, expect, type Page } from '@playwright/test';
import { formatBytes } from '../src/lib/utils/bytes.util';

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
		await setupImageRoutes(page, mockImages);
		await page.goto('/images');
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Image List')).toBeVisible();
		await expect(page.locator('table')).toBeVisible();
	});

	test('should open the Pull Image dialog', async ({ page }) => {
		await setupImageRoutes(page, mockImages);
		await page.goto('/images');
		await page.waitForLoadState('networkidle');
		await page.locator('button:has-text("Pull Image")').first().click();
		await expect(page.getByText('Pull Docker Image')).toBeVisible();
	});

	test('should open the Prune Unused Images dialog', async ({ page }) => {
		await setupImageRoutes(page, mockImages);
		await page.goto('/images');
		await page.waitForLoadState('networkidle');
		await page.locator('button:has-text("Prune Unused")').click();
		await expect(page.getByText('Prune Unused Images')).toBeVisible();
	});

	test('should navigate to image details on inspect click', async ({ page }) => {
		await setupImageRoutes(page, mockImages);
		await page.goto('/images');
		await page.waitForLoadState('networkidle');
		const firstRow = page.locator('tbody tr').first();
		await firstRow.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('menuitem', { name: 'Inspect' }).click();
		// Optionally check for navigation or UI change here
	});
});
