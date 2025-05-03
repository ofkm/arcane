import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/.auth/login.json';

setup('authenticate', async ({ page }) => {
	await page.goto('/auth/login');
	await page.getByLabel('Username').fill('arcane');
	await page.getByLabel('Password').fill('arcane-admin');
	await page.getByRole('button', { name: 'Sign In' }).click();

	await expect(page).toHaveURL('/');

	await page.context().storageState({ path: authFile });
	console.log(`Authentication state saved to ${authFile}`);
});
