import { test, expect } from '@playwright/test';

test.describe('Volumes Page UI', () => {
	test('should display the page title, description, and summary cards', async ({ page }) => {
		await page.goto('/volumes');

		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('heading', { name: 'Volumes' })).toBeVisible();
		await expect(page.getByText('Manage persistent data storage for containers')).toBeVisible();
		await expect(page.getByText('Total Volumes')).toBeVisible();
		await expect(page.getByText('Driver')).toBeVisible();
		await expect(page.getByText('local')).toBeVisible();
	});

	test('should display the volume list table with correct columns and rows', async ({ page }) => {
		await page.goto('/volumes');

		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('table')).toBeVisible();
		await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
		await expect(page.getByRole('columnheader', { name: 'Mountpoint' })).toBeVisible();
		await expect(page.getByRole('columnheader', { name: 'Driver' })).toBeVisible();

		// You may want to check for specific test volumes created in your workflow, e.g.:
		await expect(page.getByRole('link', { name: 'my-app-data' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'cache' })).toBeVisible();
		await expect(page.getByText('/var/lib/docker/volumes/my-app-data/_data')).toBeVisible();
		await expect(page.getByText('/var/lib/docker/volumes/cache/_data')).toBeVisible();
		await expect(page.getByText('local')).toBeVisible();
	});

	test('should show "Unused" badge for unused volumes', async ({ page }) => {
		await page.goto('/volumes');

		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Unused')).toBeVisible();
	});

	test('should open the "Create Volume" dialog', async ({ page }) => {
		await page.goto('/volumes');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Create Volume' }).click();
		await expect(page.getByText('Create New Volume')).toBeVisible();
		await expect(page.getByLabel('Name')).toBeVisible();
		await expect(page.getByLabel('Driver')).toBeVisible();
	});
});
