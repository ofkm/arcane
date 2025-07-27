import playwrightConfig from '../playwright.config';

export async function skipOnboarding() {
  const url = new URL('/api/playwright/skip-onboarding', playwrightConfig.use!.baseURL);

  const response = await fetch(url, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to skip onboarding: ${response.status} ${response.statusText}`);
  }
}
