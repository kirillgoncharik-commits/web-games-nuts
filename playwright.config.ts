import { defineConfig } from '@playwright/test';
const executablePath=process.env.CHROME_PATH || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
export default defineConfig({
  testDir:'./tests',fullyParallel:false,workers:1,timeout:30000,
  use:{baseURL:process.env.CINDER_BASE_URL||'http://127.0.0.1:4175',headless:true,viewport:{width:1280,height:1000},launchOptions:{executablePath}},
  projects:[
    {name:'chromium',use:{browserName:'chromium'}},
    ...(process.env.CROSS_BROWSER==='1'?[
      {name:'firefox',testMatch:'mission.spec.ts',grep:/A to B to C|focus returns/,use:{browserName:'firefox' as const,launchOptions:{}}},
      {name:'webkit',testMatch:'mission.spec.ts',grep:/A to B to C|focus returns/,use:{browserName:'webkit' as const,launchOptions:{}}},
    ]:[]),
  ],
  webServer:process.env.CINDER_BASE_URL?undefined:{command:'npm run preview',url:'http://127.0.0.1:4175/games/cinder-shift/',reuseExistingServer:true},
});
