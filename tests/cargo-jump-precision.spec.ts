import {test,expect} from '@playwright/test';
import {encounter} from './encounter-helpers';
import {state} from './helpers';
import {jump,standingJump,to,ground} from './route-helpers';

for(const delay of [0,150,300])test(`Cargo reverse-ledged climb tolerates ${delay} ms keyboard transport delay`,async({page})=>{
 test.setTimeout(45000);
 await encounter(page,{mission:'cargo',room:'M2B',cleared:true});
 await jump(page,114,208);await ground(page,320);await jump(page,212,172);await ground(page,288);
 await to(page,178);await ground(page,288);
 const keyboard=page.keyboard,down=keyboard.down.bind(keyboard);
 keyboard.down=async key=>{if(delay)await page.waitForTimeout(delay);await down(key);};
 try{await standingJump(page,280);await ground(page,256);}finally{keyboard.down=down;}
 const s=await state(page);expect(s.hp).toBe(6);expect(s.player.y+22).toBe(256);
 console.log('Keyboard shelf report',JSON.stringify({source_sha:s.sha,delay_ms:delay,player:s.player,hp:s.hp,fixture:'one Cargo M2B entry; all movement uses trusted keyboard input'}));
});
