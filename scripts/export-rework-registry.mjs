import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';

const root='games/cinder-shift/';
const configText=await readFile(root+'game.config.json','utf8'),config=JSON.parse(configText);
const inputs=await Promise.all(['src/room-data.ts','src/session/missions.ts','src/boss.ts','src/enemies.ts','src/cargo-equipment.ts','src/mission.ts'].map(path=>readFile(root+path,'utf8')));
async function dataModule(source){
 const replaced=source.replace(/^import config from .*?;\s*/m,'const config='+JSON.stringify(config)+';\n');
 assert.notEqual(replaced,source,'Expected the explicit game config import');
 const code=stripTypeScriptTypes(replaced,{mode:'strip'});
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
const {rooms}=await dataModule(inputs[0]),{missions}=await dataModule(inputs[1]);
const examples={
 D:['C01','Clear the receiving dock security before entering the loading gallery.'],
 M2A:['C02','Change firing height in the loading gallery.'],
 E:['C03','Use cover during the turret warning and burst, then fire into exposure.'],
 M2B:['C04','Clear the mandatory lower lane; upper salvage remains optional.'],
 M2C:['C05','Choose the next bay’s conveyor or guard-turret power at the real console.'],
 M2D:['C06','Use the chosen power: a left-pulling floor conveyor or a powered cycling turret.'],
 F:['C07','Collect the energy cell; E01 and relay support retain their own shutter/turret rules.'],
 M2E:['C08','Use one R02 repair if needed, then install the energy cell.'],
 G:['C09','Clear the perimeter after installation and confirm the sector exit.'],
 M3A:['F01','Dodge the first charge, then fire during the exposed engine recovery.'],
 M3E:['F02','Choose press or furnace power at the console before combining the ram and drone.'],
 M3F:['F03','Defeat security, isolate power, then choose one mutually exclusive route.'],
 M3B:['FS04','Change firing height to clear the service walker and landing-control drone.'],
 M3G:['FS05','Use the two firing platforms against drones; upper salvage is optional.'],
 M3H:['FS06','Use cover against security and the cycling turret; the thin panel is optional.'],
 M3C:['FP04','Cross the warned press from a safe side and counter the ram in recovery.'],
 M3I:['FP05','Cross the heat window and separate the airborne and ground firing lines.'],
 M3J:['FP06','Use the raised platform between offset presses and counter the ram.'],
 M3K:['F07','Take the one-use R03 repair if needed; activate cooling before the exit.'],
 M3D:['F08','Clear the ram and drone from separate firing heights, then hold the exit terminal.'],
 M5D:['R08/R09','Dodge locked lanes, fire into the raised chest aperture, then evade the moving sweep.']
};
const roles={walker_service:'line holder: use cover or crouch',walker_security:'pursuer: break sight or move outside its leash',drone_service:'landing control: change firing height',turret_cycle:'burst line: use cover, then fire during exposure',ram_charge:'displacement: jump the charge, then counter exposed recovery'};
const budgets={airlock:240000,cargo:360000,foundry:360000,archive:360000,reactor:480000};
const campaignRooms=Object.values(missions).flatMap(m=>m.rooms);
assert.equal(new Set(campaignRooms).size,config.campaign.room_count);
const registry={
 schema_version:1,build_id:JSON.parse(await readFile('package.json','utf8')).version,
 source_hash:createHash('sha256').update(configText+inputs.join('\n')).digest('hex'),
 status:'INCOMPLETE: source inventory; full route input, timing and human validation remain open',
 campaign_room_count:campaignRooms.length,training_room_excluded:'T',
 first_campaign_rooms_on_selected_route:29,
 foundry_routes:{service:['M3A','M3E','M3F','M3B','M3G','M3H','M3K','M3D'],press:['M3A','M3E','M3F','M3C','M3I','M3J','M3K','M3D']},
 runtime_conditions:{M2C:'A confirmed power route is required before leaving.',M2D:'The chosen circuit powers either the physical conveyor or its guard turret.',M2E:'The cell must be collected before R02 or installation; installation is required before leaving.',G:'The cell must be installed and the final encounter cleared before exit confirmation.',M3F:'Next depends on a confirmed service/press choice after isolation.',M3K:'Previous follows the selected branch; cooling terminal is required.',M3E:'The saved power circuit enables exactly one machine.',F:'E01 and Relay support control shutter and turret power.',M4C:'Data upload is required before the exit.',M5D:'Core/armor and hazard phases come from the Regulator simulation.'},
 missions:Object.values(missions).map(m=>({mission_id:m.id,design_budget_ms:budgets[m.id],timing_status:'NOT_MEASURED',rooms:m.rooms.map(id=>{
  const d=rooms[id];return{room_id:id,episode:examples[id]?.[0]||null,encounter_goal:examples[id]?.[1]||'Existing encounter; expansion and detailed response review remain open.',geometry:d.solids,enemies:d.enemies.map(enemy=>({...enemy,role_and_response:roles[enemy.preset]})),hazards:d.hazards||[],conveyor:d.conveyor||null,safe_zones:d.safeZones||[],repair:d.repair||null,cache:d.cache||null,terminal:d.terminal||null,terminal_kind:d.terminalKind||null,power_switch:d.powerSwitch||null,boss:d.boss||null,base_next:m.rooms.includes(d.next)?d.next:null,base_previous:m.rooms.includes(d.previous)?d.previous:null,combat_exit:'Powered live required threats must be defeated; room objectives still apply.',verification:'See exact-source model/browser evidence in PR #9; no full-room human PASS claimed.'};
 })}))
};
for(const route of Object.values(registry.foundry_routes))assert.equal(route.length,8);
await writeFile('docs/cinder-shift/rework-room-registry.json',JSON.stringify(registry,null,2)+'\n');
console.log(`Registry: ${campaignRooms.length} campaign rooms; 29 on a selected route; Foundry 8 + 8 alternatives. Timing is not measured.`);
