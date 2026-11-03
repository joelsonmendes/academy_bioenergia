import {readFile,writeFile,mkdir,lstat,copyFile,rename,chmod,access} from 'node:fs/promises';
import {dirname,join,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {communityBase,DESKTOP_PORT} from './desktop-server.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=path=>access(path).then(()=>true).catch(()=>false);
export async function validateDistribution(root,{checkPlatform=true}={}){
 const raw=await readFile(join(root,'distribution.json'));
 const manifest=JSON.parse(raw);
 if(manifest.application!=='bioenergia-community'||manifest.schema!==1||!/^\d+\.\d+\.\d+$/.test(manifest.version)||!['win-x64','linux-x64'].includes(manifest.platform)||!Array.isArray(manifest.files)||manifest.files.length>250)throw new Error('Pacote inválido.');
 if(checkPlatform&&manifest.platform!==(process.platform==='win32'?'win':process.platform)+'-'+process.arch)throw new Error('Este pacote não corresponde ao sistema/arquitetura do computador.');
 const paths=new Set();let total=0;
 for(const entry of manifest.files){
  if(typeof entry.path!=='string'||isAbsolute(entry.path)||entry.path.includes('\\')||entry.path.split('/').some(p=>!p||p.startsWith('.'))||paths.has(entry.path)||!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<0)throw new Error('Manifesto inválido.');
  paths.add(entry.path);total+=entry.bytes;if(total>250_000_000)throw new Error('Pacote acima do limite.');
  let parent=root;for(const part of entry.path.split('/').slice(0,-1)){parent=join(parent,part);if((await lstat(parent)).isSymbolicLink())throw new Error('Pasta simbólica recusada.');}
  const path=join(root,entry.path),info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||info.size!==entry.bytes||hash(await readFile(path))!==entry.sha256)throw new Error('Arquivo alterado ou incompleto: '+entry.path);
 }
 for(const required of ['web/index.html','web/app.js','web/styles.css','offline/desktop-server.mjs','offline/desktop-store.mjs','offline/install.mjs','server/learning-model.mjs','server/profile-model.mjs',manifest.platform==='win-x64'?'runtime/node.exe':'runtime/node'])if(!paths.has(required))throw new Error('Arquivo obrigatório ausente: '+required);
 return {manifest,raw,identity:manifest.version+'-'+hash(raw).slice(0,12)};
}
async function activeServer(){try{const response=await fetch('http://127.0.0.1:'+DESKTOP_PORT+'/api/offline/status',{signal:AbortSignal.timeout(1000)});return (await response.json()).application==='bioenergia-community';}catch{return false;}}
function launchers(identity){
 const windows='@echo off\r\nchcp 65001 >nul\r\n"%~dp0releases\\'+identity+'\\runtime\\node.exe" "%~dp0releases\\'+identity+'\\offline\\desktop-server.mjs" --open --data "%~dp0cadernos"\r\nif errorlevel 1 pause\r\n';
 const linux='#!/bin/sh\nset -eu\nbioenergia_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nexec "$bioenergia_root/releases/'+identity+'/runtime/node" "$bioenergia_root/releases/'+identity+'/offline/desktop-server.mjs" --open --data "$bioenergia_root/cadernos"\n';
 return {windows,linux};
}
async function atomicText(path,text){const temporary=path+'.'+randomUUID()+'.tmp';await writeFile(temporary,text,{mode:0o600});await rename(temporary,path);}
async function shortcut(base,identity){
 if(process.platform==='win32'){
  let desktop;try{desktop=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"[Environment]::GetFolderPath('Desktop')"],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();}catch{return false;}
  if(!desktop||/[\r\n]/.test(desktop))return false;
  let target=join(desktop,'BioEnergia Academy.cmd');
  if(await exists(target)){const old=await readFile(target,'utf8');if(!old.includes('BioEnergiaAcademy'))target=join(desktop,'BioEnergia Academy '+identity+'.cmd');}
  const cmd='@echo off\r\nrem BioEnergiaAcademy\r\ncall "'+join(base,'INICIAR.cmd').replace(/%/g,'%%')+'"\r\n';await atomicText(target,cmd);return true;
 }
 const applications=join(process.env.XDG_DATA_HOME??join(homedir(),'.local','share'),'applications');await mkdir(applications,{recursive:true});
 const quote=value=>'"'+value.replace(/[\\"`$]/g,c=>'\\'+c)+'"';
 await atomicText(join(applications,'bioenergia-academy.desktop'),'[Desktop Entry]\nType=Application\nName=BioEnergia Academy\nComment=Laboratório educacional offline de energias renováveis\nExec=sh '+quote(join(base,'INICIAR.sh'))+'\nIcon='+join(base,'releases',identity,'web','app-icon.svg')+'\nTerminal=true\nCategories=Education;Science;\n');return true;
}
export async function installDistribution(root,{destination=communityBase(),checkPlatform=true,checkRunning=true,createShortcut=true}={}){
 if(/[\r\n\0]/.test(destination))throw new Error('Caminho de instalação inválido.');
 const validated=await validateDistribution(root,{checkPlatform});
 if(checkRunning&&await activeServer())throw new Error('Feche a janela Comunidade Offline (Ctrl+C) antes de instalar ou atualizar. Os cadernos serão preservados.');
 const base=resolve(destination),releases=join(base,'releases'),staging=join(releases,'.preparando-'+randomUUID()),release=join(releases,validated.identity);
 let reusable=false;if(await exists(release))try{reusable=(await validateDistribution(release,{checkPlatform})).identity===validated.identity;}catch{}
 await mkdir(join(base,'cadernos'),{recursive:true,mode:0o700});
 if(!reusable){
  await mkdir(staging,{recursive:true,mode:0o700});
  for(const entry of validated.manifest.files){const target=join(staging,entry.path);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,entry.path),target);if(entry.path==='runtime/node')await chmod(target,0o755);}
  await writeFile(join(staging,'distribution.json'),validated.raw);
  if(await exists(release))await rename(release,release+'-anterior-'+randomUUID());
  await rename(staging,release);
 }
 // The launcher changes only after a complete, verified release is on disk.
 const launcher=launchers(validated.identity);
 await atomicText(join(base,'INICIAR.cmd'),launcher.windows);await atomicText(join(base,'INICIAR.sh'),launcher.linux);await chmod(join(base,'INICIAR.sh'),0o755);
 await atomicText(join(base,'installation.json'),JSON.stringify({application:'bioenergia-community',version:validated.manifest.version,release:validated.identity,installedAt:new Date().toISOString(),notebooks:'cadernos'})+'\n');
 let shortcutCreated=false;if(createShortcut)try{shortcutCreated=await shortcut(base,validated.identity);}catch{}
 return {base,version:validated.manifest.version,release:validated.identity,shortcutCreated};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),i=args.indexOf('--destination');
 try{const result=await installDistribution(join(here,'..'),{destination:i<0?undefined:args[i+1],createShortcut:!args.includes('--no-shortcut')});console.log('\nINSTALAÇÃO CONCLUÍDA — BioEnergia '+result.version+'\n\nPasta: '+result.base+'\nAbra INICIAR.cmd (Windows) ou INICIAR.sh (Linux).\nOs cadernos ficam em uma pasta separada chamada cadernos.\nAtualizações não removem os trabalhos nem as versões anteriores.\n'+(result.shortcutCreated?'Atalho criado.':'Use o iniciador da pasta de instalação.'));}catch(error){console.error('\nInstalação não concluída: '+error.message);process.exitCode=1;}
}
