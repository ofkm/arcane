import { test, expect } from '@playwright/test';

test.describe('Docker Run to Compose Converter', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the new stack page
		await page.goto('/compose/new');
		await page.waitForLoadState('networkidle');
	});

	test('should display converter section', async ({ page }) => {
		// Check if the converter dropdown card is visible
		await expect(page.getByText('Docker Run to Compose Converter')).toBeVisible();
		await expect(page.getByText('Convert existing docker run commands to Docker Compose format')).toBeVisible();
	});

	test('should convert simple docker run command', async ({ page }) => {
		await page.waitForLoadState('networkidle');
		// Expand converter
		await page.getByText('Docker Run to Compose Converter').click();
		await page.waitForTimeout(300);

		// Enter a simple docker run command using the textarea
		const dockerCommand = 'docker run -d --name nginx -p 8080:80 nginx:alpine';
		await page.getByPlaceholder('docker run -d --name my-app -p 8080:80 nginx:alpine').fill(dockerCommand);

		// Mock the API response
		await page.route('/api/convert', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					dockerCompose: `services:
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - 8080:80`,
					envVars: '',
					serviceName: 'nginx'
				})
			});
		});

		// Click convert button
		await page.getByRole('button', { name: 'Convert to Compose' }).click();

		// Wait for success toast
		await expect(page.getByText('Docker run command converted successfully!')).toBeVisible();

		// Check if stack name was populated
		await expect(page.getByPlaceholder('e.g., my-web-app')).toHaveValue('nginx');

		// Check if docker run command was cleared
		await expect(page.getByPlaceholder('docker run -d --name my-app -p 8080:80 nginx:alpine')).toHaveValue('');
	});

	test('should convert docker run command with environment variables', async ({ page }) => {
		// Expand converter
		await page.getByText('Docker Run to Compose Converter').click();
		await page.waitForTimeout(300);

		// Enter docker run command with environment variables
		const dockerCommand = 'docker run -d --name postgres -e POSTGRES_DB=mydb -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass postgres:15';
		await page.getByPlaceholder('docker run -d --name my-app -p 8080:80 nginx:alpine').fill(dockerCommand);

		// Mock the API response
		await page.route('/api/convert', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
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
					serviceName: 'postgres'
				})
			});
		});

		// Click convert button
		await page.getByRole('button', { name: 'Convert to Compose' }).click();

		// Wait for success toast
		await expect(page.getByText('Docker run command converted successfully!')).toBeVisible();

		// Check if stack name was populated
		await expect(page.getByPlaceholder('e.g., my-web-app')).toHaveValue('postgres');
	});

	test('should use example commands', async ({ page }) => {
		// Expand converter
		await page.getByText('Docker Run to Compose Converter').click();
		await page.waitForTimeout(300);

		// Click on the first example command (using a more specific selector)
		await page
			.getByRole('button', { name: /docker run -d --name nginx/ })
			.first()
			.click();

		// Check if the command was populated in the textarea
		const expectedCommand = 'docker run -d --name nginx -p 8080:80 -v nginx_data:/usr/share/nginx/html nginx:alpine';
		await expect(page.getByPlaceholder('docker run -d --name my-app -p 8080:80 nginx:alpine')).toHaveValue(expectedCommand);
	});

	test('should handle API error gracefully', async ({ page }) => {
		// Expand converter
		await page.getByText('Docker Run to Compose Converter').click();
		await page.waitForTimeout(300);

		// Enter a docker run command
		await page.getByPlaceholder('docker run -d --name my-app -p 8080:80 nginx:alpine').fill('docker run nginx:alpine');

		// Mock API error response
		await page.route('/api/convert', async (route) => {
			await route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					error: 'Failed to parse docker run command. Please check the syntax.',
					code: 'BAD_REQUEST'
				})
			});
		});

		// Click convert button
		await page.getByRole('button', { name: 'Convert to Compose' }).click();

		// Check for error toast
		await expect(page.getByText('Failed to Convert Docker Run Command')).toBeVisible();
	});

	test('should disable convert button when no command is entered', async ({ page }) => {
		// Expand converter
		await page.getByText('Docker Run to Compose Converter').click();
		await page.waitForTimeout(300);

		// Check that convert button is disabled when textarea is empty
		await expect(page.getByRole('button', { name: 'Convert to Compose' })).toBeDisabled();

		// Enter some text
		await page.getByPlaceholder('docker run -d --name my-app -p 8080:80 nginx:alpine').fill('docker run nginx');

		// Check that convert button is now enabled
		await expect(page.getByRole('button', { name: 'Convert to Compose' })).toBeEnabled();

		// Clear the text
		await page.getByPlaceholder('docker run -d --name my-app -p 8080:80 nginx:alpine').clear();

		// Check that convert button is disabled again
		await expect(page.getByRole('button', { name: 'Convert to Compose' })).toBeDisabled();
	});

	test('should populate stack name only when empty', async ({ page }) => {
		// Expand converter
		await page.getByText('Docker Run to Compose Converter').click();
		await page.waitForTimeout(300);

		// Enter docker run command with name
		await page.getByPlaceholder('docker run -d --name my-app -p 8080:80 nginx:alpine').fill('docker run --name redis redis:alpine');

		// Mock the API response
		await page.route('/api/convert', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					dockerCompose: 'services:\n  redis:\n    image: redis:alpine',
					envVars: '',
					serviceName: 'redis'
				})
			});
		});

		// Click convert button
		await page.getByRole('button', { name: 'Convert to Compose' }).click();

		// Wait for success
		await expect(page.getByText('Docker run command converted successfully!')).toBeVisible();

		// Check that stack name was populated from service name
		await expect(page.getByPlaceholder('e.g., my-web-app')).toHaveValue('redis');
	});
});
