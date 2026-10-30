import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const systemBrowser = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (process.platform === 'win32' ? [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync) : undefined);
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', launchOptions: systemBrowser ? { executablePath: systemBrowser } : {} },
  projects: [
    { name: 'chromium', testIgnore: '**/volatility.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'account', testMatch: '**/volatility.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' } },
  ],
  webServer: [
    { command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, env: { VITE_DEMO_MODE: 'true', VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' } },
    { command: 'npm run dev -- --port 4174 --strictPort', url: 'http://127.0.0.1:4174', reuseExistingServer: false, env: { VITE_DEMO_MODE: 'false', VITE_SUPABASE_URL: 'https://test-project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_tests_only' } },
  ],
});
