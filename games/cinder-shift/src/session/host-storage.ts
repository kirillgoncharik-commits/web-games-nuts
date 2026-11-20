export type RecordMutation=(records:Readonly<Record<string,unknown>>)=>Record<string,unknown>;
export interface RecordStorage{
 read(key:string):Promise<unknown>;
 writeMany(values:Record<string,unknown>):Promise<void>;
 updateMany(mutate:RecordMutation):Promise<Record<string,unknown>>;
}
export interface BridgeStorage{get(key:string,tryParseJson?:boolean):Promise<unknown>;set(key:string,value:unknown):Promise<void>;}
const queues=new Map<string,Promise<void>>();
/** Web Locks coordinate same-origin tabs; the queue also covers browsers without that API. */
function serialized<T>(key:string,operation:()=>Promise<T>|T):Promise<T>{
 const name='cinder-records:'+key,previous=queues.get(name)||Promise.resolve();
 const result=previous.then(async()=>{
  if(typeof navigator==='undefined'||!navigator.locks)return operation();
  let entered=false;
  try{return await navigator.locks.request(name,async()=>{entered=true;return operation();});}
  catch(error){if(entered)throw error;return operation();}
 });
 queues.set(name,result.then(()=>{},()=>{}));return result;
}
function records(text:unknown):Record<string,unknown>{
 if(text===null||text===undefined)return{};
 if(typeof text!=='string')throw Error('host_storage_corrupt');
 const data:unknown=JSON.parse(text);
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('host_storage_corrupt');
 const envelope=data as {version?:unknown;records?:unknown};
 if(envelope.version!==1||!envelope.records||typeof envelope.records!=='object'||Array.isArray(envelope.records))throw Error('host_storage_incompatible');
 return envelope.records as Record<string,unknown>;
}
const envelope=(values:Record<string,unknown>)=>JSON.stringify({version:1,records:values});
/** A guest profile keeps all records in one atomic localStorage envelope. */
export class HostRecordStorage implements RecordStorage{
 constructor(private readonly storage:Pick<Storage,'getItem'|'setItem'>,private readonly key='cinder-shift-records.v1'){}
 read(key:string){return serialized(this.key,()=>structuredClone(records(this.storage.getItem(this.key))[key]));}
 async writeMany(values:Record<string,unknown>){const snapshot=structuredClone(values);await this.updateMany(()=>snapshot);}
 updateMany(mutate:RecordMutation){return serialized(this.key,()=>{
  const current=records(this.storage.getItem(this.key)),updates=structuredClone(mutate(structuredClone(current)));
  this.storage.setItem(this.key,envelope({...current,...updates}));return updates;
 });}
}
/** Only the SDK touches its backing store; rejected writes leave the queue retryable. */
export class BridgeRecordStorage implements RecordStorage{
 constructor(private readonly storage:BridgeStorage,private readonly key='cinder-shift-records.v1'){}
 read(key:string){return serialized(this.key,async()=>structuredClone(records(await this.storage.get(this.key,false))[key]));}
 async writeMany(values:Record<string,unknown>){const snapshot=structuredClone(values);await this.updateMany(()=>snapshot);}
 updateMany(mutate:RecordMutation){return serialized(this.key,async()=>{
  const current=records(await this.storage.get(this.key,false)),updates=structuredClone(mutate(structuredClone(current)));
  await this.storage.set(this.key,envelope({...current,...updates}));return updates;
 });}
}
