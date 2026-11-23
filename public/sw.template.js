/* Static learning content only. No learner data, sessions or API responses are cached. */
const PREFIX='bioenergia-amazonia-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'__BUILD_HASH__';
const ASSETS=__SHELL_ASSETS__.map(asset=>({...asset,url:new URL(asset.path,self.registration.scope).href}));
const SHELL=ASSETS.map(asset=>asset.url);
let preparing;

async function validAsset(response,asset){
 if(!response?.ok)return false;
 const bytes=await response.clone().arrayBuffer();
 if(bytes.byteLength!==asset.bytes)return false;
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('')===asset.sha256;
}
function snapshot(completed,bytes,state){
 return{type:'bioenergia-offline',scope:self.registration.scope,version:CACHE.slice(PREFIX.length),state,completed,total:ASSETS.length,bytes,totalBytes:ASSETS.reduce((sum,asset)=>sum+asset.bytes,0),checkedAt:new Date().toISOString()};
}
async function broadcast(data){
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of clients)client.postMessage(data);
}
async function inspectCache(){
 const cache=await caches.open(CACHE);
 let completed=0,bytes=0;
 for(const asset of ASSETS){
  if(await validAsset(await cache.match(asset.url),asset)){completed++;bytes+=asset.bytes;}
 }
 return snapshot(completed,bytes,completed===ASSETS.length?'ready':'incomplete');
}
async function downloadAsset(asset){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{
  const response=await fetch(asset.url,{cache:'reload',signal:controller.signal});
  if(!await validAsset(response,asset))throw new Error('OFFLINE_INTEGRITY');
  return response;
 }finally{clearTimeout(timer);}
}
function prepareCache(){
 if(preparing)return preparing;
 preparing=(async()=>{
  const cache=await caches.open(CACHE);
  let completed=0,bytes=0;
  await broadcast(snapshot(0,0,'downloading'));
  for(const asset of ASSETS){
   if(!await validAsset(await cache.match(asset.url),asset))await cache.put(asset.url,await downloadAsset(asset));
   completed++;bytes+=asset.bytes;
   await broadcast(snapshot(completed,bytes,'downloading'));
  }
  const status=snapshot(completed,bytes,'ready');
  await broadcast(status);
  return status;
 })().catch(async error=>{
  const partial=await inspectCache().catch(()=>snapshot(0,0,'incomplete'));
  await broadcast({...partial,state:'error',error:error.name==='QuotaExceededError'?'space':'download'});
  throw error;
 }).finally(()=>{preparing=undefined;});
 return preparing;
}
self.addEventListener('install',event=>event.waitUntil(prepareCache().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()).then(async()=>broadcast(await inspectCache()))));
self.addEventListener('message',event=>{
 if(!['bioenergia-offline-status','bioenergia-offline-prepare'].includes(event.data?.type))return;
 const work=event.data.type==='bioenergia-offline-prepare'?prepareCache():inspectCache();
 event.waitUntil(work.then(status=>event.ports?.[0]?.postMessage(status)).catch(error=>event.ports?.[0]?.postMessage({...snapshot(0,0,'error'),error:error.name==='QuotaExceededError'?'space':'download'})));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.includes('/api/'))return;
 url.hash='';url.search='';
 if(url.href===self.registration.scope)url.pathname+='index.html';
 if(SHELL.includes(url.href))event.respondWith(caches.open(CACHE).then(async cache=>{
  const saved=await cache.match(url.href);
  if(saved)return saved;
  const response=await downloadAsset(ASSETS.find(asset=>asset.url===url.href));
  await cache.put(url.href,response.clone());
  return response;
 }));
});
// Background Sync is opportunistic; the open page also retries on connectivity return.
function notebookDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('bioenergia-amazonia',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('records'))r.result.createObjectStore('records');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function readRecord(db,key){return new Promise((resolve,reject)=>{const r=db.transaction('records').objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
self.addEventListener('sync',event=>{
 if(event.tag!=='bioenergia-notebook')return;
 event.waitUntil((async()=>{
  const db=await notebookDB();
  try{
  const index=await readRecord(db,'profile-index'),profiles=Array.isArray(index)?index:[{id:'principal'}];
  for(const profile of profiles){
  if(!profile||!/^(principal|[a-z0-9-]{10,64})$/.test(profile.id))continue;
  const key=name=>profile.id==='principal'?name:name+':'+profile.id;
  const [snapshot,session,ack]=await Promise.all(['student','session','sync-meta'].map(name=>readRecord(db,key(name))));
  if(!snapshot||!session||session.role!=='student'||session.expiresAt<Date.now()||snapshot.sequence<=(ack?.sequence??-1))continue;
  const response=await fetch(new URL('api/learning/sync',self.registration.scope),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify({snapshot}),cache:'no-store'});
  if(response.status===401)continue;if(!response.ok)throw new Error('Notebook sync pending');
  const data=await response.json();if(data.accepted===false)continue;
  await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put({sequence:data.sequence,savedAt:data.savedAt},key('sync-meta'));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of clients)client.postMessage({type:'bioenergia-synced',profileId:profile.id,sequence:data.sequence,savedAt:data.savedAt});
  }
  }finally{db.close();}
 })());
});
