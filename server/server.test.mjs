import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createAppServer} from './server.mjs';
import {calculate,defaultsFor,sourceKeys,validValues} from './energy-model.mjs';
let server,base;
before(async()=>{server=createAppServer();server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${a} differs from ${b}`);
test('reference calculations and physical boundaries',()=>{
 near(calculate('biomass',defaultsFor('biomass')).power,50.846291666666666);
 near(calculate('solar',defaultsFor('solar')).power,6.42816);
 near(calculate('hydro',defaultsFor('hydro')).power,71.294175);
 for(const key of sourceKeys){const d=defaultsFor(key);assert.ok(validValues(key,d));near(calculate(key,{...d,hours:0}).energy,0);}
 const w={...defaultsFor('wind'),ratedWind:5000};near(calculate('wind',{...w,speed:10}).power/calculate('wind',{...w,speed:5}).power,8);near(calculate('wind',{...w,speed:25}).power,0);
 const h=defaultsFor('hydro');near(calculate('hydro',{...h,lossHead:30}).power,0);near(calculate('hydro',{...h,flow:0}).power,0);
 const t={...defaultsFor('tidal'),ratedTidal:5000};near(calculate('tidal',{...t,tidalSpeed:2}).power/calculate('tidal',{...t,tidalSpeed:1}).power,8);
});
test('health and source catalog',async()=>{const r=await fetch(base+'/healthz');assert.equal(r.status,200);assert.equal((await r.json()).ok,true);const s=await(await fetch(base+'/api/sources')).json();assert.equal(s.sources.length,5);});
test('API uses the same numerical engine as the browser',async()=>{for(const source of sourceKeys){const values=defaultsFor(source),r=await fetch(base+'/api/simulate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source,values})});assert.equal(r.status,200);const data=await r.json();near(data.result.power,calculate(source,values).power);assert.equal(data.educational,true);}});
test('API rejects invalid and unknown parameters',async()=>{for(const data of[{source:'unknown',values:{}},{source:'biomass',values:{...defaultsFor('biomass'),moisture:200}},{source:'solar',values:{}},{source:'solar',values:{...defaultsFor('solar'),unexpected:1}}]){const r=await fetch(base+'/api/simulate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,400);}});
test('wrong method, media type and malformed JSON are rejected',async()=>{assert.equal((await fetch(base+'/api/simulate')).status,405);assert.equal((await fetch(base+'/api/simulate',{method:'POST',body:'a'})).status,415);assert.equal((await fetch(base+'/api/simulate',{method:'POST',headers:{'content-type':'application/json'},body:'{broken'})).status,400);});
test('Prometheus endpoint exposes real request and scenario metrics',async()=>{const r=await fetch(base+'/metrics'),body=await r.text();assert.equal(r.status,200);assert.ok(r.headers.get('content-type').includes('version=0.0.4'));assert.match(body,/bioenergia_simulations_total\{source="biomass"\} 1/);assert.match(body,/bioenergia_api_duration_seconds_bucket\{le="\+Inf"\} \d+/);assert.match(body,/bioenergia_process_resident_memory_bytes \d+/);assert.ok(body.endsWith('\n'));});
test('static HTML is self contained and paths cannot escape to source files',async()=>{const r=await fetch(base+'/');assert.equal(r.status,200);const html=await r.text();assert.equal((html.match(/data:image\/webp;base64,/g)||[]).length,9);assert.match(html,/"carbon-cover":"data:image\/webp;base64,/);assert.ok(!/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html));assert.equal((await fetch(base+'/server/server.mjs')).status,404);});
