import * as path from 'path';

import { defineConfig } from '@playwright/test';

import config from '../playwright.config';

// Opt-in selection, with the shared login/configuration rules and spoke-owned cleanup.
export default defineConfig({
  ...config,
  globalSetup: path.resolve(__dirname, 'project-dependencies/acm.setup.ts'),
  globalTeardown: undefined,
  projects: [
    {
      name: 'ACM',
      testDir: path.resolve(__dirname, 'tests/virtual-machines/list'),
      testMatch: 'acm-fleet-baseline.spec.ts',
      use: {
        ...config.projects![0].use,
        viewport: { height: 1080, width: 1920 },
      },
    },
  ],
  retries: 0,
  workers: 1,
});
