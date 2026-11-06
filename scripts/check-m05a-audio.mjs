import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const registry=JSON.parse(await readFile('audio/m05a/registry.json','utf8'));
assert.equal(Object.keys(registry.sfx).length,20);assert.equal(Object.keys(registry.music).length,2);assert.equal(registry.sampleRate,44100);assert(registry.bpm>=100&&registry.bpm<=112);
const report={sampleRate:44100,channels:1,bits:16,sfx:20,music:2,files:[],maximumMasterPeak:0};
for(const [id,item]of [...Object.entries(registry.sfx),...Object.entries(registry.music)]){
 const b=await readFile('games/cinder-shift/public/assets/audio/'+item.file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,16),'WAVEfmt ');assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);assert.equal(b.readUInt32LE(40),b.length-44);assert.equal(createHash('sha256').update(b).digest('hex'),item.sha256);
 const n=(b.length-44)/2,seconds=n/44100;let peak=0,sum=0;for(let i=0;i<n;i++){const v=b.readInt16LE(44+i*2)/32767;peak=Math.max(peak,Math.abs(v));sum+=v*v;}const rms=Math.sqrt(sum/n);assert(peak<=item.peak+1/32767);assert(rms>.005);assert(peak<1);
 if(id==='menu'||id==='combat'){assert.equal(b.readInt16LE(44),0);assert.equal(b.readInt16LE(b.length-2),0);assert(Math.abs(seconds-item.bars*4*60/registry.bpm)<1/44100);assert.equal(item.bars,id==='menu'?8:16);}else if(id.startsWith('mission_'))assert(seconds>=.5&&seconds<=1);else assert(seconds>=.02&&seconds<=.28003,id+' duration');
 report.files.push({id,seconds,peak,rms,sha256:item.sha256});
}
// Worst case: all bus controls at 100%, eight loudest short cues plus one result and music.
report.maximumMasterPeak=(8*.25+.3+.18)*.32;assert(report.maximumMasterPeak<1);console.log(JSON.stringify(report,null,2));
