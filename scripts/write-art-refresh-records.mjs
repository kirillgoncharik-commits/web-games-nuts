import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const base='art/art-refresh-v1/',hash=b=>createHash('sha256').update(b).digest('hex');
const inventory=JSON.parse(await readFile(base+'previews/master-inventory.json','utf8'));
const prompts=JSON.parse(await readFile(base+'generation-prompts.json','utf8'));
const runtime=JSON.parse(await readFile('games/cinder-shift/public/assets/art-refresh-v1/runtime-manifest.json','utf8'));
const ids={
 'ART-01':'exec-4a62d197-d534-4da0-837a-93e4881f69fa',
 'ART-02':'exec-762928b6-f21e-4ac9-ac7b-084c3ef35476',
 'ART-03':'exec-9eecc36a-43da-4a3e-91d8-4103e584aa9a',
 'ART-04':'exec-ecc5bac7-0806-4fe4-a97e-8454ba3f1588',
 'ART-05':'exec-bd4eec27-1b19-4688-a370-1c34766e9338',
 'ART-06':'exec-1e98ebca-b386-496f-8367-1e4f6147e392',
 'ART-07':'exec-aa7b5d8c-b76d-4a12-a544-6c686d1188b1',
 'ART-08':'exec-489f5650-43d0-4f35-87f7-30607b08268d',
 'ART-09':'exec-8b1f7dd0-fa70-46b1-8852-dc8d90919f75',
 'ART-10':'exec-5dc1a59e-43a6-4f0a-bcd8-d95cfb987f00',
 'ART-11':'exec-e750e62f-d76d-47d1-bfd2-e30ba50f2d07',
 'ART-12':'exec-6067248c-ddb0-45f6-bb75-1155a425660b',
 'ART-13':'exec-0c3863a4-7626-4d13-9971-5b03aac1ce3f',
 'ART-14':'exec-57c03c5e-046a-4ee1-931f-3b3f38ef8230',
 'ART-15':'exec-bd54a99b-a704-4ddb-9f3a-f4953197c748',
 'ART-16':'exec-81860cf4-2b03-4bd9-8c0a-7b18cd827f27',
 'ART-17':'exec-0745df01-0c9d-4830-ae44-b53841be2ba2',
 'ART-18':'exec-c702a11c-7a86-4f76-b75b-002a46f576f7',
 'ART-19':'exec-02507cac-00f2-4e93-81c6-18cf5b60553e',
 'ART-20':'exec-6c4b8a1e-c900-4675-a3bd-4eb40090bf0f',
 'ART-21':'exec-9f48924b-797c-4049-8e34-a9f06a265ee2',
};
const pending=['Full in-game state transition screenshots at 1x, 2x and target mobile scale','20 campaign rooms plus training scene matrix','Mono, reduced-flash, accessibility and physical-device visual review'];
const runtimeBindings={
 'ART-01':'SceneArt.turret reads turretPresentation; the warning line uses enemyMuzzle. Destroyed/wreck states use the matching frame.',
 'ART-02':'walker_security preset maps patrol/notice/telegraph/fire/recovery/death to family frames; return shares patrol.',
 'ART-03':'ram_charge preset maps idle/windup/charge/recovery/death to family frames.',
 'ART-04':'RoomDefinition.cell maps uncollected, carried, empty socket after pickup, and installed switchboard states.',
 'ART-05':'RoomDefinition.repair.slot and safeZones drive ready/used/protected; B service station uses R01 data.',
 'ART-06':'cache ids S04, S05 and salvage map to purpose-specific available/interact/used frames.',
 'ART-07':'HazardDefinition.kind=press plus its existing cycle drives safe/warning/strike/recovery.',
 'ART-08':'HazardDefinition.kind=heat plus its existing cycle drives cool/warning/active/recovery.',
 'ART-09':'solid material=thin selects intact; RoomState.brokenPanels selects broken after the existing piercing event.',
 'ART-10':'solid material=wall selects idle or pass-ripple only while the existing wallMove dash crosses it.',
 'ART-11':'solid material=phase selects active/passable/restore from the existing phaseDash window.',
 'ART-12':'solid material=ricochet selects normal or impact when an existing player shot overlaps it.',
 'ART-13':'event geometry selects closed/open. Opening and warning art are exported but intentionally unused because the model exposes no corresponding transition state.',
 'ART-14':'terminalKind and RoomState/hold map purpose-specific off/ready/hold/done states.',
 'ART-15':'D2 availability and RoomState.bufferUsed map ready/absorbed/discharge/spent; discharge is bounded to the existing event edge.',
 'ART-16':'Regulator pattern phase and boss HP map armored/warning/attack/exposed/phase-two/hit/shutdown/destroyed.',
 'ART-17':'RoomDefinition.window selects reactor vista at M5C and evacuation vista at M5E.',
 'ART-18':'Room ID D/E/F/G selects the cargo container, rail-crane and power-junction landmarks.',
 'ART-19':'Room ID M3A–M3D selects foundry furnace, process-pipes and press-line landmarks.',
 'ART-20':'Room ID M4A–M4D selects archive data-racks, archive-cabinet and transfer-bus landmarks.',
 'ART-21':'Room ID M5A–M5E selects reactor power-bus, cooling-manifold and beacon-mast landmarks.',
};
const notIntegrated={'ART-13':['opening','warning']};
const familyCoverage=inventory.families.map(f=>{
 const integrated=new Set(f.states.filter(s=>!(notIntegrated[f.family]||[]).includes(s)));
 return {family:f.family,id:f.id,generated:true,processed:true,exported:true,integrated:integrated.size>0,automated_verified:true,visually_verified:false,published:false,source:f.source,source_sha256:f.source_sha256,frames:f.states.map(state=>({state,frame:f.id+'_'+state,integrated:integrated.has(state),evidence:integrated.has(state)?runtimeBindings[f.family]:'Exported in atlas; no matching model transition is defined.'})),evidence:['Master inventory and hashes: previews/master-inventory.json','Runtime atlas/hash/padding/alpha contract: scripts/check-art-refresh-v1.mjs','Contact sheets inspected at 1x/2x; full in-game visual review is pending.'],pending};
});
const vEvidence={
 V01:'world-map.ts emits five semantic position classes; art:check confirms no inline position styles and expected CSS coordinates.',
 V02:'mobile-layout.ts requests 60x60 Fire/Jump and 196x60/264x60 groups; runtime bounding boxes and no-overlap are pending.',
 V03:'ui.css adds short-landscape map/workshop composition; viewport screenshot matrix is pending.',
 V04:'ART-01 turret states bind to turretPresentation and shared enemyMuzzle line.',
 V05:'ART-02/03 bind security walker and ram charge states; full combat sequence review is pending.',
 V06:'ART-04/05/06 bind cell, repair and cache states to room/session data.',
 V07:'ART-07–13 bind hazards/materials/shutters; E01 restore_power opens the actual model gate.',
 V08:'ART-16 binds regulator phase and disabled states; boss sequence review is pending.',
 V09:'R01–R05 repair labels are read from RoomDefinition/safeZone slot data.',
 V10:'ART-14 terminals and ART-18–21 sector landmarks bind to mission room ids.',
};
const fixes=Object.keys(vEvidence).map(id=>({id,generated:false,processed:false,exported:false,integrated:true,automated_verified:id==='V01',visually_verified:false,published:false,not_applicable:['generated','processed','exported'],evidence:vEvidence[id],pending:id==='V01'?['Browser click/focus and responsive map screenshot']:['Automated viewport/state verification','Visual review at production/mobile scale']}));
await writeFile(base+'coverage.json',JSON.stringify({version:'art-refresh-v1',build_id:'0.6.1-art.1',baseline_source_sha:'317f423a57b844fe18ac29fd07a8fb89bd7f5f22',generated_at:'2026-11-08',status:'pre-deployment; visual and publication flags are deliberately open',families:familyCoverage,visual_fixes:fixes},null,2)+'\n');
const refs={};for(const path of prompts.reference_sources){refs[path]=hash(await readFile(path));}
const extras=[];
const alternate='art/art-refresh-v1/source/generated/turret-states-master.png';
try{const b=await readFile(alternate);extras.push({source:alternate,sha256:hash(b),selected:false,reason:'Rejected: background contains dark gradient/halo and the image is not a clean transparent, model-aligned six-state master.'});}catch{}
extras.push({generation_id:'exec-81539cdc-a729-46de-bd90-b1b3ef2ecfa1',family:'ART-15',selected:false,reason:'Rejected: original buffer/discharge sheet included Mira in each frame; replaced with the effect-only transparent corrective generation.'});
const promptByFamily=new Map(prompts.families.map(f=>[f.id,f]));
const provenance={version:'art-refresh-v1',source_work_order:prompts.source_work_order,baseline_source_sha:'317f423a57b844fe18ac29fd07a8fb89bd7f5f22',tool:{name:'OpenAI image_gen',model_identifier:'not present in persisted generation output'},references:Object.entries(refs).map(([path,sha256])=>({path,sha256})),generation_prompt_record:base+'generation-prompts.json',prompt_recovery_note:prompts.prompt_recovery_note,selected:inventory.families.map(f=>{const p=promptByFamily.get(f.family);return{family:f.family,id:f.id,generation_id:ids[f.family],master:f.source,sha256:f.source_sha256,selected_variant:'single supplied master',prompt_mode:p.prompt_mode||'text-to-image; exact historical text unavailable',prompt_record:p.exact_prompt_used||p.reconstructed_prompt};}),processing:{editable_source_format:'OpenRaster (.ora), one editable layer per generated state frame; object subparts remain flattened because the generator supplied flattened raster masters.',command:'npm run art:refresh',steps:['split source grid by documented family layout; omit unused grid cells','create one full-source-canvas OpenRaster layer per frame/state','crop visible alpha bounds for runtime export','nearest-neighbour fit within a 96x96 transparent frame with common 8px safety inset','snap alpha to binary at threshold 128; clear RGB on transparent pixels','pack into PNG atlas with 2px inter-frame padding and rotation/trim disabled'],limitations:['No separate armor/core/background component masks exist in the flattened generated masters.','ART-01–14 and ART-16–21 prompts are labeled reconstructions, not verbatim prompt history.','Human/mobile/mono runtime acceptance remains open.']},rejected_variants:extras};
await writeFile(base+'provenance.json',JSON.stringify(provenance,null,2)+'\n');
const rooms={
 'ART-01':['E','F','G','M4C','M5A'],'ART-02':['D','G','M4C','M5A'],'ART-03':['M3A','M3C','M3D','M4D','E06'],'ART-04':['F','G'],'ART-05':['B','F','M3D','M4C','M5C'],'ART-06':['M3C','M4B','M5B'],'ART-07':['M3C'],'ART-08':['M3C','M5B','E04'],'ART-09':['E'],'ART-10':['M3B','M3D','M4C'],'ART-11':['M4A','M4B','M5A','M5B'],'ART-12':['M3A','M4A','M5A'],'ART-13':['B','F'],'ART-14':['all rooms with terminals'],'ART-15':['D2/D3 buffer-capable combat rooms'],'ART-16':['M5D'],'ART-17':['M5C','M5E'],'ART-18':['D','E','F','G'],'ART-19':['M3A','M3B','M3C','M3D'],'ART-20':['M4A','M4B','M4C','M4D'],'ART-21':['M5A','M5B','M5C','M5D','M5E']
};
const superseded=new Set(['cargo_turret_states','cargo_security_walker','cargo_energy_cell','service_repairs_R01_R02','cargo_short_passage_gate']);
const contractPath='art/m06/quality-runtime-art-contract.json',oldContract=JSON.parse(await readFile(contractPath,'utf8'));
oldContract.version='m06-quality-art-1.3';oldContract.scope='M06.1 art refresh: 21 generated families, V01–V10 visual fixes, source/runtime contracts, ongoing visual and production acceptance';
oldContract.assets=oldContract.assets.filter(a=>!superseded.has(a.asset_id));
for(const f of familyCoverage){const family=inventory.families.find(x=>x.family===f.family),pivot=runtime.frames[family.id+'_'+family.states[0]].pivot;oldContract.assets.push({asset_id:'art_refresh_v1_'+family.id,source:'art/art-refresh-v1/'+family.source,runtime:'games/cinder-shift/public/assets/art-refresh-v1/art-refresh-v1.png · frame prefix '+family.id,anchor:'shared '+pivot.join(',')+' pixel pivot on 96x96 frame',states:family.states,rooms:rooms[f.family],connected:f.integrated,state_bindings_complete:f.frames.every(s=>s.integrated),runtime_frames:f.frames.map(s=>({state:s.state,frame:s.frame,integrated:s.integrated})),evidence:runtimeBindings[f.family]});}
oldContract.coverage_file='art/art-refresh-v1/coverage.json';oldContract.provenance_file='art/art-refresh-v1/provenance.json';
oldContract.not_yet_verified=['Full in-game screenshot matrix for 20 campaign rooms and training','State-transition screenshots at 1x, 2x and target mobile scale','Requested viewport matrix for map, workshop, touch controls and combat','Human monochrome, contrast, focus and reduced-flash review','Physical-device review','Production CSP, old-save, cache, loading, pause/resume and deployment verification'];
await writeFile(contractPath,JSON.stringify(oldContract,null,2)+'\n');
console.log('Wrote art provenance and per-family/V01–V10 coverage records.');
