import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'rework-ui.spec.ts',projects:[
 {name:'chromium',use:{browserName:'chromium'}},
 {name:'firefox',use:{browserName:'firefox',launchOptions:{}}},
 {name:'webkit',use:{browserName:'webkit',launchOptions:{}}}
]});
