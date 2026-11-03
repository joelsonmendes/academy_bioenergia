import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {request as httpRequest} from 'node:http';
import {createNotebookStore,createOfflineHandler} from '../offline/desktop-store.mjs';
import {createDesktopServer} from '../offline/desktop-server.mjs';
import {installDistribution,validateDistribution} from '../offline/install.mjs';
import {newLearningRecord} from './learning-model.mjs';
import {scopedKey,notebookKey,validProfile,createProfile,getProfiles} from './profile-model.mjs';
const profile=(id='student-0123456789',name='Equipe Jatobá')=>({id,name,createdAt:'2026-11-01T12:00:00Z'});
async function fixture(t){const dir=await mkdtemp(join(tmpdir(),'bioenergia-community-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
test('notebooks isolate legacy values, credentials and IndexedDB slots while preserving the principal keys',()=>{
 assert.equal(scopedKey('bioenergia.pro.v2.notes','principal'),'bioenergia.pro.v2.notes');
 for(const base of ['bioenergia.pro.v2.notes','bioenergia.pro.v2.values.solar','bioenergia.amazon.device.v1','bioenergia.amazon.session.v1'])assert.notEqual(scopedKey(base,'student-0123456789'),scopedKey(base,'student-9876543210'));
 assert.equal(notebookKey('student','principal'),'student');assert.notEqual(notebookKey('student','student-0123456789'),notebookKey('student','student-9876543210'));
 assert.equal(validProfile(profile('../escape')),false);
});
test('profile creation rejects duplicate nicknames and does not mutate prior notebooks',()=>{
 const previous=globalThis.localStorage,map=new Map();globalThis.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 try{const a=createProfile('Equipe Jatobá');map.set(scopedKey('notes',a.id),'pesquisa de biomassa');const b=createProfile('Equipe Samaúma');assert.notEqual(a.id,b.id);assert.throws(()=>createProfile('equipe jatobá'));assert.equal(map.get(scopedKey('notes',a.id)),'pesquisa de biomassa');assert.equal(getProfiles().length,3);}finally{globalThis.localStorage=previous;}
});
test('disk notebooks survive restart, are independent and reject stale overwrites',async t=>{
 const dir=await fixture(t),store=createNotebookStore(dir),a=newLearningRecord(),b=newLearningRecord();a.sequence=4;a.projectNote='Projeto da escola';b.sequence=2;b.projectNote='Inventário de resíduos';
 await Promise.all([store.save(profile(),a),store.save(profile('student-9876543210','Equipe Samaúma'),b)]);
 const reboot=createNotebookStore(dir);assert.equal((await reboot.read(profile().id)).record.projectNote,a.projectNote);assert.equal((await reboot.read('student-9876543210')).record.projectNote,b.projectNote);
 await assert.rejects(reboot.save(profile(),{...a,sequence:3}),/CONFLICT/);await assert.rejects(reboot.save(profile(),{...a,projectNote:'sobrescrita'}),/CONFLICT/);assert.equal((await reboot.profiles()).length,2);
 const first=await reboot.save(profile(),a),again=await reboot.save(profile(),a);assert.equal(first.savedAt,again.savedAt);
});
test('a corrupt current file recovers the previous valid copy and invalid payloads never reach disk',async t=>{
 const dir=await fixture(t),store=createNotebookStore(dir),r=newLearningRecord();r.sequence=1;r.projectNote='Cópia anterior';await store.save(profile(),r);await store.save(profile(),{...r,sequence:2,projectNote:'Cópia atual'});await writeFile(join(dir,profile().id+'.json'),'{interrompido');
 const recovered=await store.read(profile().id);assert.equal(recovered.recovered,true);assert.equal(recovered.record.projectNote,'Cópia anterior');await assert.rejects(store.save(profile('../escape'),r),/INVALID/);await assert.rejects(store.save(profile(),{...r,bench:{}}),/INVALID/);
});
test('loopback server serves the modular app, protects local API origins and never serves notebooks as static files',async t=>{
 const dir=await fixture(t),server=createDesktopServer({webRoot:new URL('../dist/web',import.meta.url).pathname,directory:dir});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});const base='http://127.0.0.1:'+server.address().port;
 assert.match(await(await fetch(base+'/')).text(),/data-distribution="modular"/);assert.equal((await fetch(base+'/app.js')).status,200);
 const send=(path,options={})=>fetch(base+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
 const body=JSON.stringify({profile:profile(),record:newLearningRecord()});assert.equal((await send('/api/offline/notebook',{method:'POST',body})).status,200);
 assert.equal((await send('/api/offline/notebook',{method:'POST',body,headers:{Origin:'https://untrusted.example'}})).status,403);
 const rebindingStatus=await new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/offline/status',{headers:{Host:'untrusted.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(rebindingStatus,403);
 assert.equal((await send('/api/offline/status',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 assert.equal((await fetch(base+'/cadernos/'+profile().id+'.json')).status,404);
 assert.equal((await fetch(base+'/../server/learning-model.mjs')).status,404);
 const state=await(await send('/api/offline/status')).json();assert.equal(state.profiles[0].name,'Equipe Jatobá');
 let remoteStatus;await createOfflineHandler({directory:dir})({method:'GET',headers:{host:'127.0.0.1:8080'},socket:{localPort:8080,remoteAddress:'203.0.113.1'}},{writeHead:status=>remoteStatus=status,end(){}},'/api/offline/status');assert.equal(remoteStatus,403);
});
async function distribution(root,version='2.1.0'){
 const paths=['web/index.html','web/app.js','web/styles.css','offline/desktop-server.mjs','offline/desktop-store.mjs','offline/install.mjs','server/learning-model.mjs','server/profile-model.mjs','runtime/node'];const files=[];
 for(const path of paths){const data=Buffer.from('fixture '+version+' '+path);await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),data);files.push({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
 await writeFile(join(root,'distribution.json'),JSON.stringify({application:'bioenergia-community',schema:1,platform:'linux-x64',version,files}));
}
test('installation and USB update preserve notebooks, prior releases and a stable launcher',async t=>{
 const root=await fixture(t),bundle=join(root,'bundle'),destination=join(root,'instalação com espaços');await distribution(bundle);const first=await installDistribution(bundle,{destination,checkPlatform:false,checkRunning:false,createShortcut:false});
 const saved=join(destination,'cadernos','principal.json');await writeFile(saved,'trabalho preservado');await distribution(bundle,'2.1.1');const next=await installDistribution(bundle,{destination,checkPlatform:false,checkRunning:false,createShortcut:false});assert.notEqual(first.release,next.release);assert.equal(await readFile(saved,'utf8'),'trabalho preservado');assert.match(await readFile(join(destination,'INICIAR.sh'),'utf8'),new RegExp(next.release));assert.equal((await readdir(join(destination,'releases'))).length,2);
 await installDistribution(bundle,{destination,checkPlatform:false,checkRunning:false,createShortcut:false});assert.equal((await readdir(join(destination,'releases'))).length,2);
});
test('installer rejects corrupt payloads and path traversal before changing an installed release',async t=>{
 const root=await fixture(t),bundle=join(root,'bundle');await distribution(bundle);await writeFile(join(bundle,'web/app.js'),'alterado');await assert.rejects(validateDistribution(bundle,{checkPlatform:false}),/alterado/);
 await distribution(bundle);const path=join(bundle,'distribution.json'),m=JSON.parse(await readFile(path));m.files[0].path='../escape';await writeFile(path,JSON.stringify(m));await assert.rejects(validateDistribution(bundle,{checkPlatform:false}),/Manifesto/);
});
