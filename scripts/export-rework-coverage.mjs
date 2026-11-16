import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const coverage=JSON.parse(await readFile('docs/cinder-shift/rework-coverage.json','utf8'));
const sources=JSON.parse(await readFile('docs/cinder-shift/request-source-aliases.json','utf8'));
const requirements=coverage.requirements;
assert.equal(requirements.length,80);assert.equal(new Set(requirements.map(r=>r.id)).size,80);
const header=['request_id','row_type','canonical_ids','sprint_owner','requirement','implementation','verification','files','evidence','publication'];
const rows=requirements.map(r=>[r.id,'canonical',r.id,r.sprint_owner||'',r.requirement,r.implementation_status||r.status,r.verification_status||r.status,(r.current_engineering_evidence?.files||[]).join(' | '),(r.current_engineering_evidence?.reports||r.evidence||[]).join(' | '),r.publication||'']);
for(const [alias,packages] of Object.entries(sources.source_alias_packages)){
 const targets=requirements.filter(r=>packages.includes(r.id.slice(0,5)));assert(targets.length>0,alias);
 rows.push([alias,'source_package_alias',targets.map(r=>r.id).join(' | '),[...new Set(targets.map(r=>r.sprint_owner))].join(' | '),'Package-level source mapping; see canonical rows','SEE_CANONICAL_ROWS','NO_SEPARATE_PASS_CLAIM','SEE_CANONICAL_ROWS','request-source-aliases.json / source version '+sources.source_version,'SEE_CANONICAL_ROWS']);
}
const quote=v=>'"'+String(v).replaceAll('"','""')+'"';
await writeFile('docs/cinder-shift/request-coverage.csv',[header,...rows].map(r=>r.map(quote).join(',')).join('\n')+'\n');
console.log(`Coverage: ${requirements.length} canonical requirements, ${rows.length-requirements.length} source aliases; ${rows.length} table rows.`);
