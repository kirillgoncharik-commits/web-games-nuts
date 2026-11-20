export interface RecordStorage{read(key:string):Promise<unknown>;writeMany(values:Record<string,unknown>):Promise<void>;}
export interface BridgeStorage{get(key:string,tryParseJson?:boolean):Promise<unknown>;set(key:string,value:unknown):Promise<void>;}
/** One atomic guest-storage envelope retains the existing per-record save validators. */
export class HostRecordStorage implements RecordStorage{
 constructor(private readonly storage:Pick<Storage,'getItem'|'setItem'>,private readonly key='cinder-shift-records.v1'){}
 private records():Record<string,unknown>{
  const text=this.storage.getItem(this.key);if(text===null)return{};
  const data:unknown=JSON.parse(text);
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('host_storage_corrupt');
  const envelope=data as {version?:unknown;records?:unknown};
  if(envelope.version!==1||!envelope.records||typeof envelope.records!=='object'||Array.isArray(envelope.records))throw Error('host_storage_incompatible');
  return envelope.records as Record<string,unknown>;
 }
 async read(key:string){return structuredClone(this.records()[key]);}
 async writeMany(values:Record<string,unknown>){
  // Re-read before writing, so a corrupt/future envelope is never silently replaced.
  const records={...this.records(),...structuredClone(values)};
  this.storage.setItem(this.key,JSON.stringify({version:1,records}));
 }
}

/** The Bridge owns persistence; serialize envelope updates to retain unrelated records. */
export class BridgeRecordStorage implements RecordStorage{
 private queue:Promise<void>=Promise.resolve();
 constructor(private readonly storage:BridgeStorage,private readonly key='cinder-shift-records.v1'){}
 private async records():Promise<Record<string,unknown>>{
  const text=await this.storage.get(this.key,false);if(text===null||text===undefined)return{};
  if(typeof text!=='string')throw Error('host_storage_corrupt');
  const data:unknown=JSON.parse(text);
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('host_storage_corrupt');
  const envelope=data as {version?:unknown;records?:unknown};
  if(envelope.version!==1||!envelope.records||typeof envelope.records!=='object'||Array.isArray(envelope.records))throw Error('host_storage_incompatible');
  return envelope.records as Record<string,unknown>;
 }
 async read(key:string){await this.queue;return structuredClone((await this.records())[key]);}
 writeMany(values:Record<string,unknown>){
  const snapshot=structuredClone(values);
  const operation=async()=>{const records={...await this.records(),...snapshot};await this.storage.set(this.key,JSON.stringify({version:1,records}));};
  const result=this.queue.then(operation);this.queue=result.catch(()=>{});return result;
 }
}
