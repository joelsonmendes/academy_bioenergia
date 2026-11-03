/* Static learning content only. No learner data, sessions or API responses are cached. */
const PREFIX='bioenergia-amazonia-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'__BUILD_HASH__';
const SHELL=__SHELL_FILES__.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.includes('/api/'))return;
 url.hash='';url.search='';
 if(url.href===self.registration.scope)url.pathname+='index.html';
 if(SHELL.includes(url.href))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.href))??fetch(event.request)));
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
