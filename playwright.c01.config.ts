import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:/c01-playtest(?:-model)?\.spec\.ts$/,workers:1,timeout:60000,expect:{timeout:16000},
 use:{baseURL:process.env.CINDER_BASE_URL||'http://127.0.0.1:4186',headless:true,locale:'ru-RU',viewport:{width:1280,height:1000},video:'retain-on-failure',launchOptions:{executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),args:['--mute-audio']}},
 webServer:process.env.CINDER_BASE_URL?undefined:{command:'node scripts/serve.mjs',env:{PORT:'4186',PREVIEW_ROOT:'dist/c01-playtest',CINDER_QA_MUTE:'1'},url:'http://127.0.0.1:4186',reuseExistingServer:false},
});
