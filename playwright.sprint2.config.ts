import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:/sprint2-presentation\.spec\.ts$/,use:{...base.use,viewport:{width:1280,height:844}},projects:[{name:'chromium',use:{browserName:'chromium'}}]});
