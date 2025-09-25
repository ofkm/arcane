import { test, expect, type Page } from '@playwright/test';

type ConvertResponse = {
  success: boolean;
  dockerCompose: string;
  envVars: string;
  serviceName: string;
};

const ROUTES = {
  page: '/projects/new',
  apiConvert: '/api/environments/0/system/convert',
};

const SELECTORS = {
  dropdownTrigger: '[data-slot="dropdown-button-trigger"]',
  convertButton: (name = 'Convert to Compose') => ({ name }),
  textareaPlaceholder: 'docker run -d --name my-app -p 8080:80 nginx:alpine',
  stackNamePlaceholder: 'e.g., my-web-app',
  exampleButtonName: /docker run -d --name nginx/,
  successToast: 'Docker run command converted successfully!',
  exampleCommandExpected: 'docker run -d --name nginx -p 8080:80 -v nginx_data:/usr/share/nginx/html nginx:alpine',
  removeNewline: (s: string) => s.replace(/\r\n/g, '\n'),
};

async function openConvertFromDockerRun(page: Page) {
  await page.locator(SELECTORS.dropdownTrigger).first().click();
  await page.getByRole('menuitem', { name: 'Convert from Docker Run' }).click();
}

async function setupMockConvert(page: Page, payload: ConvertResponse) {
  await page.route(ROUTES.apiConvert, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

test.describe('Docker Run to Compose Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.page);
    await page.waitForLoadState('networkidle');
  });

  test('should convert simple docker run command', async ({ page }) => {
    await openConvertFromDockerRun(page);

    const dockerCommand = 'docker run -d --name nginx -p 8080:80 nginx:alpine';
    await page.getByPlaceholder(SELECTORS.textareaPlaceholder).fill(dockerCommand);

    await setupMockConvert(page, {
      success: true,
      dockerCompose: `services:
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - 8080:80`,
      envVars: '',
      serviceName: 'nginx',
    });

    await page.getByRole('button', SELECTORS.convertButton()).click();

    await expect(page.getByText(SELECTORS.successToast)).toBeVisible();

    await expect(page.getByPlaceholder(SELECTORS.stackNamePlaceholder)).toHaveValue('nginx');

    await expect(page.getByPlaceholder(SELECTORS.textareaPlaceholder)).toHaveValue('');
  });

  test('should convert docker run command with environment variables', async ({ page }) => {
    await openConvertFromDockerRun(page);
    await page.waitForTimeout(300);

    const dockerCommand =
      'docker run -d --name postgres -e POSTGRES_DB=mydb -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass postgres:15';
    await page.getByPlaceholder(SELECTORS.textareaPlaceholder).fill(dockerCommand);

    await setupMockConvert(page, {
      success: true,
      dockerCompose: `services:
  postgres:
    image: postgres:15
    container_name: postgres
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass`,
      envVars: 'POSTGRES_DB=mydb\nPOSTGRES_USER=user\nPOSTGRES_PASSWORD=pass',
      serviceName: 'postgres',
    });

    await page.getByRole('button', SELECTORS.convertButton()).click();

    await expect(page.getByText(SELECTORS.successToast)).toBeVisible();

    await expect(page.getByPlaceholder(SELECTORS.stackNamePlaceholder)).toHaveValue('postgres');
  });

  test('should use example commands', async ({ page }) => {
    await openConvertFromDockerRun(page);
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: SELECTORS.exampleButtonName }).first().click();

    await expect(page.getByPlaceholder(SELECTORS.textareaPlaceholder)).toHaveValue(SELECTORS.exampleCommandExpected);
  });

  test('should disable convert button when no command is entered', async ({ page }) => {
    await openConvertFromDockerRun(page);
    await page.waitForTimeout(300);

    const convertBtn = page.getByRole('button', SELECTORS.convertButton());

    await expect(convertBtn).toBeDisabled();

    await page.getByPlaceholder(SELECTORS.textareaPlaceholder).fill('docker run nginx');
    await expect(convertBtn).toBeEnabled();

    await page.getByPlaceholder(SELECTORS.textareaPlaceholder).clear();
    await expect(convertBtn).toBeDisabled();
  });

  test('should populate stack name only when empty', async ({ page }) => {
    await openConvertFromDockerRun(page);
    await page.waitForTimeout(300);

    await page.getByPlaceholder(SELECTORS.textareaPlaceholder).fill('docker run --name redis redis:alpine');

    await setupMockConvert(page, {
      success: true,
      dockerCompose: 'services:\n  redis:\n    image: redis:alpine',
      envVars: '',
      serviceName: 'redis',
    });

    await page.getByRole('button', SELECTORS.convertButton()).click();

    await expect(page.getByText(SELECTORS.successToast)).toBeVisible();

    await expect(page.getByPlaceholder(SELECTORS.stackNamePlaceholder)).toHaveValue('redis');
  });
});
