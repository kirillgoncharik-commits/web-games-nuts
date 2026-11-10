import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve(process.env.PREVIEW_ROOT || 'dist');
const port=Number(process.env.PORT || 4175);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.svg':'image/svg+xml'};
const mute=process.env.CINDER_QA_MUTE==='1';
const mutedAudio=`
  (() => {
    const originalConnect = AudioNode.prototype.connect;
    const silentOutputs = new WeakMap();
    AudioNode.prototype.connect = function (destination, ...args) {
      if (destination !== this.context.destination) {
        return originalConnect.call(this, destination, ...args);
      }
      let silent = silentOutputs.get(this.context);
      if (!silent) {
        silent = this.context.createGain();
        silent.gain.value = 0;
        originalConnect.call(silent, destination);
        silentOutputs.set(this.context, silent);
      }
      originalConnect.call(this, silent, ...args);
      return destination;
    };
  })();
`;
const csp="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'";
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(mute && url.pathname==='/qa-audio-muted.js'){
      res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
      res.end(mutedAudio);return;
    }
    if(url.pathname==='/iframe-test.html'){
      res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':csp});
      res.end('<!doctype html><html><head><title>Iframe QA</title></head><body><iframe title="Cinder Shift" src="/games/cinder-shift/" width="1100" height="850" allow="gamepad; fullscreen"></iframe></body></html>');return;
    }
    let path=decodeURIComponent(url.pathname);
    // Standalone preview uses the final nested URL, exactly as site integration does.
    if(!process.env.PREVIEW_ROOT && path.startsWith('/games/'))path=path.slice('/games'.length);
    let file=resolve(root,'.'+path);if(file!==root && !file.startsWith(root+sep))throw Error('invalid path');
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    const extension=extname(file);
    let body=await readFile(file);
    if(mute && extension==='.html'){
      body=body.toString().replace(/<head>/i,'<head><script src="/qa-audio-muted.js"></script>');
    }
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Content-Security-Policy':csp,'Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}/games/cinder-shift/`));
