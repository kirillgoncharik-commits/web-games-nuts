import {encounter} from './encounter-helpers';
import {jump} from './route-helpers';
import {state} from './helpers';
import en from '../games/cinder-shift/src/i18n/en.json' with {type:'json'};
import ru from '../games/cinder-shift/src/i18n/ru.json' with {type:'json'};
import {worldEnemyProfiles} from '../games/cinder-shift/src/world-enemies';
import {expect,test} from '@playwright/test';
import {Campaign,contentVersion,newCampaign,newWorldCampaign} from '../games/cinder-shift/src/session/campaign';
import {difficulties} from '../games/cinder-shift/src/session/difficulty';
import {validateSave,validateWorldSave} from '../games/cinder-shift/src/session/save';
import {newCampaignIds} from '../games/cinder-shift/src/session/new-campaign-content';
import {MissionAttempt,rooms} from '../games/cinder-shift/src/mission';
import {createEnemy,enemyRect,stepEnemy} from '../games/cinder-shift/src/enemies';
import {intersects} from '../games/cinder-shift/src/geometry';
import {Projectiles} from '../games/cinder-shift/src/projectiles';
import {worldSolids,createWorldState} from '../games/cinder-shift/src/session/world-runtime';

for (const world of ['r01', ...newCampaignIds] as const) {
  test(`${world} persists all three difficulties and escalates combat`, () => {
    const warnings:number[]=[];
    for (const [index,difficulty] of difficulties.entries()) {
      const campaign=new Campaign(world==='r01'?newCampaign(4,difficulty):newWorldCampaign(world,4,difficulty));
      const entry=campaign.prepare();
      expect(entry.max_hp).toBe(6);
      const attempt=new MissionAttempt('mission',entry);
      const envelope={schema_version:1,content_version:world==='r01'?contentVersion:'worlds-rw3.1',
        game_id:world,build_id:'balance-check',saved_at:new Date().toISOString(),campaign:campaign.snapshot()};
      const validate=()=>world==='r01'?validateSave(envelope):validateWorldSave(envelope,world);
      expect(validate()).toBeNull();
      expect(attempt.damage(100,'turret-shot')).toBe(true);
      expect(attempt.maxHp-attempt.hp).toBe(index===0?1:2);
      expect(attempt.damage(101,'walker-shot')).toBe(false);
      const contact=new MissionAttempt('mission',entry);
      contact.damage(100,'walker-contact');
      expect(contact.maxHp-contact.hp).toBe(1);
      const regular=new MissionAttempt('mission',entry);
      regular.damage(100,'walker-shot');
      expect(regular.maxHp-regular.hp).toBe(index===2?2:1);
      expect(campaign.prepare()).toEqual(entry);
      if (difficulty==='easy') {
        delete envelope.campaign.difficulty;
        delete envelope.campaign.entry!.difficulty;
        expect(validate()).toBeNull();
      }
      const enemy=createEnemy({id:'patrol',x:250,y:292,end:{x:250,y:292},activateX:140,kind:'drone',preset:'drone_service'});
      const shots=new Projectiles();
      let attacks=0;
      for(let t=0;t<120000;t+=20)stepEnemy(enemy,20,{x:190,y:292},[],shots,()=>attacks++,1,true,attempt.balance.aggression);
      warnings.push(attacks);
    }
    expect(warnings[1]).toBeGreaterThan(warnings[0]);
    expect(warnings[2]).toBeGreaterThan(warnings[1]);
  });
}

test('world patrols have clear spawn positions and every mission has combat',()=>{
  for (const world of newCampaignIds) {
    const prefix=world==='c02-small-world'?'SW':'YU';
    const campaignRooms=Object.values(rooms).filter(room=>room.id.startsWith(prefix));
    expect(campaignRooms).toHaveLength(20);
    expect(campaignRooms.filter(room=>room.enemies.length>0)).toHaveLength(prefix==='SW'?19:20);
    expect(campaignRooms.reduce((total,room)=>total+room.enemies.length,0)).toBe(prefix==='SW'?36:43);
    for (let sector=1;sector<=5;sector++) {
      const group=Object.values(rooms).filter(room=>room.id.startsWith(prefix+'0'+sector));
      expect(group.some(room=>room.enemies.length>0)).toBe(true);
      for(const room of group) {
        const initial=createWorldState(room.id,room.world!);
        const states=initial.power?[initial,{...initial,power:{...initial.power,circuit:'B' as const}}]:[initial];
        for(const state of states){
          const solids=[...room.solids,...worldSolids(room.world!,state)];
          for(const def of room.enemies){
            const body=enemyRect(createEnemy(def));
            expect.soft(solids.filter(rect=>intersects(rect,body)),[room.id,state.power?.circuit,def.id].join(' / ')).toEqual([]);
          }
        }
      }
    }
  }
});

test('all campaign damage sources have a readable result in both languages',()=>{
 const causes=[
  ...Object.keys(worldEnemyProfiles).map(mob=>mob+'-shot'),
  ...['walker','drone','turret'].flatMap(kind=>[kind+'-shot',kind+'-contact']),
  'security-aimed-shot','press','heat','regulator-contact','regulator-beam',
  'world-pulse','world-water','world-load','world-scan','world-steam','world-traction',
 ];
 for(const catalog of [en,ru])for(const cause of causes){
  expect(catalog,'result for '+cause).toHaveProperty(['results.reason.'+cause],expect.any(String));
 }
});

test('a world robot kill shows its cause and partial score on the result screen',async({page})=>{
 // One-HP room entry fixture. The enemies use their normal AI and projectiles.
 await encounter(page,{mission:'YU01',room:'YU01-D',difficulty:'hard',seed:4,hp:1});
 await jump(page,142,232);
 await expect(page.getByTestId('retry')).toBeVisible({timeout:16000});
 const result=(await state(page)).campaign.result;
 expect(result.result).toBe('death');
 expect(['induction-orb-shot','relay-crawler-shot']).toContain(result.reason);
 const catalog:Record<string,string>=(await page.locator('html').getAttribute('lang'))==='ru'?ru:en;
 await expect(page.getByText(catalog['results.reason'].replace('{reason}',catalog['results.reason.'+result.reason]),{exact:true})).toBeVisible();
 expect(result.score_breakdown.extraction).toBe(0);
 expect(result.score).toBe(result.score_breakdown.rooms);
});
