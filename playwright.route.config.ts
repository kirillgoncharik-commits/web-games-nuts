import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:/(foundry|cargo|archive|reactor)-route\.spec\.ts$/,projects:[{name:'chromium',use:{browserName:'chromium'}}]});
