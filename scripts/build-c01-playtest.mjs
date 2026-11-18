import {execFileSync} from 'node:child_process';
import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const pair=resolve('dist/c01-playtest');
const builtAt=process.env.CINDER_BUILT_AT||execFileSync('git',['show','-s','--format=%cI','HEAD'],{encoding:'utf8'}).trim();
await rm(pair,{recursive:true,force:true});await mkdir(pair,{recursive:true});
const manifests=[];
for(const variant of ['A','B']){
 execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit',env:{...process.env,CINDER_BUILT_AT:builtAt,CINDER_TARGET:'web',CINDER_C01_PLAYTEST:variant}});
 const manifest=JSON.parse(await readFile('dist/cinder-shift/build-manifest.json','utf8'));
 if(manifest.source_dirty)throw Error('playtest_pair_requires_clean_commit');
 manifests.push(manifest);
 await cp('dist/cinder-shift',resolve(pair,variant.toLowerCase(),'games/cinder-shift'),{recursive:true});
}
await writeFile(resolve(pair,'comparison.json'),JSON.stringify({id:'c01-gate-v1',base_sha:'1eee69e8dfd4efaa9b3c203ae0c707d098ccb3db',source_sha:manifests[0].source_sha,variant_a:'baseline gameplay',variant_b:'A room experiment',start:'A',end:'B entry',variants:manifests.map(m=>({variant:m.experiment.variant,build_id:m.build_id,source_sha:m.source_sha,save_namespace:m.experiment.save_namespace}))},null,2)+'\n');
await writeFile(resolve(pair,'index.html'),`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Cinder Shift — C01 A/B</title><style>body{background:#101823;color:#d7e1e4;font:18px/1.6 system-ui;max-width:760px;padding:32px 24px;margin:auto}a{color:#76dcc8}.variants{display:flex;gap:20px;flex-wrap:wrap}.variants a{border:1px solid #456171;padding:18px 24px;border-radius:6px;text-decoration:none}small{color:#98adb8}code{overflow-wrap:anywhere}</style><h1>Cinder Shift · тест первого шлюза</h1><p>Оба варианта начинаются через обычное меню. Нажми «Новая смена», выбери подготовку и начни миссию. Замер заканчивается при переходе из комнаты A в B; дальше можно продолжать кампанию.</p><div class="variants"><a href="a/games/cinder-shift/?seed=4">A · исходный</a><a href="b/games/cinder-shift/?seed=4">B · эксперимент</a></div><p>У каждого варианта собственный профиль. «Чистый профиль» сбрасывает только выбранный вариант. Перед первым проходом не изучай второй вариант. Запиши прохождение с голосом и звуком игры; порядок A/B чередуем между участниками.</p><p>После прохода нажми «Скачать наблюдения»: файл содержит время до шлюза, события, параметры экрана, загрузку и FPS. Понимание цели и оценки управления записываются отдельно.</p><p><a href="playtest.csv" download>Таблица наблюдений</a> · <a href="comparison.json">Manifest A/B</a></p><small>Эксперимент c01-gate-v1 · source <code>${manifests[0].source_sha}</code><br>Тестовая сборка. Инженерная проверка не заменяет приёмку игроками.</small></html>`);
await writeFile(resolve(pair,'playtest.csv'),'participant,first_variant,variant,first_attempt,goal_understood_seconds,unnecessary_returns,deaths,time_to_gate_seconds,movement_1_5,combat_1_5,wants_replay,preferred_variant,notes\n');
await writeFile(resolve(pair,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log('C01 A/B preview: '+pair);
