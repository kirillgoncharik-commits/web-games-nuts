import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {migrateSave,validateSave} from '../games/cinder-shift/src/session/save';
import {validateChallengeRecords} from '../games/cinder-shift/src/session/challenge-records';
import {PersonalStatistics,mergePersonalRecords,statisticsTotals,type PersonalRecords} from '../games/cinder-shift/src/session/personal-records';

for(const target of ['web','itch']){
 test(`published alpha.12 ${target} purchase, frozen entry and earned best remain compatible`,async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/personal-records/alpha12-'+target+'.json',import.meta.url),'utf8'));
  expect(fixture.version).toBe('0.8.0-alpha.12');expect(fixture.target).toBe(target);
  const before=structuredClone(fixture.records),legacy=fixture.records.campaign;
  expect(validateSave(legacy)).toBeNull();expect(validateChallengeRecords(fixture.records['records.v1'])).toBe(true);
  const migrated=migrateSave(legacy);
  expect(migrated.campaign.campaign_id).toBe(legacy.campaign.campaign_id);
  expect(migrated.campaign.nodes).toEqual(['D1']);expect(migrated.campaign.points).toBe(0);
  expect(migrated.campaign.entry).toEqual(legacy.campaign.entry);
  expect(migrated.campaign.entry!.max_hp).toBe(8);
  const best=fixture.records['records.v1'].best[0];
  expect(best.value).toBeGreaterThan(0);
  expect(fixture.records['records.v1'].recent[best.challenge_key][0].run_id).toBe(best.run_id);
  expect(fixture.records['records.v1'].traces[0].points.length).toBeGreaterThan(0);
  expect(fixture.records).toEqual(before);
 });

 test(`published alpha.12 ${target} starts new counters without replacing old campaign, PB or ghost`,async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/personal-records/alpha12-'+target+'.json',import.meta.url),'utf8'));
  const records=new Map<string,unknown>(Object.entries(structuredClone(fixture.records)));
  const before=structuredClone(fixture.records);
  const store={async loadModeData(key:string){return{ok:true,value:structuredClone(records.get(key))};},async updatePersonalRecords(incoming:PersonalRecords){const merged=mergePersonalRecords(records.get('personal-records.v1'),incoming);records.set('personal-records.v1',structuredClone(merged));return merged;}};
  const stats=new PersonalStatistics(store);await stats.load();
  stats.registerCampaign(migrateSave(fixture.records.campaign).campaign,true);
  expect(statisticsTotals(stats.snapshot())).toEqual({shots:0,hits:0,total_ms:0,mission_ms:0});
  expect(stats.snapshot().completed).toEqual([]);
  expect(stats.snapshot().campaign_baselines[fixture.records.campaign.campaign.campaign_id].history_complete).toBe(false);
  for(let i=0;i<10;i++)stats.combat('shots');for(let i=0;i<4;i++)stats.combat('hits');
  expect(await stats.flush()).toBe(true);
  const reloaded=new PersonalStatistics(store);await reloaded.load();
  expect(statisticsTotals(reloaded.snapshot())).toEqual({shots:10,hits:4,total_ms:0,mission_ms:0});
  for(const [key,value]of Object.entries(before))expect(records.get(key)).toEqual(value);
 });
}
