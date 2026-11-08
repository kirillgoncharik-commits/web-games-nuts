import config from '../../game.config.json' with {type:'json'};
import {loadout,type NodeId,type ActiveSkill} from './research';
export const mira={id:'mira',nameKey:'character.mira.name',roleKey:'character.mira.role'} as const;
export function characterProfile(nodes:readonly NodeId[],active:ActiveSkill=nodes.includes('M1')?'M1':null){
 const build=loadout(nodes,active),b=config.initial_balance,m=config.movement;
 return{characterId:mira.id,maxHp:build.maxHp,projectileDamage:b.shot_damage,projectilesPerShot:build.spread?3:1,shotsPerSecond:b.shots_per_second,projectileSpeed:b.projectile_speed,walkSpeed:b.walk_speed,active:build.active,piercing:build.piercing,ricochet:build.ricochet,chargedShot:build.chargedShot,airDash:build.airDash,wallMove:build.wallMove,phaseDash:build.phaseDash,buffer:build.buffer,shieldClear:build.shieldClear,deathSave:build.deathSave,dashDistance:build.dash?config.m04.dash_distance:0,dashSeconds:build.dash?m.dash_ms/1000:0,dashCooldown:build.dash?m.dash_cooldown_ms/1000:0,skills:['fire','jump','crouch'] as const};
}
export type CharacterProfile=ReturnType<typeof characterProfile>;
export const previewProfile=(nodes:readonly NodeId[],selected:NodeId,active:ActiveSkill=nodes.includes('M1')?'M1':null)=>characterProfile(nodes.includes(selected)?nodes:[...nodes,selected],(selected==='M1'||selected==='W4')&&!nodes.includes(selected)?selected:active);
