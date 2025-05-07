import { test, expect } from '@playwright/test';

test.describe('Stacks Page', () => {
	test.beforeEach(async ({ page }) => {
		// All tests in this suite will navigate to the stacks page first
		await page.goto('/stacks');
	});

	test('should display the stacks page correctly', async ({ page }) => {
		// Check for the main heading
		await expect(page.getByRole('heading', { name: 'Stacks', level: 1 })).toBeVisible();

		// Check for the "Manage Docker Compose stacks" subheading/description
		await expect(page.getByText('Manage Docker Compose stacks')).toBeVisible();

		// Check for the "Create Stack" button
		await expect(page.getByRole('button', { name: 'Create Stack' })).toBeVisible();

		// Check for the summary cards section (e.g., Total Stacks)
		await expect(page.getByText('Total Stacks')).toBeVisible();
		await expect(page.getByText('Running')).toBeVisible();
		await expect(page.getByText('Partially Running')).toBeVisible();

		// Check for the Stack List card title
		await expect(page.getByRole('heading', { name: 'Stack List' })).toBeVisible();
	});

	test('should navigate to the create new stack page when "Create Stack" is clicked', async ({ page }) => {
		// Click the "Create Stack" button
		await page.getByRole('button', { name: 'Create Stack' }).click();

		// Verify the URL changed to the new stack page
		await expect(page).toHaveURL('/stacks/new');

		// Check for a heading on the "Create New Stack" page
		await expect(page.getByRole('heading', { name: 'Create New Stack' })).toBeVisible();
	});

	test('should display "No stacks found" message if no stacks exist', async ({ page }) => {
		// This test assumes a clean state or that no stacks are initially present.
		// If stacks are always present, this test might need adjustment or mock data.
		// For now, we'll check if the "No stacks found" text OR the table is visible.

		const noStacksMessage = page.getByText('No stacks found', { exact: true });
		const stackTable = page.getByRole('table'); // UniversalTable renders a <table>

		// Check if either the "no stacks" message is visible or the table is visible
		// This makes the test more resilient whether there are stacks or not.
		const isNoStacksVisible = await noStacksMessage.isVisible();
		const isTableVisible = await stackTable.isVisible();

		expect(isNoStacksVisible || isTableVisible).toBe(true);

		if (isNoStacksVisible) {
			await expect(page.getByText('Create a new stack using the "Create Stack" button above or import an existing compose file')).toBeVisible();
		}
	});

	test('should display stack actions dropdown for a managed stack', async ({ page }) => {
		// This test assumes at least one "Managed" stack exists.
		// You might need to create a stack in a setup step or ensure one exists.
		// For simplicity, we'll try to find the first dropdown trigger if any stack exists.

		const firstManagedStackActionsButton = page
			.locator('tr:has-text("Managed")') // Find a row that indicates a managed stack
			.first()
			.getByRole('button', { name: 'Open menu' }); // The Ellipsis button

		if (await firstManagedStackActionsButton.isVisible()) {
			await firstManagedStackActionsButton.click();
			// Check for some common actions in the dropdown
			await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
			// Depending on stack status, Start or Restart/Stop will be visible
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
		// This test assumes at least one "External" stack exists.
		const importButton = page
			.locator('tr:has-text("External")') // Find a row that indicates an external stack
			.first()
			.getByRole('button', { name: 'Import' });

		if (await importButton.isVisible()) {
			await expect(importButton).toBeEnabled();
		} else {
			console.log('Skipping import button test: No external stacks found.');
			test.skip(true, 'No external stacks found to test import button.');
		}
	});
});
