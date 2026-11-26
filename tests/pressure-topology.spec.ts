import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {expect,test} from '@playwright/test';
import {rooms} from '../games/cinder-shift/src/room-data';
import {missions} from '../games/cinder-shift/src/session/missions';
import {pressureCapacity,pressurePresets,pressureStations} from '../games/cinder-shift/src/session/mission-pressure';
import {createWorldState,worldSolids} from '../games/cinder-shift/src/session/world-runtime';
import baseline from '../docs/cinder-shift/pressure-survival-baseline.json' with {type:'json'};

test('pressure topology lists every playable room and checks charger support',async({},info)=>{
 const topology=Object.values(missions).map(mission=>({
  mission:mission.id,
  rooms:mission.rooms.map(id=>{
   const definition=rooms[id],world=definition.world;
   const solids=[...definition.solids,...(world?worldSolids(world,createWorldState(id,world)):[])];
   const station=pressureStations[id]??null;
   if(station&&station.y<320)expect(solids.some(s=>s.y===station.y&&s.x<=station.x&&s.x+s.width>=station.x)).toBe(true);
   return {
    id,
    edges:{back:definition.previous??null,forward:definition.next??null,
      ...(id==='M3F'?{forward:['M3B','M3C']}:{}),...(id==='M3K'?{back:['M3H','M3J']}:{}),
    },
    solids,station,
    hazards:definition.hazards??[],
    objectives:{terminal:definition.terminal??null,kind:definition.terminalKind??null,power:definition.powerSwitch??null,
      cell:definition.cell??null,carrier:definition.dataCarrier??null,world:world??null},
    enemies:definition.enemies.map(enemy=>({id:enemy.id,kind:enemy.kind,after:enemy.afterEnemy??null})),
    optional:{repair:definition.repair??null,cache:definition.cache??null},
   };
  }),
 }));
 expect(topology).toHaveLength(15);
 expect(new Set(topology.flatMap(mission=>mission.rooms.map(room=>room.id))).size).toBe(84);
 const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 await writeFile(info.outputPath('topology-audit.json'),JSON.stringify({source,scope:'Authored topology inventory. Reachability and measured route budgets require ordinary-input evidence.',topology},null,2));
 const budgets=Object.entries(pressureCapacity).flatMap(([mission,capacity])=>Object.entries(pressurePresets).map(([difficulty,preset])=>({
   mission,difficulty,capacity,charge:capacity*preset.charge,drain:preset.drain,volley:preset.volley,lives:preset.lives,
 })));
 expect(budgets).toHaveLength(45);
 await writeFile(info.outputPath('pressure-budgets.json'),JSON.stringify({source,status:'PROVISIONAL',historical_input:baseline.measurement_source,budgets},null,2));
});
