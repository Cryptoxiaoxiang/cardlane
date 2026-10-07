import fs from 'node:fs/promises';import {build} from 'esbuild';import {createHash} from 'node:crypto';
await build({entryPoints:['lit/action.ts'],outfile:'generated/action-template.js',bundle:true,format:'iife',globalName:'CardLaneAction',platform:'browser',target:'es2022',minify:true});
const bytes=await fs.readFile('generated/action-template.js');await fs.writeFile('generated/action-release.json',JSON.stringify({version:1,sha256:createHash('sha256').update(bytes).digest('hex')},null,2)+'\n');console.log('Built immutable Lit action template ('+bytes.length+' bytes)');
