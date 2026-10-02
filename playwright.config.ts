import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3102',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) },
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3102/api/health',
    reuseExistingServer: false,
    env: { PORT: '3102', TRILINGUO_DB: path.join(tmpdir(), `trilinguo-e2e-${randomUUID()}`, 'progress.sqlite') },
  },
});
