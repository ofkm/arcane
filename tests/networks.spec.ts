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
		// Check that other networks might be hidden (e.g., 'host' if it exists)
		// await expect(page.getByRole('link', { name: 'host' })).not.toBeVisible();
		await searchInput.clear();
		await expect(page.getByRole('link', { name: 'host' })).toBeVisible();
	});

	test('should show actions menu for a network', async ({ page }) => {
		await page.waitForLoadState('networkidle');
		const bridgeRow = page.locator('tr', { has: page.getByRole('link', { name: 'bridge' }) });
		const menuButton = bridgeRow.getByRole('button', { name: 'Open menu' });
		await expect(menuButton).toBeVisible();
		await menuButton.click();
		// Increase timeout for menu items
		await expect(page.getByRole('menuitem', { name: 'Inspect' })).toBeVisible({ timeout: 5000 });
		// Add checks for Remove if applicable (bridge network likely won't have Remove)
		// await expect(page.getByRole('menuitem', { name: 'Remove' })).not.toBeVisible(); // Example for bridge
	});

	test('should navigate to inspect page when "Inspect" is clicked', async ({ page }) => {
		// Use the 'bridge' network link
		const networkLink = page.getByRole('link', { name: 'bridge' });
		const networkName = await networkLink.textContent(); // Should be 'bridge'
		// const networkIdOrName = 'bridge'; // Docker often allows using name or ID - Removed as ID is dynamic

		await expect(networkLink).toBeVisible();
		await networkLink.click();

		// Verify navigation using RegExp for flexibility - Match /networks/ followed by any characters
		await expect(page).toHaveURL(new RegExp(`/networks/.+`), { timeout: 10000 });
		// Verify heading, adjusting if name isn't used in title
		await expect(page.getByRole('heading', { name: new RegExp(`.*${networkName}`) })).toBeVisible();
	});

	test('should allow selecting networks via checkboxes', async ({ page }) => {
		await page.waitForLoadState('networkidle');
		const bridgeRow = page.locator('tr', { has: page.getByRole('link', { name: 'bridge' }) });
		const firstCheckbox = bridgeRow.getByRole('checkbox');
		await expect(firstCheckbox).toBeVisible();
		await firstCheckbox.click();
		await expect(firstCheckbox).toBeChecked();
		await expect(page.getByRole('button', { name: 'Actions (1)' })).toBeVisible();
	});

	test('should show bulk delete action when networks are selected', async ({ page }) => {
		await page.waitForLoadState('networkidle');
		// Select the 'bridge' network (it won't be deletable, but we can test the UI)
		const bridgeRow = page.locator('tr', { has: page.getByRole('link', { name: 'bridge' }) });
		const checkbox = bridgeRow.getByRole('checkbox');

		// --- Checkbox Interaction Fix ---
		// Use check() for elements with role="checkbox" for better reliability
		await checkbox.check();
		// await page.waitForTimeout(100); // Optional small wait - usually not needed with check()

		await expect(checkbox).toBeChecked();

		const actionsButton = page.getByRole('button', { name: 'Actions (1)' });
		await expect(actionsButton).toBeVisible();
		await actionsButton.click();

		// Expect 'Delete Selected' to be visible, even if disabled for default networks
		await expect(page.getByRole('menuitem', { name: 'Delete Selected' })).toBeVisible({ timeout: 5000 });
		// Optionally check if it's disabled for the bridge network
		// await expect(page.getByRole('menuitem', { name: 'Delete Selected' })).toBeDisabled();
	});

	// --- More tests to consider ---
	// test('should successfully create a new network', async ({ page }) => { ... });
	// test('should successfully delete a network', async ({ page }) => { ... });
	// test('should successfully delete selected networks', async ({ page }) => { ... });
	// test('should show error toast when trying to delete a default network', async ({ page }) => { ... });
	// test('should show confirmation dialog before deleting', async ({ page }) => { ... });
	// test('should handle API errors gracefully (e.g., display error alert)', async ({ page }) => { ... });
	// test('should sort table when clicking headers', async ({ page }) => { ... });
	// test('should display empty state message when no networks exist', async ({ page }) => { ... });
});
