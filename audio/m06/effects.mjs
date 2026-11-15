import{renderDefinition}from'../m05a/score.mjs';
const p=(wave,start,duration,from,to,level=1)=>({wave,start,duration,from,to,level});
export const definitions={
 shield_absorb:{seconds:.23,priority:5,bus:'sfx',peak:.22,cue_id:'RW2_SHIELD',parts:[p('noise',0,.06,2600,500,.18),p('triangle',0,.18,880,220,.55),p('pulse',.04,.16,1320,440,.22)]},
 repair_suit:{seconds:.38,priority:3,bus:'sfx',peak:.18,cue_id:'RW2_REPAIR',parts:[p('triangle',0,.12,330,330,.5),p('triangle',.12,.12,440,440,.5),p('triangle',.24,.14,660,660,.5)]},
 ability_ready:{seconds:.13,priority:2,bus:'sfx',peak:.12,cue_id:'RW2_ABILITY_READY',parts:[p('triangle',0,.055,660,660,.5),p('triangle',.06,.07,990,990,.4)]},
 boss_shutdown:{seconds:1.4,priority:6,bus:'sfx',peak:.24,cue_id:'RW2_SHUTDOWN',parts:[p('noise',0,.4,400,45,.4),p('pulse',0,.8,110,28,.5),p('triangle',.4,1,165,41,.6)]},
 module_purchase:{seconds:.72,priority:3,bus:'ui',peak:.2,cue_id:'ST_TECH_PURCHASE',parts:[p('noise',0,.06,400,150,.3),p('triangle',.04,.16,330,330,.45),p('pulse',.21,.14,494,494,.44),p('triangle',.38,.28,659,659,.52)]},
 mission_start:{seconds:1.2,priority:4,bus:'ui',peak:.24,cue_id:'ST_MISSION_START',parts:[p('triangle',0,.18,330,330,.5),p('triangle',.16,.18,440,440,.55),p('pulse',.32,.18,523,523,.45),p('triangle',.52,.62,660,660,.55),p('triangle',.52,.62,165,165,.32)]},
 mission_retry:{seconds:.9,priority:4,bus:'ui',peak:.22,parts:[p('triangle',0,.16,392,392,.5),p('triangle',.18,.16,494,494,.5),p('pulse',.38,.36,587,587,.45)]},
 boss_intro:{seconds:2.4,priority:6,bus:'sfx',peak:.28,cue_id:'ST_BOSS_INTRO',parts:[p('noise',0,.24,220,100,.22),p('pulse',.04,.38,82,82,.65),p('pulse',.46,.38,82,77,.62),p('triangle',.92,.62,123,110,.5),p('noise',1.24,.36,320,80,.25),p('triangle',1.55,.7,98,98,.48)]},
 campaign_clear:{seconds:6.4,priority:7,bus:'result',peak:.3,cue_id:'ST_CAMPAIGN_CLEAR',parts:[p('triangle',0,.22,330,330,.45),p('triangle',.24,.22,392,392,.48),p('triangle',.48,.22,494,494,.52),p('pulse',.72,.24,587,587,.5),p('triangle',.98,1.15,784,784,.55),p('triangle',.98,1.15,196,196,.34),p('pulse',2.25,.8,659,659,.45),p('triangle',3.2,2.6,784,784,.45),p('triangle',3.2,2.6,392,392,.34),p('pulse',5.9,.48,659,659,.34)]},
 mission_win:{seconds:2,priority:6,bus:'result',peak:.3,cue_id:'ST_MISSION_CLEAR',parts:[p('pulse',0,.18,262,262,.55),p('pulse',.2,.18,330,330,.55),p('pulse',.4,.18,392,392,.58),p('triangle',.62,.5,523,523,.62),p('triangle',.62,.5,131,131,.4),p('triangle',1.22,.48,659,659,.5)]},
 mission_death:{seconds:1.8,priority:6,bus:'result',peak:.3,cue_id:'ST_DEATH',parts:[p('pulse',0,.2,196,196,.58),p('pulse',.24,.22,147,147,.62),p('triangle',.5,.54,98,82,.58),p('noise',.5,.25,150,40,.2),p('triangle',1.1,.46,65,49,.5)]},
 hit_armour:{seconds:.22,priority:1,bus:'sfx',peak:.18,cue_id:'ST_TURRET_ARMOR',parts:[p('noise',0,.07,2600,500,.28),p('pulse',.005,.12,880,660,.24),p('triangle',.02,.1,1760,880,.18)]},
 hit_open:{seconds:.2,priority:2,bus:'sfx',peak:.2,cue_id:'ST_TURRET_OPEN_HIT',parts:[p('noise',0,.055,1400,280,.18),p('triangle',.006,.1,220,98,.48),p('pulse',.02,.12,110,82,.26)]},
 hit_wall:{seconds:.12,priority:0,bus:'sfx',peak:.12,cue_id:'ST_METAL_WALL_HIT',parts:[p('noise',0,.05,950,350,.22),p('triangle',.005,.075,310,180,.18)]}
};
export const cueIds={mission_start:'ST_MISSION_START',module_purchase:'ST_TECH_PURCHASE',mission_win:'ST_MISSION_CLEAR',mission_death:'ST_DEATH',boss_intro:'ST_BOSS_INTRO',campaign_clear:'ST_CAMPAIGN_CLEAR',hit_armour:'ST_TURRET_ARMOR',hit_open:'ST_TURRET_OPEN_HIT',hit_wall:'ST_METAL_WALL_HIT'};
export const renderCue=(id)=>renderDefinition(id,definitions[id]);
