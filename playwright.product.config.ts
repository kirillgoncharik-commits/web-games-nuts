import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,use:{...base.use,video:process.env.CINDER_RECORD_VIDEO==='1'?'on':'retain-on-failure',trace:'retain-on-failure'},testMatch:/(personal-records-(model|ui|transport)|radio-station)\.spec\.ts$/,projects:[
 {name:'chromium',use:{browserName:'chromium'}},
 {name:'firefox',use:{browserName:'firefox',launchOptions:{}}},
 {name:'webkit',use:{browserName:'webkit',launchOptions:{}}}
]});
