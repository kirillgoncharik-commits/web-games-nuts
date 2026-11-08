import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const targetManifest=JSON.parse(readFileSync('games/cinder-shift/platforms/targets.json','utf8'));
const target=process.env.CINDER_TARGET||targetManifest.default_target;
const targetProfile=targetManifest.targets[target];
if(!targetProfile)throw Error('unknown_build_target:'+target);
if (process.env.SOURCE_SHA && process.env.SOURCE_SHA !== sha) throw Error('SOURCE_SHA differs from checkout');
export default defineConfig({
  root: 'games/cinder-shift',
  base: './',
  define: { __BUILD_ID__: JSON.stringify(version), __SOURCE_SHA__: JSON.stringify(sha), __BUILD_TARGET__:JSON.stringify(target), __TARGET_PROFILE__:JSON.stringify(targetProfile) },
  build: { outDir: '../../dist/cinder-shift', emptyOutDir: true, chunkSizeWarningLimit: 1600 },
});
