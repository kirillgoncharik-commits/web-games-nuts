import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testIgnore:[],testMatch:/sprint3-(model|ui|world)\.spec\.ts$/,webServer:process.env.CINDER_BASE_URL?undefined:[
 {command:'npm run preview',env:{CINDER_QA_MUTE:'1'},url:'http://127.0.0.1:4175/games/cinder-shift/',reuseExistingServer:false},
 {command:'node scripts/build-world-harness.mjs && node scripts/serve.mjs',env:{PORT:'4177',PREVIEW_ROOT:'qa-work/world-harness'},url:'http://127.0.0.1:4177/',reuseExistingServer:false}
]});
