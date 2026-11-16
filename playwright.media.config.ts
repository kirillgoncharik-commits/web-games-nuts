import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:/sprint2-media\.spec\.ts$/,testIgnore:[],timeout:60000,use:{...base.use,viewport:{width:1280,height:844}},projects:[{name:'chromium',use:{browserName:'chromium'}}],webServer:{...base.webServer!,env:{CINDER_QA_MUTE:'0',CINDER_QA_HARNESS:'1'}}});
