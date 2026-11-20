export interface RecordStorage{read(key:string):Promise<unknown>;writeMany(values:Record<string,unknown>):Promise<void>;}
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
