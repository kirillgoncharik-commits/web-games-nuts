import config from '../../game.config.json' with {type:'json'};
export const nodeIds=['W1','W2','W3','W4','M1','M2','M3','M4','D1','D2','D3','D4'] as const;
export type NodeId=typeof nodeIds[number];
export type ActiveSkill='M1'|'W4'|null;
export type ResearchDefinition={id:NodeId;cost:number;requires:NodeId[];branch:'weapon'|'movement'|'defence';nameKey:string;effectKey:string;icon:NodeId};
export const research:ResearchDefinition[]=nodeIds.map(id=>({id,cost:1,requires:Number(id[1])>1?[id[0]+String(Number(id[1])-1) as NodeId]:[],branch:id[0]==='W'?'weapon':id[0]==='M'?'movement':'defence',nameKey:'research.'+id+'.name',effectKey:'research.'+id+'.effect',icon:id}));
export type Loadout={nodes:NodeId[];maxHp:number;spread:boolean;piercing:boolean;ricochet:boolean;chargedShot:boolean;dash:boolean;airDash:boolean;wallMove:boolean;phaseDash:boolean;buffer:boolean;shieldClear:boolean;deathSave:boolean;active:ActiveSkill};
export function loadout(nodes:readonly NodeId[],active:ActiveSkill=nodes.includes('M1')?'M1':null):Loadout{
 const chosen=active==='M1'&&nodes.includes('M1')?'M1':active==='W4'&&nodes.includes('W4')?'W4':null;
 return{nodes:[...nodes],maxHp:config.initial_balance.player_hp+(nodes.includes('D1')?2:0),spread:nodes.includes('W1'),piercing:nodes.includes('W2'),ricochet:nodes.includes('W3'),chargedShot:chosen==='W4',dash:chosen==='M1',airDash:nodes.includes('M2'),wallMove:nodes.includes('M3'),phaseDash:nodes.includes('M4'),buffer:nodes.includes('D2'),shieldClear:nodes.includes('D3'),deathSave:nodes.includes('D4'),active:chosen};
}
export function prerequisitesMet(nodes:readonly NodeId[],id:NodeId){return research.find(n=>n.id===id)!.requires.every(n=>nodes.includes(n));}
export function purchase(state:{nodes:NodeId[];points:number;active:ActiveSkill},id:NodeId){
 const definition=research.find(n=>n.id===id);if(!definition||state.nodes.includes(id)||state.points<definition.cost||!prerequisitesMet(state.nodes,id))return false;
 state.points-=definition.cost;state.nodes.push(id);if(id==='M1')state.active='M1';return true;
}
export function shotVelocities(facing:number,speed:number,spread:boolean){return(spread?[0,-10,10]:[0]).map(degrees=>{const a=degrees*Math.PI/180;return{x:facing*speed*Math.cos(a),y:speed*Math.sin(a)};});}
