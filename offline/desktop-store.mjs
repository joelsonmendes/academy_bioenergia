import {mkdir,readFile,writeFile,rename,readdir,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validLearningRecord} from '../server/learning-model.mjs';
import {validProfile} from '../server/profile-model.mjs';

export function createNotebookStore(directory){
 let pending=Promise.resolve();
 const prepare=()=>mkdir(directory,{recursive:true,mode:0o700});
 const validEnvelope=value=>value?.format==='bioenergia-local-1'&&validProfile(value.profile)&&validLearningRecord(value.record);
 async function read(id){
  if(!/^(principal|[a-z0-9-]{10,64})$/.test(id))throw new Error('INVALID');
  for(const suffix of ['.json','.previous.json'])try{const value=JSON.parse(await readFile(join(directory,id+suffix),'utf8'));if(validEnvelope(value)&&value.profile.id===id)return {...value,recovered:suffix!=='.json'};}catch{}
  return null;
 }
 async function profiles(){await prepare();const names=await readdir(directory),rows=[];for(const name of names.filter(n=>/^(principal|[a-z0-9-]{10,64})\.json$/.test(n)).slice(0,50)){const saved=await read(name.slice(0,-5));if(saved)rows.push(saved.profile);}return rows;}
 async function commit(profile,record){
  if(!validProfile(profile)||!validLearningRecord(record))throw new Error('INVALID');
  await prepare();const previous=await read(profile.id);
  if(previous&&(record.sequence<previous.record.sequence||(record.sequence===previous.record.sequence&&JSON.stringify(record)!==JSON.stringify(previous.record))))throw new Error('CONFLICT');
  if(previous&&record.sequence===previous.record.sequence)return {savedAt:previous.savedAt,sequence:record.sequence};
  if(!previous&&(await profiles()).length>=50)throw new Error('LIMIT');
  const target=join(directory,profile.id+'.json'),temporary=target+'.'+randomUUID()+'.tmp';
  const envelope={format:'bioenergia-local-1',profile,record,savedAt:new Date().toISOString()};
  await writeFile(temporary,JSON.stringify(envelope)+'\n',{mode:0o600});
  if(previous&&!previous.recovered)await copyFile(target,join(directory,profile.id+'.previous.json'));
  await rename(temporary,target);
  return {savedAt:envelope.savedAt,sequence:record.sequence};
 }
 return {read,profiles,save(profile,record){const next=pending.then(()=>commit(profile,record));pending=next.catch(()=>{});return next;}};
}

export function createOfflineHandler({directory,version='2.1.0',allowedHosts,allowPreview=false}={}){
 const store=directory?createNotebookStore(directory):null;
 const respond=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});res.end(JSON.stringify(data));};
 return async(req,res,path)=>{
  if(!path.startsWith('/api/offline/'))return false;
  if(!store){respond(res,200,{application:'bioenergia-community',available:false});return true;}
  const host=String(req.headers.host??''),origin=req.headers.origin;
  const hosts=allowedHosts??['127.0.0.1:'+req.socket.localPort,'localhost:'+req.socket.localPort];
  const localPeer=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'');
  if((!localPeer&&!allowPreview)||!hosts.includes(host)||(origin&&origin!=='http://'+host)||req.headers['sec-fetch-site']==='cross-site'){respond(res,403,{error:'ORIGIN'});return true;}
  try{
   if(path==='/api/offline/status'&&req.method==='GET'){respond(res,200,{application:'bioenergia-community',available:true,version,profiles:await store.profiles()});return true;}
   if(path==='/api/offline/notebook'&&req.method==='GET'){const id=new URL(req.url,'http://'+host).searchParams.get('id')??'principal';const saved=await store.read(id);respond(res,200,{record:saved?.record??null,recovered:saved?.recovered??false});return true;}
   if(path==='/api/offline/notebook'&&req.method==='POST'){
    if(!String(req.headers['content-type']??'').startsWith('application/json')){respond(res,415,{error:'JSON_REQUIRED'});return true;}
    const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>600000){respond(res,413,{error:'TOO_LARGE'});return true;}chunks.push(chunk);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{respond(res,400,{error:'INVALID_JSON'});return true;}
    const saved=await store.save(body.profile,body.record);respond(res,200,saved);return true;
   }
   respond(res,404,{error:'NOT_FOUND'});
  }catch(error){const code=error instanceof Error?error.message:'STORAGE';respond(res,code==='CONFLICT'?409:['INVALID','LIMIT'].includes(code)?400:500,{error:['CONFLICT','INVALID','LIMIT'].includes(code)?code:'STORAGE'});}
  return true;
 };
}
