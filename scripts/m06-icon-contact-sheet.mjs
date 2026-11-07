import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=process.cwd();
const source=await readFile(path.join(root,'games/cinder-shift/src/ui/research-icons.ts'),'utf8');
const block=source.match(/const drawings:[^{]+\{([\s\S]*?)\n\};/);
if(!block)throw new Error('Could not read the research icon source map.');
const drawings=Object.fromEntries([...block[1].matchAll(/^\s*(W[1-4]|M[1-4]|D[1-4]):'([^']+)'[,]?$/gm)].map(([,id,svg])=>[id,svg]));
const ids=['W1','W2','W3','W4','M1','M2','M3','M4','D1','D2','D3','D4'];
if(ids.some(id=>!drawings[id])||Object.keys(drawings).length!==ids.length)throw new Error('Expected one unique drawing for each of the 12 modules.');
const stateBlock=source.match(/export const moduleStateDrawings=\{([\s\S]*?)\n\};/);
if(!stateBlock)throw new Error('Could not read the module state marks.');
const stateDrawings=Object.fromEntries([...stateBlock[1].matchAll(/^\s*'?([a-z-]+)'?:'([^']+)'[,]?$/gm)].map(([,id,svg])=>[id,svg]));
const states=['available','selected','locked','no-points','purchased','equipped'];
if(states.some(id=>!stateDrawings[id]))throw new Error('Expected six explicit module selection states.');

const sizes=[24,32,48],width=620,rowHeight=60,baseHeight=72+ids.length*rowHeight,height=baseHeight+146;
const labels=sizes.map((size,index)=>`<text x="${[260,380,510][index]}" y="38" class="column">${size}px</text>`).join('');
const rows=ids.map((id,index)=>{
 const y=70+index*rowHeight,icons=sizes.map((size,column)=>{
  const x=[260,380,510][column],left=x-size/2,top=y-size/2;
  return`<rect x="${x-31}" y="${y-27}" width="62" height="54" class="swatch"/><g transform="translate(${left} ${top}) scale(${size/64})" class="icon">${drawings[id]}</g>`;
 }).join('');
 return`<g><path d="M16 ${y+29}H604" class="rule"/><text x="22" y="${y+5}" class="node">${id}</text>${icons}</g>`;
}).join('');
const stateColors={available:'#72909c',selected:'#dfa15c',locked:'#bac6c9','no-points':'#f36d76',purchased:'#76dcc8',equipped:'#76dcc8'};
const stateSamples=states.map((state,index)=>{
 const x=58+index*100,y=baseHeight+78;
 return`<g><rect x="${x-39}" y="${y-29}" width="78" height="62" class="swatch"/><g transform="translate(${x-24} ${y-22}) scale(.75)" class="icon">${drawings.W1}</g><g transform="translate(${x+10} ${y-30}) scale(.8)" class="state" style="color:${stateColors[state]}">${stateDrawings[state]}</g><text x="${x}" y="${y+47}" class="state-label" text-anchor="middle">${state}</text></g>`;
}).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><style>.bg{fill:#111823}.frame{fill:none;stroke:#72909c;stroke-width:2}.rule{stroke:#456171;stroke-width:1}.swatch{fill:#1b2939;stroke:#456171;stroke-width:1}.icon{fill:none;stroke:#f1d8ae;stroke-width:3.2;stroke-linecap:square;stroke-linejoin:miter}.state{fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:square;stroke-linejoin:miter}.node,.column,.state-label,.section{fill:#edf1ec;font:700 14px ui-monospace,monospace}.column{fill:#76dcc8}.state-label{font-size:9px}.section{fill:#dfa15c;font-size:12px}</style><rect width="${width}" height="${height}" class="bg"/><rect x="8" y="8" width="${width-16}" height="${height-16}" class="frame"/>${labels}${rows}<path d="M16 ${baseHeight}H604" class="rule"/><text x="22" y="${baseHeight+25}" class="section">STATUS MARKS · W1 SAMPLE</text>${stateSamples}</svg>`;
const out=path.join(root,'art/m06/previews');
await mkdir(out,{recursive:true});
await writeFile(path.join(out,'module-icons-contact-sheet.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(out,'module-icons-contact-sheet.png'));
await sharp(Buffer.from(svg)).resize({width:width*2}).png().toFile(path.join(out,'module-icons-contact-sheet-2x.png'));
const map=await readFile(path.join(root,'games/cinder-shift/src/ui/caldera-complex.svg'));
for(const size of [360,720,1200])await sharp(map).resize({width:size}).png().toFile(path.join(out,`caldera-complex-${size}.png`));
console.log(`Created contact sheets for ${ids.length} icons and map previews at 360, 720 and 1200 px.`);
