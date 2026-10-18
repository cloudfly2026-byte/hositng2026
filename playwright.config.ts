import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://app.velupi.com',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    navigationTimeout: 15000,
    actionTimeout: 10000,
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-features=NetworkService,NetworkServiceInProcess',
      ],
    },
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
