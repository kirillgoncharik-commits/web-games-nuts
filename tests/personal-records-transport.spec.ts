import {test,expect} from '@playwright/test';
import {HostRecordStorage,BridgeRecordStorage,type RecordStorage} from '../games/cinder-shift/src/session/host-storage';
import {SaveService} from '../games/cinder-shift/src/session/save';
import {PersonalStatistics,emptyFragment,emptyPersonalRecords,statisticsTotals} from '../games/cinder-shift/src/session/personal-records';

function backing(kind:'guest'|'bridge'){
 let raw:string|null=null,fail=false;const parses:unknown[]=[];
 const key='transport-'+crypto.randomUUID();
 const guest={getItem:()=>raw,setItem:(_key:string,value:string)=>{if(fail)throw Error('quota');raw=value;}};
 const bridge={get:async(_key:string,parse?:boolean)=>{parses.push(parse);await new Promise(resolve=>setTimeout(resolve,1));return raw;},set:async(_key:string,value:unknown)=>{await new Promise(resolve=>setTimeout(resolve,1));if(fail)throw Error('quota');raw=String(value);}};
 return{get raw(){return raw;},set raw(value:string|null){raw=value;},set fail(value:boolean){fail=value;},parses,
  adapter:():RecordStorage=>kind==='guest'?new HostRecordStorage(guest,key):new BridgeRecordStorage(bridge,key)};
}
const fragment=(id:string,shots:number,hits:number)=>{const data=emptyPersonalRecords();data.sessions[id]={...emptyFragment(),shots,hits};return data;};

for(const kind of ['guest','bridge'] as const){
 test(kind+': independent save services merge concurrent statistics, preserve other records and duplicate checkpoints',async()=>{
  const memory=backing(kind),first=new SaveService('fixture',memory.adapter()),second=new SaveService('fixture',memory.adapter());
  await first.connect();await first.saveModeData('records.v1',{valuable:'legacy PB'});await first.saveModeData('world.c02-small-world.v1',{valuable:'independent campaign'});
  const a=fragment('a',10,4),b=fragment('b',7,2);expect((await Promise.all([first.updatePersonalRecords(a),second.updatePersonalRecords(b)])).every(Boolean)).toBe(true);
  a.sessions.a.shots=1;a.sessions.a.hits=0;expect(await first.updatePersonalRecords(a)).not.toBeNull();
  const envelope=JSON.parse(memory.raw!);expect(statisticsTotals(envelope.records['personal-records.v1'])).toMatchObject({shots:17,hits:6});
  expect(envelope.records['personal-records.backup.v1']).toEqual(envelope.records['personal-records.v1']);
  expect(envelope.records['records.v1']).toEqual({valuable:'legacy PB'});expect(envelope.records['world.c02-small-world.v1']).toEqual({valuable:'independent campaign'});
  if(kind==='bridge')expect(memory.parses.every(value=>value===false)).toBe(true);
 });

 test(kind+': a failed SDK/guest write retains the last complete envelope and retries the same fragment',async()=>{
  const memory=backing(kind),service=new SaveService('fixture',memory.adapter());
  expect(await service.updatePersonalRecords(fragment('a',1,0))).not.toBeNull();const before=memory.raw;memory.fail=true;
  expect(await service.updatePersonalRecords(fragment('a',9,3))).toBeNull();expect(memory.raw).toBe(before);expect(service.issue).toBe('write_failed');
  memory.fail=false;expect(await service.updatePersonalRecords(fragment('a',9,3))).not.toBeNull();expect(service.issue).toBeNull();
  expect(statisticsTotals(JSON.parse(memory.raw!).records['personal-records.v1'])).toMatchObject({shots:9,hits:3});
 });

 test(kind+': damaged known statistics recover with quarantine; a future statistics version is never replaced',async()=>{
  const memory=backing(kind),service=new SaveService('fixture',memory.adapter()),backup=fragment('old',4,1),damaged={version:1,sessions:'damaged'};
  memory.raw=JSON.stringify({version:1,records:{'personal-records.v1':damaged,'personal-records.backup.v1':backup,campaign:{valuable:true}}});
  expect(await service.updatePersonalRecords(fragment('new',2,1))).not.toBeNull();let saved=JSON.parse(memory.raw!);
  expect(statisticsTotals(saved.records['personal-records.v1'])).toMatchObject({shots:6,hits:2});expect(saved.records['personal-records.quarantine.v1']).toEqual(damaged);expect(saved.records.campaign).toEqual({valuable:true});
  saved.records['personal-records.v1']={version:2,valuable:'future'};memory.raw=JSON.stringify(saved);const before=memory.raw;
  expect(await service.updatePersonalRecords(fragment('new',5,2))).toBeNull();expect(memory.raw).toBe(before);
 });

 test(kind+': unknown outer envelopes and corrupt backups remain byte-for-byte intact',async()=>{
  const memory=backing(kind),service=new SaveService('fixture',memory.adapter());
  for(const raw of ['broken JSON',JSON.stringify({version:2,records:{valuable:true}}),JSON.stringify({version:1,records:{'personal-records.v1':{version:1,broken:true},'personal-records.backup.v1':{version:1,broken:true}}})]){
   memory.raw=raw;expect(await service.updatePersonalRecords(fragment('a',1,0))).toBeNull();expect(memory.raw).toBe(raw);
  }
 });

 test(kind+': profile reload uses the selected transport for settings and statistics without requiring browser storage',async()=>{
  const memory=backing(kind),service=new SaveService('fixture',memory.adapter());await service.connect();
  const {settings}=await service.load('ru');settings.muted=true;settings.musicVolume=.42;expect(await service.saveSettings(settings)).toBe(true);
  const statistics=new PersonalStatistics(service);await statistics.load();statistics.combat('shots');statistics.combat('hits');expect(await statistics.flush()).toBe(true);
  const next=new SaveService('fixture',memory.adapter());expect((await next.load('en')).settings).toMatchObject({locale:'ru',muted:true,musicVolume:.42});
  const reloaded=new PersonalStatistics(next);await reloaded.load();expect(statisticsTotals(reloaded.snapshot())).toMatchObject({shots:1,hits:1});expect(next.storageScope).toBe('platform');
 });
}
