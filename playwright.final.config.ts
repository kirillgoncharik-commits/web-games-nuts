import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testIgnore:[],testMatch:/final-worlds\.spec\.ts$/,timeout:45000,webServer:process.env.CINDER_BASE_URL?undefined:{command:'npm run preview',env:{CINDER_QA_MUTE:'1'},url:'http://127.0.0.1:4175/games/cinder-shift/',reuseExistingServer:false}});
