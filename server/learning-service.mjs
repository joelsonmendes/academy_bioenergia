import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {validLearningRecord} from './learning-model.mjs';
const digest=s=>createHash('sha256').update(String(s)).digest();
const equal=(a,b)=>timingSafeEqual(digest(a),digest(b));
export function createLearningService({dataDir=process.env.BIOENERGIA_DATA_DIR??join(process.cwd(),'data'),classCode=process.env.LEARNING_CLASS_CODE??'',teacherKey=process.env.LEARNING_TEACHER_KEY??''}={}){
 const enabled=classCode.length>=8&&teacherKey.length>=12,sessions=new Map(),attempts=new Map();
 let state={schema:1,learners:{},threads:[]},loaded=false,queue=Promise.resolve();
 const load=async()=>{if(loaded)return;try{const data=JSON.parse(await readFile(join(dataDir,'learning.json'),'utf8'));if(data.schema!==1||!data.learners||!Array.isArray(data.threads))throw new Error('Invalid learning store');state=data;}catch(e){if(e.code!=='ENOENT')throw e;}loaded=true;};
 const transaction=fn=>{const task=queue.then(async()=>{await load();const before=structuredClone(state);try{const result=await fn();await mkdir(dataDir,{recursive:true,mode:0o700});const file=join(dataDir,'learning.json'),tmp=file+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(tmp,JSON.stringify(state),{mode:0o600});await rename(tmp,file);return result;}catch(error){state=before;throw error;}});queue=task.catch(()=>{});return task;};
 const respond=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const publicThreads=()=>{const result=[];let bytes=2;for(const{id,subject,body,module,createdAt,alias,learnerId,replies}of state.threads.slice(-40).reverse()){const item={id,subject,body,module,createdAt,alias,learnerId,replies:replies.slice(-5)};const size=Buffer.byteLength(JSON.stringify(item))+1;if(bytes+size>64000)break;result.push(item);bytes+=size;}return result;};
 const body=async(req)=>{if(!String(req.headers['content-type']??'').startsWith('application/json'))throw Object.assign(new Error('Use application/json'),{status:415});let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>600000)throw Object.assign(new Error('Request too large'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}};
 const authenticate=req=>{const token=String(req.headers.authorization??'').replace(/^Bearer /,'');const s=sessions.get(token);if(!s||s.expiresAt<Date.now()){if(s)sessions.delete(token);throw Object.assign(new Error('Authentication required'),{status:401});}return s;};
 return async(req,res,path)=>{
  if(!path.startsWith('/api/learning/'))return false;
  try{
   const endpoint=path.slice('/api/learning/'.length);
   if(endpoint==='status'&&req.method==='GET'){respond(res,200,{enabled,version:1,capabilities:enabled?['snapshot-sync','text-tutoring','teacher-feedback']:[]});return true;}
   if(!enabled){respond(res,503,{error:'Class server is not configured'});return true;}
   const allowed={session:'POST',sync:'POST',threads:'GET',reply:'POST'}[endpoint];
   if(!allowed){respond(res,404,{error:'Not found'});return true;}if(req.method!==allowed){res.setHeader('Allow',allowed);respond(res,405,{error:'Method not allowed'});return true;}
   const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host){respond(res,403,{error:'Origin not allowed'});return true;}
   if(endpoint==='session'){
    const address=req.socket.remoteAddress??'local',now=Date.now(),attempt=attempts.get(address);
    if(attempt&&now-attempt.at<60000&&attempt.count>=12){respond(res,429,{error:'Try again later'});return true;}
    if(!attempt||now-attempt.at>=60000)attempts.set(address,{at:now,count:1});else attempt.count++;
    const data=await body(req);if(!data||typeof data.alias!=='string'||data.alias.trim().length<2||data.alias.length>40||typeof data.code!=='string'||!equal(data.code,classCode)){respond(res,401,{error:'Invalid class credentials'});return true;}
    const role=data.teacherKey?'teacher':'student';let learnerId;
    if(role==='teacher'){if(typeof data.teacherKey!=='string'||!equal(data.teacherKey,teacherKey)){respond(res,401,{error:'Invalid teacher credentials'});return true;}}
    else{
     if(!/^[a-f0-9-]{36}$/.test(data.deviceId??'')||!/^[a-f0-9]{64}$/.test(data.deviceSecret??'')){respond(res,400,{error:'Invalid device identity'});return true;}
     learnerId=data.deviceId;
     const result=await transaction(()=>{const learner=state.learners[learnerId];if(learner&&!equal(learner.deviceHash,digest(data.deviceSecret).toString('hex')))return false;if(!learner&&Object.keys(state.learners).length>=500)throw Object.assign(new Error('Class capacity reached'),{status:409});state.learners[learnerId]=learner??{id:learnerId,alias:data.alias.trim(),deviceHash:digest(data.deviceSecret).toString('hex'),snapshot:null,savedAt:''};state.learners[learnerId].alias=data.alias.trim();return true;});
     if(!result){respond(res,401,{error:'Device identity does not match'});return true;}
    }
    for(const[token,s]of sessions)if(s.expiresAt<now)sessions.delete(token);
    if(sessions.size>=1000){respond(res,429,{error:'Session limit reached'});return true;}
    const token=randomBytes(32).toString('hex'),session={role,learnerId,alias:data.alias.trim(),expiresAt:now+24*3600000};sessions.set(token,session);respond(res,200,{token,role,learnerId,expiresAt:session.expiresAt});return true;
   }
   const session=authenticate(req);await queue;await load();
   if(endpoint==='sync'){
    if(session.role!=='student'){respond(res,403,{error:'Student session required'});return true;}
    const data=await body(req);if(!validLearningRecord(data?.snapshot)){respond(res,400,{error:'Invalid learning snapshot'});return true;}
    const result=await transaction(()=>{const learner=state.learners[session.learnerId],snapshot=data.snapshot;
     if(!learner)throw Object.assign(new Error('Student not found'),{status:401});
     if(!learner.snapshot||snapshot.sequence>learner.snapshot.sequence){learner.snapshot=snapshot;learner.savedAt=new Date().toISOString();}
     for(const q of snapshot.questions)if(!state.threads.some(thread=>thread.id===q.id)){
      if(state.threads.length>=500)throw Object.assign(new Error('Forum capacity reached; export the local notebook'),{status:409});
      state.threads.push({...q,createdAt:new Date().toISOString(),alias:session.alias,learnerId:session.learnerId,replies:[]});
     }
     return{sequence:learner.snapshot.sequence,accepted:snapshot.sequence===learner.snapshot.sequence&&JSON.stringify(snapshot)===JSON.stringify(learner.snapshot),savedAt:learner.savedAt,threads:publicThreads()};
    });respond(res,200,result);return true;
   }
   if(endpoint==='threads'){respond(res,200,{threads:publicThreads(),...(session.role==='teacher'?{learners:Object.values(state.learners).map(l=>({id:l.id,alias:l.alias,sequence:l.snapshot?.sequence??0,updatedAt:l.savedAt,completed:l.snapshot?.completed?.length??0,projectNote:!!l.snapshot?.projectNote?.trim()}))}:{})});return true;}
   if(endpoint==='reply'){
    if(session.role!=='teacher'){respond(res,403,{error:'Teacher session required'});return true;}
    const data=await body(req);if(!data||typeof data.body!=='string'||data.body.trim().length<3||data.body.length>3000||!/^[a-zA-Z0-9-]{10,80}$/.test(data.id??'')){respond(res,400,{error:'Invalid reply'});return true;}
    const reply=await transaction(()=>{const thread=state.threads.find(t=>t.id===data.threadId);if(!thread)throw Object.assign(new Error('Thread not found'),{status:404});const existing=thread.replies.find(r=>r.id===data.id);if(existing)return existing;if(thread.replies.length>=20)throw Object.assign(new Error('Reply limit reached'),{status:409});const reply={id:data.id,body:data.body.trim(),alias:session.alias,at:new Date().toISOString()};thread.replies.push(reply);return reply;});respond(res,200,{reply});return true;
   }
  }catch(error){respond(res,error.status??500,{error:error.status?error.message:'Learning service unavailable'});}
  return true;
 };
}
