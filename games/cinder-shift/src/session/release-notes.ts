export type ReleaseNote={id:string;date:string;en:{summary:string;changes:string[]};ru:{summary:string;changes:string[]}};
export const releaseNotes:readonly ReleaseNote[]=[
 {id:'0.7.0-rw2.c3',date:'2026-11-16',en:{summary:'Caldera 7 comes alive.',changes:['Distinct environments and working machinery in all five sectors.','Clearer combat cues and equipment states.','A compact map, workshop and challenge setup.']},ru:{summary:'Кальдера 7 оживает.',changes:['Разные окружения и работающие механизмы во всех пяти секторах.','Более понятные сигналы боя и состояния оборудования.','Компактная карта, мастерская и выбор испытаний.']}},
 {id:'0.8.0-alpha.1',date:'2026-11-16',en:{summary:'The first development checkpoint of the next milestone.',changes:['The running version, source revision and build now appear in the bottom right corner.','What’s new is available from the main menu and appears once after an update.','Full build details can be copied from settings.','A campaign overview shows all three worlds and their current availability.']},ru:{summary:'Первая рабочая контрольная точка следующего этапа.',changes:['Версия игры, ревизия исходников и сборка теперь видны в правом нижнем углу.','История изменений доступна из меню и появляется один раз после обновления.','Полные данные сборки можно скопировать в настройках.','Обзор кампаний показывает три мира и их текущую доступность.']}},
 {id:'0.8.0-alpha.2',date:'2026-11-16',en:{summary:'Two playable world campaigns enter development testing.',changes:['Explore ten missions across the house and the Adriatic city.','Carry items into contacts or route two physical power circuits.','Each campaign keeps its own progress and workshop; both unlock after the first campaign finale.','Unpowered turrets have a distinct power-off marker; armor hints follow the real firing cycle.']},ru:{summary:'Две играбельные кампании переходят к проверке.',changes:['Десять миссий в огромном доме и адриатическом городе.','Переносите предметы к контактам и переключайте физические контуры A/B.','У каждого мира свои прогресс и мастерская; оба открываются после финала первой кампании.','Обесточенные турели отмечены отдельно; подсказка об уязвимости следует реальному циклу стрельбы.']}},
 {id:'0.8.0-alpha.3',date:'2026-11-16',en:{summary:'Physical mechanisms in the new worlds.',changes:['The first desktop key lowers its neighbor for a short crossing window.','Returning keys wait until Mira has stepped off; pausing freezes their cycle.']},ru:{summary:'Физические механизмы новых миров.',changes:['Первая клавиша рабочего стола на короткое время опускает соседнюю.','Возвращающаяся клавиша ждёт, пока Мира уйдёт; пауза останавливает её цикл.']}}
];
type Version={core:number[];pre:string[]};
function parseVersion(value:string):Version|null{const m=/^(\d+)\.(\d+)\.(\d+)(?:-([\da-z.-]+))?(?:\+[\da-z.-]+)?$/i.exec(value);return m?{core:m.slice(1,4).map(Number),pre:m[4]?.split('.')||[]}:null;}
export function compareReleases(a:string,b:string):number|null{
 const av=parseVersion(a),bv=parseVersion(b);if(!av||!bv)return null;
 for(let i=0;i<3;i++)if(av.core[i]!==bv.core[i])return Math.sign(av.core[i]-bv.core[i]);
 if(!av.pre.length||!bv.pre.length)return av.pre.length===bv.pre.length?0:av.pre.length?-1:1;
 for(let i=0;i<Math.max(av.pre.length,bv.pre.length);i++){
  const x=av.pre[i],y=bv.pre[i];if(x===undefined||y===undefined)return x===y?0:x===undefined?-1:1;if(x===y)continue;
  const nx=/^\d+$/.test(x),ny=/^\d+$/.test(y);if(nx&&ny)return Math.sign(Number(x)-Number(y));if(nx!==ny)return nx?-1:1;return x<y?-1:1;
 }return 0;
}
export type NotesMarker={schema:1;installed_release:string|null;acknowledged_release:string|null};
export class ReleaseNotesSession{
 readonly marker:NotesMarker;readonly writable:boolean;private closed=false;
 constructor(readonly current:string,raw:unknown,existingProfile:boolean,readonly catalog:readonly ReleaseNote[]=releaseNotes){
  const r=raw as Partial<NotesMarker>|null;
  const valid=r?.schema===1&&[r.installed_release,r.acknowledged_release].every(v=>v===null||typeof v==='string'&&parseVersion(v));
  this.writable=raw===undefined||Boolean(valid);
  this.marker=valid?structuredClone(r) as NotesMarker:{schema:1,installed_release:existingProfile?null:current,acknowledged_release:null};
 }
 get highwater(){const {installed_release:a,acknowledged_release:b}=this.marker;if(!a)return b;if(!b)return a;return compareReleases(a,b)===-1?b:a;}
 get pending(){return !this.closed&&this.writable&&(!this.highwater||compareReleases(this.current,this.highwater)===1);}
 get updates(){return this.catalog.filter(n=>compareReleases(n.id,this.current)!==1&&(!this.highwater||compareReleases(n.id,this.highwater)===1));}
 get history(){return this.catalog.filter(n=>compareReleases(n.id,this.current)!==1).slice().reverse();}
 acknowledge(){this.closed=true;if(!this.writable)return null;const previous=this.highwater;if(!previous||compareReleases(this.current,previous)===1||compareReleases(this.current,previous)===0)this.marker.acknowledged_release=this.current;return structuredClone(this.marker);}
}
