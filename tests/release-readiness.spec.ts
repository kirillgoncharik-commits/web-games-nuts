import {expect,test} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {cacheInReach,terminalInReach} from '../games/cinder-shift/src/interactions';
import {fitSprite,coverSprite} from '../games/cinder-shift/src/art/placement';
import manifest from '../games/cinder-shift/public/assets/art-refresh-v1/runtime-manifest.json' with {type:'json'};
import {state} from './helpers';

const origin='https://nuts.bid';
const basePath='/games/cinder-shift/';
const productionCsp="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

for(const width of [667,844])test(`release shell preserves focus and consent at ${width}px under production CSP`,async({browser,baseURL},info)=>{
  const height=width===667?300:390;
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});
  const requests:string[]=[];
  try{
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin===origin){
        const response=await context.request.get(new URL(url.pathname+url.search,baseURL).href);
        await route.fulfill({response,headers:{...response.headers(),'content-security-policy':productionCsp}});
      }else{
        requests.push(url.href);
        await route.fulfill({status:200,contentType:'text/javascript',body:''});
      }
    });
    await context.addInitScript(()=>{
      const probe=window as typeof window&{qaCsp:string[]};
      probe.qaCsp=[];
      document.addEventListener('securitypolicyviolation',event=>probe.qaCsp.push(event.violatedDirective+' '+event.blockedURI+' '+event.sourceFile));
    });
    const page=await context.newPage();
    await page.goto(origin+basePath);
    const button=(id:string)=>page.getByTestId(id);
    const consent=()=>page.evaluate(()=>localStorage.getItem('nuts_analytics_consent_v1'));
    const events=()=>page.evaluate(()=>((window as any).dataLayer??[]).filter((entry:any)=>entry[0]==='event').length);
    const csp=()=>page.evaluate(()=>(window as any).qaCsp as string[]);
    const geometry=async()=>{
      expect(await page.evaluate(()=>[window.scrollY,document.body.scrollTop,document.documentElement.scrollTop])).toEqual([0,0,0]);
      const stage=(await page.locator('#viewport').boundingBox())!;
      expect(stage.y).toBeGreaterThanOrEqual(0);
      expect(stage.y+stage.height).toBeLessThanOrEqual(height+1);
    };

    await expect(button('new-shift')).toBeFocused();
    expect(await consent()).toBeNull();
    await geometry();
    await button('menu-privacy').tap();
    await expect(button('analytics-decline')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button('analytics-accept')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(button('menu-privacy')).toBeFocused();
    expect(await consent()).toBe('denied');
    expect(requests).toEqual([]);
    expect(await events()).toBe(0);
    expect(await csp()).toEqual([]);
    await page.reload();
    await expect(button('new-shift')).toBeFocused();
    expect(await consent()).toBe('denied');
    await button('menu-settings').click();
    await button('settings-privacy').click();
    await button('analytics-accept').tap();
    await expect(button('settings-privacy')).toBeFocused();
    await expect.poll(()=>requests.filter(url=>url.includes('/gtag/js')).length).toBe(1);
    await button('settings-back').tap();
    await button('training').tap();
    await expect.poll(async()=>(await state(page)).state).toBe('playing');
    await expect(page.locator('#hud-pause')).toBeInViewport();
    await geometry();
    await page.locator('#hud-pause').tap();
    await button('pause-menu').tap();
    expect(await events()).toBeGreaterThan(0);
    expect(await csp()).toEqual([]);
    await page.reload();
    await expect(button('new-shift')).toBeFocused();
    expect(await consent()).toBe('granted');
    await button('menu-privacy').click();
    await button('analytics-decline').click();
    const sent=await events();
    await button('new-shift').tap();
    await button('choose-mira').tap();
    const pins=page.locator('.map-pin');
    for(const pin of await pins.all()){
      await pin.tap();
      await expect(pin).toHaveAttribute('aria-pressed','true');
      const box=(await pin.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      await pin.focus();
      await page.keyboard.press('Enter');
      await expect(pin).toHaveAttribute('aria-pressed','true');
    }
    expect(await events()).toBe(sent);
    expect(await consent()).toBe('denied');
    await geometry();
    expect(await csp()).toEqual([]);
    await info.attach('strict-csp', {body:JSON.stringify({width,height,requests,violations:await csp()}),contentType:'application/json'});
  }finally{
    await context.close();
  }
});

test('Archive interaction boundaries and atlas placement use room coordinates',()=>{
  const data=rooms.M4C.terminal!,cache=rooms.M4B.cache!,window=rooms.M5E.window!;
  expect(terminalInReach(data.x,data.y-18,data)).toBe(false);
  expect(terminalInReach(data.x,data.y-16,data)).toBe(true);
  expect(terminalInReach(data.x+34,data.y,data)).toBe(false);
  expect(cacheInReach(cache.x,cache.y,cache)).toBe(true);
  expect(cacheInReach(cache.x,cache.y+12,cache)).toBe(false);
  const frame='terminal_data-ready';
  const cropped=coverSprite(frame,window.width,window.height);
  expect(cropped.width*cropped.scale).toBeCloseTo(window.width);
  expect(cropped.height*cropped.scale).toBeCloseTo(window.height);
  const boss='regulator_exposed';
  const fit=fitSprite(boss,96,112,'bottom');
  const meta=manifest.frames[boss];
  expect(fit.originY*meta.source_canvas[1]).toBeCloseTo(meta.opaque_bounds.y+meta.opaque_bounds.height);
});
