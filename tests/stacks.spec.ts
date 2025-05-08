import { test, expect } from '@playwright/test';

test.describe('Stacks Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/stacks');
	});

	test('should display the stacks page correctly', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Stacks', level: 1 })).toBeVisible();
		await expect(page.getByText('Manage Docker Compose stacks').first()).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create Stack' })).toBeVisible();
		await expect(page.getByText('Total Stacks')).toBeVisible();
		await expect(page.getByText('Running', { exact: true })).toBeVisible();
		await expect(page.getByText('Partially Running', { exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Stack List' })).toBeVisible();
	});

	test('should navigate to the create new stack page when "Create Stack" is clicked', async ({ page }) => {
		await page.getByRole('button', { name: 'Create Stack' }).click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL('/stacks/new');
		await expect(page.getByRole('heading', { name: 'Create New Stack' })).toBeVisible();
	});

	test('should display "No stacks found" message if no stacks exist', async ({ page }) => {
		const noStacksMessage = page.getByText('No stacks found', { exact: true });
		const stackTable = page.getByRole('table');
		const isNoStacksVisible = await noStacksMessage.isVisible();
		const isTableVisible = await stackTable.isVisible();

		expect(isNoStacksVisible || isTableVisible).toBe(true);

		if (isNoStacksVisible) {
			await expect(page.getByText('Create a new stack using the "Create Stack" button above or import an existing compose file')).toBeVisible();
		}
	});

	test('should display stack actions dropdown for a managed stack', async ({ page }) => {
		const firstManagedStackActionsButton = page.locator('tr:has-text("Managed")').first().getByRole('button', { name: 'Open menu' });

		if (await firstManagedStackActionsButton.isVisible()) {
			await firstManagedStackActionsButton.click();
			await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
			const startAction = page.getByRole('menuitem', { name: 'Start' });
			const restartAction = page.getByRole('menuitem', { name: 'Restart' });
			const stopAction = page.getByRole('menuitem', { name: 'Stop' });

			const isStartVisible = await startAction.isVisible();
			const isRestartVisible = await restartAction.isVisible();
			const isStopVisible = await stopAction.isVisible();

			expect(isStartVisible || (isRestartVisible && isStopVisible)).toBe(true);

			await expect(page.getByRole('menuitem', { name: 'Destroy' })).toBeVisible();
		} else {
			console.log('Skipping stack actions dropdown test: No managed stacks found or actions button not visible.');
			test.skip(true, 'No managed stacks found to test actions dropdown.');
		}
	});

	test('should display import button for an external stack', async ({ page }) => {
		const importButton = page.locator('tr:has-text("External")').first().getByRole('button', { name: 'Import' });

		if (await importButton.isVisible()) {
			await expect(importButton).toBeEnabled();
		} else {
			console.log('Skipping import button test: No external stacks found.');
			test.skip(true, 'No external stacks found to test import button.');
		}
	});
});
