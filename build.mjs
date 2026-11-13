import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {studyGuide} from './src/study-export.js';
import {photos as benchPhotos} from './src/pv-bench/credits.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const benchFile='bancada-fotovoltaica.html';

async function buildPVBench(logo) {
 const source=join(root,'src/pv-bench');
 const images={logo};
 await Promise.all(Object.keys(benchPhotos).map(async key=>{
  images[key]='data:image/webp;base64,'+(await readFile(join(root,'assets/pv-bench',key+'.webp'))).toString('base64');
 }));
 const entry=await readFile(join(source,'app.mjs'),'utf8');
 const {outputFiles}=await build({
  stdin:{contents:entry.replace('/* APP_ASSETS */ {}',()=>JSON.stringify(images)),resolveDir:source},
  bundle:true,minify:true,write:false,format:'iife',target:['es2022']
 });
 const script=outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
 const css=await readFile(join(source,'bench.css'),'utf8');
 const template=await readFile(join(source,'template.html'),'utf8');
 return template.replace('/* APP_STYLE */',()=>css).replace('/* APP_SCRIPT */',()=>script);
}

await mkdir(join(root,'dist'),{recursive:true});
const cli=JSON.parse(await readFile(join(root,'node_modules/@tailwindcss/cli/package.json'),'utf8'));
execFileSync(process.execPath,[join(root,'node_modules/@tailwindcss/cli',cli.bin.tailwindcss),'-i',join(root,'styles.css'),'-o',join(root,'dist/styles.css'),'--minify'],{cwd:root,stdio:'inherit'});
await Promise.all([
 build({absWorkingDir:root,entryPoints:['src/App.tsx'],loader:{'.ttf':'base64'},outfile:'dist/app.js',bundle:true,minify:true,format:'iife',target:['es2022'],define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'}),
 build({absWorkingDir:root,entryPoints:['src/pv-report-engine.ts'],outfile:'server/pv-report-model.mjs',bundle:true,platform:'node',format:'esm',target:['node22'],minify:false}),
 build({absWorkingDir:root,entryPoints:['src/energy.ts'],outfile:'server/energy-model.mjs',bundle:true,platform:'node',format:'esm',target:['node22'],minify:false}),
 build({absWorkingDir:root,entryPoints:['src/amazon-engine.ts'],outfile:'server/amazon-model.mjs',bundle:true,platform:'node',format:'esm',target:['node22'],minify:false}),
 build({absWorkingDir:root,entryPoints:['src/profiles.ts'],outfile:'server/profile-model.mjs',bundle:true,platform:'node',format:'esm',target:['node22'],minify:false}),
 build({absWorkingDir:root,entryPoints:['src/learning-schema.ts'],outfile:'server/learning-model.mjs',bundle:true,platform:'node',format:'esm',target:['node22'],minify:false})
]);
const imageKeys=['biomass','solar','wind','hydro','tidal','carbon-cover','carbon-microgrid','carbon-industry'];const images={};for(const k of imageKeys)images[k]='data:image/webp;base64,'+(await readFile(join(root,'assets',k+'.webp'))).toString('base64');
const hotspots=JSON.parse(await readFile(join(root,'assets/hotspots.json'),'utf8'));
const institutionalLogo='data:image/webp;base64,'+(await readFile(join(root,'assets/logo-senai-hub.webp'))).toString('base64');
const benchHTML=await buildPVBench(institutionalLogo);
await writeFile(join(root,'dist',benchFile),benchHTML);
const css=await readFile(join(root,'dist/styles.css'),'utf8'),js=(await readFile(join(root,'dist/app.js'),'utf8')).replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html><html lang="pt-BR" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="theme-color" content="#0a1220"><meta name="description" content="BioEnergia Academy — plataforma de aprendizagem e simulação em energias renováveis."><title>BioEnergia Academy</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230b1929'/%3E%3Cpath d='m38 8-24 27h17l-5 21 25-29H34Z' fill='%2341d6b3'/%3E%3C/svg%3E"><style>${css}</style></head><body><div id="root"></div><noscript>Ative o JavaScript para utilizar os simuladores. / Enable JavaScript to use the simulators. / Activa JavaScript para usar los simuladores.</noscript><script>const SENAI_HUB_LOGO=${JSON.stringify(institutionalLogo)};const BIO_ASSETS=${JSON.stringify(images)};const BIO_HOTSPOTS=${JSON.stringify(hotspots)};${js}</script></body></html>`;
const manifestLink='<link rel="manifest" href="./manifest.webmanifest">';
const portable=html.replace('<script>','<script>const BIO_PV_BENCH='+JSON.stringify(Buffer.from(benchHTML).toString('base64'))+';');
await writeFile(join(root,'dist/index.html'),portable.replace('</head>',manifestLink+'</head>'));
await Promise.all(['manifest.webmanifest','app-icon.svg','app-icon-192.png','app-icon-512.png'].map(name=>copyFile(join(root,'public',name),join(root,'dist',name))));
await copyFile(join(root,'assets/logo-senai-hub.webp'),join(root,'dist/logo-senai-hub.webp'));
await writeFile(join(root,'dist/apostila-amazonia.html'),studyGuide(JSON.parse(await readFile(join(root,'src/amazon-lessons.json'),'utf8')),'pt',institutionalLogo));
const sw=(await readFile(join(root,'public/sw.template.js'),'utf8')).replace('__BUILD_HASH__',createHash('sha256').update(html).update(benchHTML).digest('hex').slice(0,16)).replace('__SHELL_FILES__',JSON.stringify(['index.html','manifest.webmanifest','app-icon.svg','app-icon-192.png','app-icon-512.png','logo-senai-hub.webp','apostila-amazonia.html',benchFile]));
await writeFile(join(root,'dist/sw.js'),sw);
const dest=join(root,'dist/index.html');
await writeFile(join(root,'dist/qa-mobile.html'),'<!doctype html><html><meta name="viewport" content="width=device-width"><title>Verificação móvel</title><style>body{margin:0;display:flex;justify-content:center;background:#273344}iframe{width:390px;height:844px;border:0}</style><iframe src="index.html" title="Plataforma no celular"></iframe></html>');
console.log(JSON.stringify({html:dest,bytes:Buffer.byteLength(html),technology:'React + TypeScript + Tailwind CSS',images:imageKeys.length,offline:true}));

// Modular distribution for PWA and community installations. The standalone HTML stays available.
const web=join(root,'dist/web');await mkdir(join(web,'assets'),{recursive:true});
const modularAssets=Object.fromEntries(imageKeys.map(key=>[key,'./assets/'+key+'.webp']));
const config=`const SENAI_HUB_LOGO=${JSON.stringify(institutionalLogo)};const BIO_ASSETS=${JSON.stringify(modularAssets)};const BIO_HOTSPOTS=${JSON.stringify(hotspots)};`;
const modular=html.replace('<html lang=', '<html data-distribution="modular" lang=').replace('<style>'+css+'</style>','<link rel="stylesheet" href="./styles.css">').replace(/<script>[\s\S]*?<\/script>/,'<script src="./config.js"></script><script src="./app.js" defer></script>').replace('</head>',manifestLink+'</head>');
await writeFile(join(web,'index.html'),modular);
await writeFile(join(web,'config.js'),config);
await copyFile(join(root,'dist/app.js'),join(web,'app.js'));await copyFile(join(root,'dist/styles.css'),join(web,'styles.css'));
const shell=['index.html','app.js','styles.css','config.js','manifest.webmanifest','app-icon.svg','app-icon-192.png','app-icon-512.png','logo-senai-hub.webp','apostila-amazonia.html','plataforma-portatil.html',benchFile,...imageKeys.map(key=>'assets/'+key+'.webp')];
for(const key of imageKeys)await copyFile(join(root,'assets',key+'.webp'),join(web,'assets',key+'.webp'));
for(const name of ['manifest.webmanifest','app-icon.svg','app-icon-192.png','app-icon-512.png','logo-senai-hub.webp','apostila-amazonia.html',benchFile])await copyFile(join(root,'dist',name),join(web,name));
await copyFile(join(root,'dist/index.html'),join(web,'plataforma-portatil.html'));
const digest=createHash('sha256');for(const file of shell)digest.update(await readFile(join(web,file)));
const modularWorker=(await readFile(join(root,'public/sw.template.js'),'utf8')).replace('__BUILD_HASH__',digest.digest('hex').slice(0,16)).replace('__SHELL_FILES__',JSON.stringify(shell));
await writeFile(join(web,'sw.js'),modularWorker);
console.log(JSON.stringify({modular:join(web,'index.html'),cachedFiles:shell.length}));
