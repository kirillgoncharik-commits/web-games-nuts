import config from '../../game.config.json' with {type:'json'};
export const nodeIds=['W1','M1','D1'] as const;
export type NodeId=typeof nodeIds[number];
export type ResearchDefinition={id:NodeId;cost:number;branch:'weapon'|'movement'|'defence';nameKey:string;effectKey:string;icon:'spread'|'dash'|'shield';modifiers:{spread?:boolean;dash?:boolean;hpBonus?:number;active?:'M1'}};
export const research:ResearchDefinition[]=[
  {id:'W1',cost:1,branch:'weapon',nameKey:'research.W1.name',effectKey:'research.W1.effect',icon:'spread',modifiers:{spread:true}},
  {id:'M1',cost:1,branch:'movement',nameKey:'research.M1.name',effectKey:'research.M1.effect',icon:'dash',modifiers:{dash:true,active:'M1'}},
  {id:'D1',cost:1,branch:'defence',nameKey:'research.D1.name',effectKey:'research.D1.effect',icon:'shield',modifiers:{hpBonus:2}},
];
export type Loadout={nodes:NodeId[];maxHp:number;spread:boolean;dash:boolean;active:'M1'|null};
export function loadout(nodes:readonly NodeId[]):Loadout{
  const result:Loadout={nodes:[...nodes],maxHp:config.initial_balance.player_hp,spread:false,dash:false,active:null};
  for(const definition of research.filter(def=>nodes.includes(def.id))){const m=definition.modifiers;result.maxHp+=m.hpBonus||0;if(m.spread)result.spread=true;if(m.dash)result.dash=true;if(m.active)result.active=m.active;}
  return result;
}
export function purchase(state:{nodes:NodeId[];points:number;active:'M1'|null},id:NodeId){
  const definition=research.find(n=>n.id===id);if(!definition||state.nodes.includes(id)||state.points<definition.cost)return false;
  state.points-=definition.cost;state.nodes.push(id);state.active=state.nodes.includes('M1')?'M1':null;return true;
}
export function shotVelocities(facing:number,speed:number,spread:boolean){return(spread?[0,-10,10]:[0]).map(degrees=>{const a=degrees*Math.PI/180;return{x:facing*speed*Math.cos(a),y:speed*Math.sin(a)};});}
