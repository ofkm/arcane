import { test as setup } from '@playwright/test';
import { skipOnboarding } from '../utils/onboarding.util';
import authUtil from '../utils/auth.util';

const authFile = '.auth/login.json';

setup('authenticate', async ({ page }) => {
  await skipOnboarding(); // Deprecated

  await authUtil.login(page);

  await page.waitForURL('/dashboard');

  await authUtil.changeDefaultPassword(page, 'test-password-123');

  await page.context().storageState({ path: authFile });
});
