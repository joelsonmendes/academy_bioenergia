import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createAppServer} from './server.mjs';
import {newLearningRecord} from './learning-model.mjs';
let server,base,directory,student,teacher;
const config={classCode:'class-test-2026',teacherKey:'teacher-test-key-2026'};
const post=(path,data,token)=>fetch(base+'/api/learning/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
const login=(extra={})=>post('session',{alias:'Aluno teste',code:config.classCode,deviceId:'11223344-1122-4122-8122-112233445566',deviceSecret:'a'.repeat(64),...extra});
before(async()=>{directory=await mkdtemp(join(tmpdir(),'bioenergia-learning-'));server=createAppServer({learning:{...config,dataDir:directory}});server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});
test('class endpoints require configured credentials and protect student/teacher roles',async()=>{
 assert.equal((await(await fetch(base+'/api/learning/status')).json()).enabled,true);
 assert.equal((await post('sync',{snapshot:newLearningRecord()})).status,401);
 assert.equal((await login({code:'wrong-code'})).status,401);
 const s=await login();assert.equal(s.status,200);student=await s.json();assert.equal(student.role,'student');
 const t=await login({alias:'Docente teste',teacherKey:config.teacherKey});assert.equal(t.status,200);teacher=await t.json();assert.equal(teacher.role,'teacher');
 assert.equal((await post('reply',{threadId:'x',body:'Forbidden',id:'123456789012'},student.token)).status,403);
 assert.equal((await post('sync',{snapshot:newLearningRecord()},teacher.token)).status,403);
});
test('sync is durable, idempotent, validates data and never rolls back to an old sequence',async()=>{
 const record=newLearningRecord();record.sequence=2;record.projectNote='Análise da escola e evidências do ensaio.';record.questions=[{id:'question-1234567890',subject:'Queda de tensão',body:'Qual a relação entre seção e queda no trecho CC?',module:'school',createdAt:new Date().toISOString()}];
 const sync=await post('sync',{snapshot:record},student.token);assert.equal(sync.status,200);const first=await sync.json();assert.equal(first.sequence,2);assert.equal(first.threads.length,1);
 const repeat=await(await post('sync',{snapshot:record},student.token)).json();assert.equal(repeat.threads.length,1);
 const old={...record,sequence:1,projectNote:'old'};assert.equal((await(await post('sync',{snapshot:old},student.token)).json()).sequence,2);
 const disk=JSON.parse(await readFile(join(directory,'learning.json'),'utf8'));assert.equal(disk.learners[student.learnerId].snapshot.projectNote,record.projectNote);assert.equal(disk.threads.length,1);
 assert.equal((await post('sync',{snapshot:{...record,loads:[] ,bench:{...record.bench,section:-5}}},student.token)).status,400);
});
test('teacher feedback returns to the class while private notebooks stay out of student responses',async()=>{
 const response=await post('reply',{threadId:'question-1234567890',body:'Compare a mesma corrente com o dobro da seção e registre ΔV.',id:'response-1234567890'},teacher.token);assert.equal(response.status,200);
 await post('reply',{threadId:'question-1234567890',body:'Same id is idempotent.',id:'response-1234567890'},teacher.token);
 const s=await(await fetch(base+'/api/learning/threads',{headers:{Authorization:'Bearer '+student.token}})).json();assert.equal(s.threads[0].replies.length,1);assert.equal(s.learners,undefined);assert.equal(s.threads[0].snapshot,undefined);
 const t=await(await fetch(base+'/api/learning/threads',{headers:{Authorization:'Bearer '+teacher.token}})).json();assert.equal(t.learners.length,1);assert.equal(t.learners[0].projectNote,true);assert.equal(t.learners[0].note,undefined);
 assert.equal((await login({deviceSecret:'b'.repeat(64)})).status,401);
});
test('learning data survives server restart and sessions cannot bypass origin/body checks',async()=>{
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));server=createAppServer({learning:{...config,dataDir:directory}});server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(base+'/api/learning/threads',{headers:{Authorization:'Bearer '+teacher.token}})).status,401);
 const t=await(await login({teacherKey:config.teacherKey})).json();const data=await(await fetch(base+'/api/learning/threads',{headers:{Authorization:'Bearer '+t.token}})).json();assert.equal(data.threads.length,1);assert.equal(data.learners.length,1);
 assert.equal((await fetch(base+'/api/learning/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.example'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/learning/session')).status,405);
 assert.equal((await fetch(base+'/api/learning/session',{method:'POST',body:'text'})).status,415);
});
test('long portable notebooks sync while the student discussion payload stays bounded',async()=>{
 const s=await(await login()).json(),record=newLearningRecord();record.sequence=10;
 record.questions=Array.from({length:50},(_,i)=>({id:'bulk-question-'+String(i).padStart(10,'0'),subject:'Ensaio de conectividade '+i,body:'A'.repeat(3000),module:'school',createdAt:new Date().toISOString()}));
 const response=await post('sync',{snapshot:record},s.token);assert.equal(response.status,200);const data=await response.json();assert.equal(data.accepted,true);assert.ok(Buffer.byteLength(JSON.stringify(data.threads))<64000);assert.ok(data.threads.length>0&&data.threads.length<40);
});
