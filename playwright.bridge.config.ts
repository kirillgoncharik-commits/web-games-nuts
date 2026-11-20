import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:/platform-playgama\.spec\.ts$/,workers:1,timeout:45000,
 use:{video:'retain-on-failure',trace:'retain-on-failure',baseURL:'http://127.0.0.1:4199',headless:true,viewport:{width:1280,height:1000},locale:'ru-RU',launchOptions:{executablePath:process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined,args:['--mute-audio']}},
 webServer:{command:'node scripts/serve.mjs',env:{PORT:'4199',CINDER_QA_MUTE:'1'},url:'http://127.0.0.1:4199/games/cinder-shift/',reuseExistingServer:false}
});
