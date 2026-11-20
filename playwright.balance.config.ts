import {defineConfig} from '@playwright/test';
import base from './playwright.config';
import {difficulties} from './games/cinder-shift/src/session/difficulty';

export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: /(?:campaign-route|final-world-routes)\.spec\.ts$/,
  fullyParallel: true,
  projects: difficulties.map(difficulty => ({
    name: difficulty, metadata: {difficulty}, use: {browserName: 'chromium'},
  })),
  webServer: process.env.CINDER_BASE_URL ? undefined : {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4175/games/cinder-shift/',
    env: {CINDER_QA_MUTE: '1'},
  },
});
