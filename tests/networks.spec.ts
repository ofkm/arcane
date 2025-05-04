import { test, expect } from '@playwright/test';

test.describe('Network Management Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/networks');
		await expect(page.getByRole('heading', { name: 'Networks', level: 1 })).toBeVisible();
		await expect(page.getByRole('link', { name: 'bridge' })).toBeVisible({ timeout: 10000 });
	});

	test('should display the main heading and description', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Networks', level: 1 })).toBeVisible();
		await expect(page.getByText('Manage Docker container networking')).toBeVisible();
	});

	test('should display the "Create Network" button', async ({ page }) => {
		await expect(page.getByRole('button', { name: 'Create Network' })).toBeVisible();
	});

	test('should display summary cards', async ({ page }) => {
		await expect(page.getByText('Total Networks')).toBeVisible();
		await expect(page.getByText('Bridge Networks')).toBeVisible();
		await expect(page.getByText('Overlay Networks')).toBeVisible();
	});

	test('should display the network list card title', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Network List' })).toBeVisible();
		await expect(page.getByText('Manage container communication')).toBeVisible();
	});

	test('should open the "Create Network" dialog when button is clicked', async ({ page }) => {
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Create Network' }).click();
		const dialogTitle = page.getByTestId('create-network-dialog-header');
		await expect(dialogTitle).toBeVisible({ timeout: 10000 });
		await expect(page.getByLabel('Name')).toBeVisible();
		await page.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialogTitle).not.toBeVisible({ timeout: 5000 });
	});

	test('should allow searching/filtering networks', async ({ page }) => {
		const searchInput = page.getByPlaceholder('Search networks...');
		await expect(searchInput).toBeVisible();
		await searchInput.fill('bridge');
		await expect(page.getByRole('link', { name: 'bridge' })).toBeVisible();
		await searchInput.clear();
		await expect(page.getByRole('link', { name: 'host' })).toBeVisible();
	});

	test('should show actions menu for a network', async ({ page }) => {
		await page.waitForLoadState('networkidle');
		const bridgeRow = page.locator('tr', { has: page.getByRole('link', { name: 'bridge' }) });
		const menuButton = bridgeRow.getByRole('button', { name: 'Open menu' });
		await expect(menuButton).toBeVisible();
		await menuButton.click();
		await expect(page.getByRole('menuitem', { name: 'Inspect' })).toBeVisible({ timeout: 5000 });
	});

	test('should navigate to inspect page when "Inspect" is clicked', async ({ page }) => {
		const networkLink = page.getByRole('link', { name: 'bridge' });
		const networkName = await networkLink.textContent();
		await expect(networkLink).toBeVisible();
		await networkLink.click();
		await expect(page).toHaveURL(new RegExp(`/networks/.+`), { timeout: 10000 });
		await expect(page.getByRole('heading', { name: new RegExp(`.*${networkName}`) })).toBeVisible();
	});

	test('should allow selecting networks via checkboxes', async ({ page }) => {
		await page.waitForLoadState('networkidle');
		const bridgeRow = page.locator('tr', { has: page.getByRole('link', { name: 'bridge' }) });
		const firstCheckbox = bridgeRow.getByRole('checkbox');
		await expect(firstCheckbox).toBeVisible();
		await firstCheckbox.click();
		await expect(firstCheckbox).toBeChecked();
		const actionsButton = page.getByRole('button', { name: /Group actions for 1 selected network/i });
		await actionsButton.waitFor({ state: 'visible', timeout: 5000 });
		await expect(actionsButton).toBeVisible();
	});

	test('should show bulk delete action when networks are selected', async ({ page }) => {
		await page.waitForLoadState('networkidle');
		const bridgeRow = page.locator('tr', { has: page.getByRole('link', { name: 'bridge' }) });
		const checkbox = bridgeRow.getByRole('checkbox');
		await expect(checkbox).toBeVisible();
		await checkbox.click();
		await expect(checkbox).toBeChecked();
		const actionsButton = page.getByRole('button', { name: /Group actions for 1 selected network/i });
		await actionsButton.waitFor({ state: 'visible', timeout: 5000 });
		await expect(actionsButton).toBeVisible();
		await actionsButton.click();
		await expect(page.getByRole('menuitem', { name: 'Delete Selected' })).toBeVisible({ timeout: 5000 });
	});
});
