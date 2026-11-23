import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {newLearningRecord} from './learning-model.mjs';
async function worker(distribution=''){
 const handlers={},cacheMap=new Map(),records=new Map(),messages=[],calls=[];
 let offline=false;
 const fetch=async(input,options)=>{const url=String(input?.url??input);calls.push({url,options});if(offline)throw new Error('offline');if(url.endsWith('/api/learning/sync'))return new Response(JSON.stringify({accepted:true,sequence:JSON.parse(options.body).snapshot.sequence,savedAt:'2026-11-01T20:00:00Z'}),{status:200});const name=new URL(url).pathname.replace('/campus/','');return new Response(await readFile(new URL('../dist/'+distribution+name,import.meta.url)));};
 const caches={keys:async()=>[...cacheMap.keys()],delete:async key=>cacheMap.delete(key),open:async key=>{if(!cacheMap.has(key))cacheMap.set(key,new Map());const entries=cacheMap.get(key);return{put:async(url,response)=>entries.set(String(url),response.clone()),match:async request=>entries.get(String(request?.url??request))?.clone()};}};
 const db={close(){},transaction(_store,mode){const tx={objectStore:()=>({get(key){const request={};queueMicrotask(()=>{request.result=records.get(key);request.onsuccess?.();});return request;},put(value,key){records.set(key,value);queueMicrotask(()=>tx.oncomplete?.());}})};return tx;}};
 const indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess?.());return req;}};
 const self={registration:{scope:'https://example.test/campus/'},addEventListener:(event,handler)=>handlers[event]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>[{postMessage:data=>messages.push(data)}]}};
 vm.runInNewContext(await readFile(new URL('../dist/'+distribution+'sw.js',import.meta.url),'utf8'),{self,caches,fetch,indexedDB,location:{origin:'https://example.test'},URL,Response,Date,Promise,Math,Error,JSON,encodeURIComponent,crypto:webcrypto,AbortController,setTimeout,clearTimeout});
 const lifecycle=async(type,extra={})=>{let promise;handlers[type]({...extra,waitUntil:p=>promise=p});if(promise)await promise;};
 return{handlers,caches,cacheMap,records,messages,calls,lifecycle,setOffline:value=>offline=value};
}
test('PWA caches the complete static shell and serves navigation without a network',async()=>{
 const w=await worker();await w.lifecycle('install');const requests=w.calls.length;w.setOffline(true);let response;
 w.handlers.fetch({request:{url:'https://example.test/campus/index.html#amazon/biomass',mode:'navigate',method:'GET'},respondWith:p=>response=p});const html=await(await response).text();assert.match(html,/BioEnergia Academy/);assert.match(html,/amazon/);assert.equal(w.calls.length,requests);
 let intercepted=false;w.handlers.fetch({request:{url:'https://example.test/campus/api/learning/threads',mode:'cors',method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 w.handlers.fetch({request:{url:'https://other.test/reference',mode:'cors',method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
});
test('cache upgrades delete only old versions inside the same app scope',async()=>{
 const w=await worker();await w.lifecycle('install');await w.caches.open('bioenergia-amazonia-%2Fcampus%2F-old');await w.caches.open('bioenergia-amazonia-%2Fother%2F-keep');await w.lifecycle('activate');const names=await w.caches.keys();assert.ok(!names.includes('bioenergia-amazonia-%2Fcampus%2F-old'));assert.ok(names.includes('bioenergia-amazonia-%2Fother%2F-keep'));
});
test('background sync retains work while offline, then sends one authenticated snapshot and acknowledges it',async()=>{
 const w=await worker(),record=newLearningRecord();record.sequence=4;w.records.set('student',record);w.records.set('session',{role:'student',token:'test-only-token',expiresAt:Date.now()+60000});
 w.setOffline(true);await assert.rejects(w.lifecycle('sync',{tag:'bioenergia-notebook'}));assert.equal(w.records.get('sync-meta'),undefined);assert.equal(w.records.get('student').sequence,4);
 w.setOffline(false);await w.lifecycle('sync',{tag:'bioenergia-notebook'});assert.equal(w.records.get('sync-meta').sequence,4);assert.equal(w.messages.at(-1).sequence,4);assert.equal(w.calls.at(-1).options.headers.Authorization,'Bearer test-only-token');
 const calls=w.calls.length;await w.lifecycle('sync',{tag:'bioenergia-notebook'});assert.equal(w.calls.length,calls);
});

test('modular PWA caches scripts, CSS and all WebPs and preserves the study guide route offline',async()=>{
 const w=await worker('web/');await w.lifecycle('install');const requests=w.calls.length;w.setOffline(true);
 for(const path of ['index.html','app.js','styles.css','config.js','assets/biomass.webp','assets/tidal.webp','assets/carbon-cover.webp','assets/carbon-microgrid.webp','assets/carbon-industry.webp','apostila-amazonia.html','plataforma-portatil.html']){let response;w.handlers.fetch({request:{url:'https://example.test/campus/'+path+'?caderno=student-0123456789',mode:path.endsWith('.html')?'navigate':'cors',method:'GET'},respondWith:p=>response=p});assert.ok((await(await response).arrayBuffer()).byteLength>0);}
 let guide;w.handlers.fetch({request:{url:'https://example.test/campus/apostila-amazonia.html',mode:'navigate',method:'GET'},respondWith:p=>guide=p});assert.match(await(await guide).text(),/Apostila de estudos/);assert.equal(w.calls.length,requests);
});
test('the PV wiring bench is cached with both distributions and serves the selected notebook offline',async()=>{
 for(const distribution of ['', 'web/']){
  const w=await worker(distribution);
  await w.lifecycle('install');
  assert.ok(w.calls.some(({url})=>url==='https://example.test/campus/bancada-fotovoltaica.html'));
  w.setOffline(true);
  let response;
  w.handlers.fetch({request:{url:'https://example.test/campus/bancada-fotovoltaica.html?caderno=student-0123456789',
   mode:'navigate',method:'GET'},respondWith:p=>response=p});
  const html=await(await response).text();
  assert.match(html,/data-mode="hybrid"/);
  assert.match(html,/id="module-add"/);
  assert.ok(!/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html));
 }
});
test('background queue uses a separate credential and acknowledgment for each notebook',async()=>{
 const w=await worker(),a=newLearningRecord(),b=newLearningRecord();a.sequence=3;b.sequence=8;w.records.set('profile-index',[{id:'principal'},{id:'student-0123456789'}]);
 w.records.set('student',a);w.records.set('session',{role:'student',token:'token-a',expiresAt:Date.now()+60000});w.records.set('student:student-0123456789',b);w.records.set('session:student-0123456789',{role:'student',token:'token-b',expiresAt:Date.now()+60000});
 await w.lifecycle('sync',{tag:'bioenergia-notebook'});assert.equal(w.records.get('sync-meta').sequence,3);assert.equal(w.records.get('sync-meta:student-0123456789').sequence,8);assert.deepEqual(w.calls.map(x=>x.options.headers.Authorization),['Bearer token-a','Bearer token-b']);assert.equal(w.messages.at(-1).profileId,'student-0123456789');
});

async function cacheStatus(w,repair=false){
 let status;
 await w.lifecycle('message',{data:{type:repair?'bioenergia-offline-prepare':'bioenergia-offline-status'},ports:[{postMessage:value=>{status=value;}}]});
 return status;
}

test('offline readiness checks every file and ignores another scope or an empty cache',async()=>{
 const w=await worker('web/');
 await w.caches.open('bioenergia-amazonia-%2Fother%2F-ready');
 const empty=await cacheStatus(w);
 assert.equal(empty.state,'incomplete');
 assert.equal(empty.completed,0);
 assert.ok(empty.total>=20);
 await w.lifecycle('install');
 const full=await cacheStatus(w);
 assert.equal(full.state,'ready');
 assert.equal(full.completed,full.total);
 assert.equal(full.bytes,full.totalBytes);
 const cache=[...w.cacheMap.entries()].find(([name])=>!name.includes('%2Fother%2F'))[1];
 cache.delete('https://example.test/campus/app.js');
 w.setOffline(true);
 const missing=await cacheStatus(w);
 assert.equal(missing.state,'incomplete');
 assert.equal(missing.completed,missing.total-1);
 assert.equal((await cacheStatus(w,true)).state,'error');
 w.setOffline(false);
 const before=w.calls.length;
 assert.equal((await cacheStatus(w,true)).state,'ready');
 assert.equal(w.calls.length,before+1);
 assert.equal(w.calls.at(-1).url,'https://example.test/campus/app.js');
});

test('same-size corrupted content fails verification and is repaired without replacing other resources',async()=>{
 const w=await worker();
 await w.lifecycle('install');
 const cache=[...w.cacheMap.values()][0];
 const url='https://example.test/campus/index.html';
 const original=new Uint8Array(await cache.get(url).clone().arrayBuffer());
 original[original.length-1]^=1;
 cache.set(url,new Response(original));
 assert.equal((await cacheStatus(w)).state,'incomplete');
 const before=w.calls.length;
 const ready=await cacheStatus(w,true);
 assert.equal(ready.state,'ready');
 assert.equal(w.calls.length,before+1);
 assert.equal(w.calls.at(-1).url,url);
 const progress=w.messages.filter(message=>message.type==='bioenergia-offline'&&message.state==='downloading');
 assert.ok(progress.some(message=>message.completed>0&&message.completed<message.total));
 assert.equal(w.messages.at(-1).state,'ready');
});

test('failed offline installation keeps previous app caches and can resume when connectivity returns',async()=>{
 const w=await worker();
 await w.caches.open('bioenergia-amazonia-%2Fcampus%2F-previous');
 w.setOffline(true);
 await assert.rejects(w.lifecycle('install'));
 assert.ok((await w.caches.keys()).includes('bioenergia-amazonia-%2Fcampus%2F-previous'));
 assert.equal((await cacheStatus(w)).state,'incomplete');
 w.setOffline(false);
 await w.lifecycle('install');
 assert.equal((await cacheStatus(w)).state,'ready');
 await w.lifecycle('activate');
 assert.ok(!(await w.caches.keys()).includes('bioenergia-amazonia-%2Fcampus%2F-previous'));
});
