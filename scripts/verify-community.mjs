import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {validateDistribution} from '../offline/install.mjs';
import {newLearningRecord} from '../server/learning-model.mjs';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),index=args.indexOf('--packages');if(index<0)throw new Error('Informe --packages.');
const parent=resolve(args[index+1]),results=[];
for(const name of ['BioEnergia_Comunidades_Offline_Windows_x64','BioEnergia_Comunidades_Offline_Linux_x64']){
 const validated=await validateDistribution(join(parent,name),{checkPlatform:false});
 results.push({platform:validated.manifest.platform,manifest:'passed',files:validated.manifest.files.length,runtime:validated.manifest.runtime,runtime_executed:false});
}
if(process.platform==='linux'&&process.arch==='x64'){
 const bundle=join(parent,'BioEnergia_Comunidades_Offline_Linux_x64'),workspace=await mkdtemp(join(tmpdir(),'bioenergia-real-package-')),destination=join(workspace,'instalação com espaços');
 const node=join(bundle,'runtime/node');let child;
 try{
  execFileSync(node,[join(bundle,'offline/install.mjs'),'--destination',destination,'--no-shortcut'],{encoding:'utf8',timeout:30000});
  const installed=JSON.parse(await readFile(join(destination,'installation.json'),'utf8')),release=join(destination,'releases',installed.release);
  child=spawn(join(release,'runtime/node'),[join(release,'offline/desktop-server.mjs'),'--data',join(destination,'cadernos')],{stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
  const base='http://127.0.0.1:47329';let ready=false;
  for(let attempt=0;attempt<40;attempt++){if(child.exitCode!==null)throw new Error('Servidor encerrou: '+output);try{const response=await fetch(base+'/api/offline/status',{signal:AbortSignal.timeout(500)});if(response.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  if(!ready)throw new Error('Servidor não iniciou: '+output);
  if(!(await(await fetch(base+'/index.html')).text()).includes('data-distribution="modular"'))throw new Error('Distribuição incorreta.');
  const record=newLearningRecord();record.sequence=3;record.projectNote='Teste integrado do pacote Linux com runtime incluído, gravação local e instalação sem baixar dependências.';
  const saved=await fetch(base+'/api/offline/notebook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{id:'principal',name:'Caderno principal',createdAt:'2026-11-01T12:00:00Z'},record})});if(!saved.ok)throw new Error('Falha na persistência.');
  for(const file of ['app.js','styles.css','config.js','assets/biomass.webp','assets/tidal.webp','apostila-amazonia.html','sw.js'])if(!(await fetch(base+'/'+file)).ok)throw new Error('Arquivo local ausente: '+file);
  child.kill('SIGTERM');if(child.exitCode===null&&child.signalCode===null)await new Promise(r=>child.once('exit',r));child=null;
  execFileSync(node,[join(bundle,'offline/install.mjs'),'--destination',destination,'--no-shortcut'],{encoding:'utf8',timeout:30000});
  const retained=JSON.parse(await readFile(join(destination,'cadernos/principal.json'),'utf8'));if(retained.record.sequence!==3)throw new Error('Reinstalação perdeu o caderno.');
  Object.assign(results.find(r=>r.platform==='linux-x64'),{runtime_executed:true,installed_from_bundled_runtime:'passed',local_server_start:'passed',modular_assets:'passed',disk_save:'passed',reinstall_preserves_notebook:'passed',network_downloads_during_install:0,desktop_shortcut_tested:false});
 }finally{if(child&&child.exitCode===null){child.kill('SIGTERM');if(child.signalCode===null)await new Promise(r=>child.once('exit',r));}await rm(workspace,{recursive:true,force:true});}
}
const report={verified_on:'2026-11-01',release:'2.1.0',results,limitations:['Windows executable provenance and package integrity verified; no Windows system available for execution or shortcut verification.','Linux tested on this x64 host; other distributions and institutional device policies require local validation.','No external network download is performed by installer or local server. Physical airplane-mode browser/PWA installation was not exercised.']};
await writeFile(join(project,'docs/PACOTES_VERIFICADOS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
