import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const sha = process.env.SOURCE_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
export default defineConfig({
  root: 'games/cinder-shift',
  base: './',
  define: { __BUILD_ID__: JSON.stringify(version), __SOURCE_SHA__: JSON.stringify(sha) },
  build: { outDir: '../../dist/cinder-shift', emptyOutDir: true, chunkSizeWarningLimit: 1600 },
});
