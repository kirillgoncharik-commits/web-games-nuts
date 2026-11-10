import type {RoomDefinition} from '../room-data';

export const signals={
  shot:0xfff0c9,energy:0x43deff,warning:0xffbc52,damage:0xff6374,repair:0x6fe7b3,violet:0xad8fff
} as const;

const sectors={
  airlock:{back:0x687e95,light:0x6cb2d4},
  cargo:{back:0x82755f,light:0xe4a260},
  foundry:{back:0x89624e,light:0xff8246},
  archive:{back:0x686383,light:signals.violet},
  reactor:{back:0x626984,light:0x79abed}
} as const;

export function roomLighting(room:RoomDefinition,intense:boolean){
  const sector=room.sector||(room.id==='D'||room.id==='E'||room.id==='F'||room.id==='G'?'cargo':'airlock');
  return {...sectors[sector],strength:intense?.14:.07,foreground:intense?0x91a9b8:0x7895a7};
}
