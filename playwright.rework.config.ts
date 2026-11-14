import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,webServer:process.env.CINDER_BASE_URL?undefined:{command:'node scripts/build-rework-harness.mjs && npm run preview',env:{CINDER_QA_MUTE:'1',CINDER_QA_HARNESS:'1'},url:'http://127.0.0.1:4175/games/cinder-shift/',reuseExistingServer:false},testMatch:/(rework-ui|cargo-equipment|archive-equipment|feedback-ui)\.spec\.ts$/,projects:[
 {name:'chromium',use:{browserName:'chromium'}},
 {name:'firefox',use:{browserName:'firefox',launchOptions:{}}},
 {name:'webkit',use:{browserName:'webkit',launchOptions:{}}}
]});
