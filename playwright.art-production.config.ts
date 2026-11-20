import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,webServer:undefined,testMatch:/art-production\.spec\.ts$/,timeout:120000,use:{...base.use,baseURL:'http://cinder.local',video:'retain-on-failure'},projects:[{name:'chromium',use:{browserName:'chromium'}}]});
