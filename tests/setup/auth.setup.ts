import { test as setup } from '@playwright/test';
import { skipOnboarding } from '../utils/onboarding.util';
import authUtil from '../utils/auth.util';

const authFile = '.auth/login.json';

setup('authenticate', async ({ page }) => {
  await skipOnboarding();

  await authUtil.login(page);

  await page.waitForURL('/dashboard');

  // Handle first-login password change if dialog appears
  // const passwordDialog = page.getByRole('dialog', { name: 'Change Default Password' });
  // const isPasswordChangeRequired = await passwordDialog.isVisible().catch(() => false);

  await authUtil.changeDefaultPassword(page, 'test-password-123');

  await page.context().storageState({ path: authFile });
});
