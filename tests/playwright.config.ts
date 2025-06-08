import { defineConfig, devices } from '@playwright/test';

const authFile = 'tests/.auth/login.json';

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [['html', { outputFolder: 'tests/.report' }], ['github']] : [['line'], ['html', { open: 'never', outputFolder: 'tests/.report' }]],
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
		video: 'retain-on-failure'
	},
	projects: [
		{ name: 'setup', testMatch: /.*\.setup\.ts/ },
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], storageState: authFile },
			dependencies: ['setup']
		}
	],
	webServer: {
		command: 'APP_ENV=TEST npm run dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
		env: {
			APP_ENV: 'TEST'
		}
	}
});
