import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {calculate,defaultsFor,sourceKeys,validValues} from './energy-model.mjs';
import {createLearningService} from './learning-service.mjs';
import {createOfflineHandler} from '../offline/desktop-store.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const bucketLimits=[.001,.005,.01,.025,.05,.1,.25,.5,1,5];
export function createAppServer(options={}){
 const learning=createLearningService(options.learning);
 const offline=createOfflineHandler({directory:options.offlineDirectory??process.env.BIOENERGIA_OFFLINE_DATA_DIR,allowedHosts:process.env.BIOENERGIA_QA==='1'?['terminal.local:4173']:undefined,allowPreview:process.env.BIOENERGIA_QA==='1'});
 const requests=new Map(),simulations=Object.fromEntries(sourceKeys.map(k=>[k,0])),latency={count:0,sum:0,buckets:bucketLimits.map(()=>0)};
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  const started=performance.now();let path;try{path=new URL(req.url??'/','http://localhost').pathname;}catch{json(res,400,{error:'Invalid URL'});return;}
  const route=['/','/index.html','/healthz','/metrics','/api/sources','/api/simulate'].includes(path)?path:'/other';
  const method=['GET','POST','HEAD'].includes(req.method??'')?req.method:'OTHER';
  res.once('finish',()=>{const key=JSON.stringify({route,method,status:String(res.statusCode)});requests.set(key,(requests.get(key)??0)+1);if(path==='/api/simulate'){const elapsed=(performance.now()-started)/1000;latency.count++;latency.sum+=elapsed;bucketLimits.forEach((max,i)=>{if(elapsed<=max)latency.buckets[i]++;});}});
  try{
   if(await offline(req,res,path))return;
   if(await learning(req,res,path))return;
   if(path==='/healthz'&&req.method==='GET'){json(res,200,{ok:true,application:'BioEnergia Academy',version:'2.1.0'});return;}
   if(path==='/api/sources'&&req.method==='GET'){json(res,200,{sources:sourceKeys.map(key=>({key,defaults:defaultsFor(key)})),model:'steady-state educational model'});return;}
   if(path==='/api/simulate'){
    if(req.method!=='POST'){res.setHeader('Allow','POST');json(res,405,{error:'Use POST with JSON'});return;}
    if(!String(req.headers['content-type']??'').toLowerCase().startsWith('application/json')){json(res,415,{error:'Content-Type must be application/json'});return;}
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16384){json(res,413,{error:'JSON body exceeds 16 KiB'});return;}chunks.push(chunk);}
    let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(res,400,{error:'Invalid JSON'});return;}
    if(!data||typeof data!=='object'||!sourceKeys.includes(data.source)||!validValues(data.source,data.values)){json(res,400,{error:'Invalid source or parameter ranges'});return;}
    const allowed=Object.keys(defaultsFor(data.source));if(Object.keys(data.values).some(k=>!allowed.includes(k))){json(res,400,{error:'Unknown parameter'});return;}
    simulations[data.source]++;json(res,200,{source:data.source,values:data.values,result:calculate(data.source,data.values),units:{power:'kW',energy:'kWh',efficiency:'%'},educational:true});return;
   }
   if(path==='/metrics'&&req.method==='GET'){
    const lines=['# HELP bioenergia_http_requests_total HTTP requests by bounded route, method and status.','# TYPE bioenergia_http_requests_total counter'];
    for(const[key,count]of requests){const a=JSON.parse(key);lines.push(`bioenergia_http_requests_total{route="${a.route}",method="${a.method}",status="${a.status}"} ${count}`);}
    lines.push('# HELP bioenergia_simulations_total Successfully evaluated educational scenarios.','# TYPE bioenergia_simulations_total counter');
    for(const[key,count]of Object.entries(simulations))lines.push(`bioenergia_simulations_total{source="${key}"} ${count}`);
    lines.push('# HELP bioenergia_api_duration_seconds Simulation API response latency.','# TYPE bioenergia_api_duration_seconds histogram');
    bucketLimits.forEach((b,i)=>lines.push(`bioenergia_api_duration_seconds_bucket{le="${b}"} ${latency.buckets[i]}`));
    lines.push(`bioenergia_api_duration_seconds_bucket{le="+Inf"} ${latency.count}`,`bioenergia_api_duration_seconds_sum ${latency.sum}`,`bioenergia_api_duration_seconds_count ${latency.count}`,'# HELP bioenergia_process_resident_memory_bytes Process RSS in bytes.','# TYPE bioenergia_process_resident_memory_bytes gauge',`bioenergia_process_resident_memory_bytes ${process.memoryUsage().rss}`,'# HELP bioenergia_process_uptime_seconds Process uptime in seconds.','# TYPE bioenergia_process_uptime_seconds gauge',`bioenergia_process_uptime_seconds ${process.uptime()}`);
    res.writeHead(200,{'Content-Type':'text/plain; version=0.0.4; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(lines.join('\n')+'\n');return;
   }
   const staticFiles={'/':'index.html','/index.html':'index.html','/apostila-amazonia.html':'apostila-amazonia.html','/bancada-fotovoltaica.html':'bancada-fotovoltaica.html','/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/app-icon.svg':'app-icon.svg','/app-icon-192.png':'app-icon-192.png','/app-icon-512.png':'app-icon-512.png','/app.js':'app.js','/styles.css':'styles.css','/config.js':'config.js','/plataforma-portatil.html':'plataforma-portatil.html','/logo-senai-hub.webp':'logo-senai-hub.webp'};
   for(const key of [...sourceKeys,'carbon-cover','carbon-microgrid','carbon-industry'])staticFiles['/assets/'+key+'.webp']='assets/'+key+'.webp';
   if(process.env.BIOENERGIA_QA==='1')staticFiles['/qa-mobile.html']='qa-mobile.html';
   if(staticFiles[path]&&(req.method==='GET'||req.method==='HEAD')){const filename=staticFiles[path],data=await readFile(join(process.env.BIOENERGIA_WEB_ROOT??join(here,'../dist'),filename));const type=filename.endsWith('.js')?'application/javascript; charset=utf-8':filename.endsWith('.webmanifest')?'application/manifest+json':filename.endsWith('.svg')?'image/svg+xml':filename.endsWith('.webp')?'image/webp':filename.endsWith('.png')?'image/png':filename.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8';res.writeHead(200,{'Content-Type':type,'Content-Length':data.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:data);return;}
   json(res,404,{error:'Not found'});
  }catch(error){if(!res.headersSent)json(res,500,{error:'Internal server error'});else res.end();console.error('Request failed',{route,error:error instanceof Error?error.message:'unknown'});}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 return server;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const args=process.argv.slice(2),argument=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
 const server=createAppServer(),port=Number(argument('--port')??process.env.PORT??8080),host=argument('--host')??process.env.HOST??'127.0.0.1';
 server.listen(port,host,()=>console.log(`BioEnergia Academy server listening on ${host}:${port}`));
 for(const signal of['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
