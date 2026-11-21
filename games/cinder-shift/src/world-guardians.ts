export const guardians={
  'beacon-warden':{hp:7,row:1},
  'rift-marshal':{hp:8,row:2},
} as const;
export type Guardian=keyof typeof guardians;

// The beacon rotor brackets the last known position. The radio commander
// repeats a locked signal, then sweeps downward and upward in the second phase.
export function guardianBurst(id:Guardian,hp:number):readonly number[]{
  if(id==='beacon-warden')return hp>guardians[id].hp/2?[-.14,.14]:[-.22,0,.22];
  return hp>guardians[id].hp/2?[0,0]:[0,.16,-.16];
}
