import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const meta=JSON.parse(await readFile('games/cinder-shift/src/art/regulator.generated.json','utf8'));
const source=await readFile(meta.source),runtime=await readFile('games/cinder-shift/public/assets/rework/'+meta.file);
assert.deepEqual(runtime,source,'Robot runtime preserves the original generated PNG');
assert.equal(createHash('sha256').update(runtime).digest('hex'),meta.sha256);
const image=await sharp(runtime).metadata();
assert.ok(image.hasAlpha&&image.width<=2048&&image.height<=2048,'Transparent mobile-size robot texture');
assert.ok(runtime.length<2*1024*1024,'Robot PNG budget');
const main=await readFile('games/cinder-shift/src/main.ts','utf8');
assert.ok(!main.includes('__ENCOUNTER__'),'Fixtures are absent from the production entry');
console.log(`Rework robot source/runtime hash OK; ${image.width}x${image.height}, ${Math.round(runtime.length/1024)} KiB; fixture isolation OK.`);
