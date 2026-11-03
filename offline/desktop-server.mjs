import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {dirname,join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir,platform} from 'node:os';
import {spawn} from 'node:child_process';
import {createOfflineHandler} from './desktop-store.mjs';
export const DESKTOP_PORT=47329;
const here=dirname(fileURLToPath(import.meta.url));
export const communityBase=()=>process.platform==='win32'?join(process.env.LOCALAPPDATA??join(homedir(),'AppData','Local'),'BioEnergiaAcademy'):join(process.env.XDG_DATA_HOME??join(homedir(),'.local','share'),'BioEnergiaAcademy');
export function createDesktopServer({webRoot=join(here,'../web'),directory=join(communityBase(),'cadernos'),version='2.1.0'}={}){
 const offline=createOfflineHandler({directory,version});
 const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.webp':'image/webp','.svg':'image/svg+xml'};
 return http.createServer(async(req,res)=>{
  try{
   const host=String(req.headers.host??'');if(!['127.0.0.1:'+req.socket.localPort,'localhost:'+req.socket.localPort].includes(host)){res.writeHead(403);res.end('Host recusado');return;}
   const url=new URL(req.url??'/','http://'+host),path=decodeURIComponent(url.pathname);
   if(await offline(req,res,path))return;
   if(path==='/api/learning/status'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"enabled":false}');return;}
   if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405);res.end();return;}
   const relative=path==='/'?'index.html':path.replace(/^\//,'');
   if(relative.split('/').some(part=>part.startsWith('.')||part.includes('\\'))||relative.includes('\0')){res.writeHead(404);res.end();return;}
   const file=resolve(webRoot,relative);if(!file.startsWith(resolve(webRoot)+sep)||!types[extname(file)]){res.writeHead(404);res.end();return;}
   const metadata=await stat(file);if(!metadata.isFile()){res.writeHead(404);res.end();return;}
   const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)],'Content-Length':data.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:data);
  }catch{if(!res.headersSent)res.writeHead(404);res.end();}
 });
}
function openBrowser(url){const command=platform()==='win32'?'cmd.exe':platform()==='darwin'?'open':'xdg-open';const args=platform()==='win32'?['/d','/c','start','',url]:[url];const child=spawn(command,args,{stdio:'ignore',detached:true});child.on('error',()=>console.log('Abra no navegador: '+url));child.unref();}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
 const directory=get('--data')??join(communityBase(),'cadernos'),url='http://127.0.0.1:'+DESKTOP_PORT+'/index.html#amazon/biomass';
 const server=createDesktopServer({directory});server.requestTimeout=10000;server.headersTimeout=8000;
 server.on('error',async error=>{if(error.code==='EADDRINUSE')try{const response=await fetch('http://127.0.0.1:'+DESKTOP_PORT+'/api/offline/status',{signal:AbortSignal.timeout(2000)});const data=await response.json();if(data.application==='bioenergia-community'){if(args.includes('--open'))openBrowser(url);console.log('BioEnergia já está aberta. Use a janela existente.');return;}}catch{}console.error('Não foi possível abrir a porta local '+DESKTOP_PORT+'. Feche a outra instância ou consulte o suporte.');process.exitCode=1;});
 server.listen(DESKTOP_PORT,'127.0.0.1',()=>{console.log('\nBIOENERGIA ACADEMY — COMUNIDADE OFFLINE\n\n'+url+'\n\nCadernos: '+directory+'\nMantenha esta janela aberta durante o estudo. Para encerrar: Ctrl+C.\nNenhuma conexão de internet é necessária.\n');if(args.includes('--open'))openBrowser(url);});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
