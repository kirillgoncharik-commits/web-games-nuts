export type ThemeId='SW01'|'SW02'|'SW03'|'SW04'|'SW05'|'YU01'|'YU02'|'YU03'|'YU04'|'YU05'|'SW_MENU'|'YU_MENU'|'SW_FINALE'|'YU_FINALE'|'menu'|'map'|'airlock'|'freight'|'foundry'|'archive'|'reactor'|'boss'|'shutdown'|'evacuation';
export type MusicEvent={beat:number;duration:number;pitch:number;wave:'pulse'|'triangle'|'noise';level:number};
export type MusicTrack={bpm:number;bars:number;roots:number[];motif:number[];answer:number[];swing:number;lead:number;bass:number;answerLevel:number;noise:number;events:MusicEvent[]};
export const themes:Record<ThemeId,Omit<MusicTrack,'events'>>;
export function buildTrack(id:ThemeId):MusicTrack;
export function midiHz(note:number):number;
