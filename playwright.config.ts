import { defineConfig } from '@playwright/test';
const executablePath=process.env.CHROME_PATH || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
export default defineConfig({
  testDir:'./tests',fullyParallel:false,workers:1,timeout:30000,
  use:{baseURL:'http://127.0.0.1:4175',headless:true,viewport:{width:1280,height:1000},launchOptions:{executablePath}},
  webServer:{command:'npm run preview',url:'http://127.0.0.1:4175/games/cinder-shift/',reuseExistingServer:true},
});
