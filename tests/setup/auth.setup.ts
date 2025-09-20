import { test as setup } from '@playwright/test';
import { skipOnboarding } from '../utils/onboarding.util';
import authUtil from '../utils/auth.util';

const authFile = '.auth/login.json';

setup('authenticate', async ({ page }) => {
  await skipOnboarding();

  await authUtil.login(page);

  await page.waitForURL('/dashboard');

  await page.context().storageState({ path: authFile });
});
