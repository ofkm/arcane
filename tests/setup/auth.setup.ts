import { test as setup, expect } from '@playwright/test';
import { skipOnboarding } from '../utils/onboarding.util';

const authFile = '.auth/login.json';

setup('authenticate', async ({ page }) => {
  await skipOnboarding();

  await page.goto('/auth/login');
  await page.getByLabel('Username').fill('arcane');
  await page.getByLabel('Password').fill('arcane-admin');
  await page.getByRole('button', { name: 'Sign in to Arcane', exact: true }).click();

  await expect(page).toHaveURL('/dashboard');

  await page.context().storageState({ path: authFile });
  console.log(`Authentication state saved to ${authFile}`);
});
