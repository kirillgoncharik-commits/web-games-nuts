import type {EnemyMob,EnemyKind} from './room-data';
/** Each family has its own tell, shot cadence and counterplay; base campaign stays independent. */
export const worldEnemyProfiles:Record<EnemyMob,{kind:EnemyKind;telegraph_ms:number;recovery_ms:number;burst_count:number;burst_interval_ms:number;projectile_speed:number;speed:number;lockMs:number;spread:number;pattern:'burst'|'fan'|'locked'|'cross'}>={
 'crumb-rover':{kind:'walker',telegraph_ms:1100,recovery_ms:2100,burst_count:3,burst_interval_ms:180,projectile_speed:130,speed:20,lockMs:0,spread:0,pattern:'burst'},
 'lint-rotor':{kind:'drone',telegraph_ms:1100,recovery_ms:2200,burst_count:2,burst_interval_ms:240,projectile_speed:115,speed:30,lockMs:0,spread:.10,pattern:'fan'},
 'lidar-guardian':{kind:'turret',telegraph_ms:1200,recovery_ms:2200,burst_count:3,burst_interval_ms:220,projectile_speed:130,speed:0,lockMs:300,spread:.12,pattern:'fan'},
 'relay-crawler':{kind:'walker',telegraph_ms:860,recovery_ms:1600,burst_count:3,burst_interval_ms:220,projectile_speed:135,speed:22,lockMs:420,spread:0,pattern:'locked'},
 'induction-orb':{kind:'drone',telegraph_ms:900,recovery_ms:1500,burst_count:2,burst_interval_ms:220,projectile_speed:100,speed:26,lockMs:500,spread:0,pattern:'locked'},
 'signal-watcher':{kind:'turret',telegraph_ms:1000,recovery_ms:1750,burst_count:3,burst_interval_ms:220,projectile_speed:120,speed:0,lockMs:500,spread:.16,pattern:'cross'},
};
export function worldShotOffset(mob:EnemyMob,index:number){const p=worldEnemyProfiles[mob];return p.pattern==='fan'?(index-(p.burst_count-1)/2)*p.spread:p.pattern==='cross'?[0,-p.spread,p.spread][index%3]:0;}
