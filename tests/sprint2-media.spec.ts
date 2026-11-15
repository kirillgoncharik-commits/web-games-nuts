import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {campaignJourney} from './campaign-journey';
import {installMediaCapture,startMedia,finishMedia} from './runtime-media';

const rooms=[["airlock","A"],["airlock","B"],["airlock","M1A"],["airlock","M1B"],["airlock","M1C"],["airlock","C"],["cargo","D"],["cargo","M2A"],["cargo","E"],["cargo","M2B"],["cargo","M2C"],["cargo","M2D"],["cargo","F"],["cargo","M2E"],["cargo","G"],["foundry","M3A"],["foundry","M3E"],["foundry","M3F"],["foundry","M3B"],["foundry","M3G"],["foundry","M3H"],["foundry","M3C"],["foundry","M3I"],["foundry","M3J"],["foundry","M3K"],["foundry","M3D"],["archive","M4A"],["archive","M4E"],["archive","M4B"],["archive","M4F"],["archive","M4G"],["archive","M4H"],["archive","M4C"],["archive","M4I"],["archive","M4D"],["reactor","M5A"],["reactor","M5F"],["reactor","M5B"],["reactor","M5G"],["reactor","M5H"],["reactor","M5I"],["reactor","M5C"],["reactor","M5D"],["reactor","M5E"]] as const;
for(const [mission,room] of rooms)test(`RW2 atlas ${mission} ${room}`,async({page},info)=>{
 test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await installMediaCapture(page);await encounter(page,{mission,room});await startMedia(page);
 await page.waitForTimeout(1200);await page.keyboard.down('j');await page.keyboard.down('d');await page.waitForTimeout(450);await page.keyboard.up('d');await page.keyboard.up('j');await page.waitForTimeout(350);
 const snapshot=await state(page);expect(snapshot.room).toBe(room);expect(snapshot.hp).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('room.png')});const audio=await finishMedia(page,info,'runtime');
 expect(errors).toEqual([]);await writeFile(info.outputPath('room.json'),JSON.stringify({mission,room,fixture:'one_room_entry_only_then_trusted_input',audio,snapshot},null,2));
});
test('RW2 audible fresh-profile C01 journey',async({page},info)=>{
 test.setTimeout(900000);await installMediaCapture(page);
 await campaignJourney(page,info,{started:()=>startMedia(page),beforeReload:async()=>{const audio=await finishMedia(page,info,'c01-full-runtime');console.log('CINDER_RW2_C01_AUDIO '+JSON.stringify(audio));}});
});
