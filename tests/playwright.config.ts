import { defineConfig, devices } from "@playwright/test";

const authFile = ".auth/login.json"; // Adjusted path

export default defineConfig({
  testDir: ".", // Adjusted path: current directory
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { outputFolder: ".report" }], ["github"]] // Adjusted path
    : [["line"], ["html", { open: "never", outputFolder: ".report" }]], // Adjusted path
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command:
      "docker-compose -f ../docker-compose.test.yml up --build --abort-on-container-exit", // Path is relative to tests dir, so ../ is correct
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
