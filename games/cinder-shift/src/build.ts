export type BuildMetadata={experiment?:{id:string;variant:string;base_sha:string;rooms:string[];end_room:string;analytics:string;save_namespace:string};version:string;release_id:string;milestone:string;source_sha:string;source_dirty:boolean;build_id:string;built_at_utc:string;channel:string;notes_id:string};
declare const __BUILD_META__:BuildMetadata;
export const buildMetadata:Readonly<BuildMetadata>=Object.freeze(__BUILD_META__);
export function buildLabel(){return `${buildMetadata.experiment?'C01 TEST '+buildMetadata.experiment.variant+' · ':''}v${buildMetadata.version} · rev ${buildMetadata.source_sha.slice(0,7)}${buildMetadata.source_dirty?'*':''} · build ${buildMetadata.build_id}`;}
export function buildDiagnostics(){return JSON.stringify(buildMetadata,null,2);}
