import React,{createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import {lessons,tr,ui} from './model';
import {defaultsFor,sourceKeys,validValues} from './energy';
import type {Language,SourceKey,Page,Parameters,Scenario,Localized,Lab3DView} from './types';
import {scopedKey,PROFILE_ID,MAIN_PROFILE} from './profiles';
const pages:Page[]=['home','plants','sim','pvreport','lab3d','amazon','carbon','activities','mentor','sources'];
let persistence=true;
function read<T>(key:string,fallback:T):T{try{const s=localStorage.getItem(scopedKey('bioenergia.pro.v2.'+key))??(PROFILE_ID===MAIN_PROFILE&&key!=='theme'?localStorage.getItem('bioenergy.v1.'+key):null);return s?JSON.parse(s):fallback;}catch{return fallback;}}
function write(key:string,value:unknown){try{localStorage.setItem(scopedKey('bioenergia.pro.v2.'+key),JSON.stringify(value));}catch{persistence=false;}}
function initialRoute(): {page: Page; source: SourceKey; labView: Lab3DView} {
 const [p,k,view]=location.hash.slice(1).split('/');
 const page=pages.includes(p as Page)?p as Page:'home';
 const source=sourceKeys.includes(k as SourceKey)?k as SourceKey:'biomass';
 const labView=page==='lab3d' && source==='solar' && view==='sombreamento'?'shading':'bench';
 return {page,source,labView};
}
interface AppContextType{lang:Language;setLang:(l:Language)=>void;theme:'dark'|'light';toggleTheme:()=>void;page:Page;source:SourceKey;labView:Lab3DView;navigate:(p:Page,k?:SourceKey,view?:Lab3DView)=>void;chooseSource:(k:SourceKey)=>void;values:Record<SourceKey,Parameters>;updateValues:(k:SourceKey,v:Parameters)=>void;visited:SourceKey[];scenarios:Scenario[];saveScenario:()=>void;loadScenario:(s:Scenario)=>void;removeScenario:(id:string)=>void;resetKey:number;resetValues:()=>void;menu:boolean;setMenu:(b:boolean)=>void;notify:(s:string)=>void;toast:string;correct:SourceKey[];complete:(k:SourceKey)=>void;notes:string;setNotes:(s:string)=>void;t:(v:Localized|undefined)=>string;L:(k:string)=>string;canPersist:()=>boolean;importLegacy:(data:{notes:string;visited:string[];correct:string[];scenarios:unknown[];values:Record<string,Record<string,number>>})=>void}
const AppContext=createContext<AppContextType|null>(null);
export function useApp(){const v=useContext(AppContext);if(!v)throw new Error('Missing application context');return v;}
export function AppProvider({children}:{children:ReactNode}){
 const route=initialRoute();
 const [lang,setLang]=useState<Language>(()=>{const v=read('language','pt');return ['pt','en','es'].includes(v)?v as Language:'pt';});
 const [theme,setTheme]=useState<'dark'|'light'>(()=>read<string>('theme','dark')==='light'?'light':'dark');
 const [page,setPage]=useState<Page>(route.page),[source,setSource]=useState<SourceKey>(route.source),[menu,setMenu]=useState(false),[toast,notify]=useState(''),[resetKey,setResetKey]=useState(0);
 const [labView,setLabView]=useState<Lab3DView>(route.labView);
 const [values,setValues]=useState<Record<SourceKey,Parameters>>(()=>Object.fromEntries(sourceKeys.map(k=>{const stored=read('values.'+k,null);return[k,validValues(k,stored)?stored:defaultsFor(k)];})) as Record<SourceKey,Parameters>);
 const [visited,setVisited]=useState<SourceKey[]>(()=>{const v=read<unknown>('visited',[]);return Array.isArray(v)?v.filter(k=>sourceKeys.includes(k)):[];});
 const [scenarios,setScenarios]=useState<Scenario[]>(()=>{const v=read<unknown>('scenarios',[]);return Array.isArray(v)?v.filter(s=>s&&sourceKeys.includes(s.module)&&validValues(s.module,s.values)&&typeof s.id==='string').slice(-20):[];});
 const [correct,setCorrect]=useState<SourceKey[]>(()=>{const v=read<unknown>('correct',[]);return Array.isArray(v)?v.filter(k=>sourceKeys.includes(k)):[];});
 const [notes,setNotes]=useState(()=>{const v=read<unknown>('notes','');return typeof v==='string'?v:'';});
 const t=useCallback((v:Localized|undefined)=>tr(v,lang),[lang]);
 const L=useCallback((k:string)=>tr(ui[k],lang),[lang]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;write('theme',theme);},[theme]);
 useEffect(()=>{document.documentElement.lang=lang==='pt'?'pt-BR':lang;write('language',lang);},[lang]);
 useEffect(()=>{document.title=`${L(page)} · BioEnergia Academy`;const subroute=page==='lab3d'&&source==='solar'&&labView==='shading'?'/sombreamento':'';history.replaceState(null,'',`#${page}/${source}${subroute}`);if(page==='plants')setVisited(prev=>prev.includes(source)?prev:[...prev,source]);},[page,source,labView,L]);
 useEffect(()=>{const handle=()=>{const r=initialRoute();setPage(r.page);setSource(r.source);setLabView(r.labView);setMenu(false);};window.addEventListener('hashchange',handle);return()=>window.removeEventListener('hashchange',handle);},[]);
 useEffect(()=>{write('visited',visited);},[visited]);useEffect(()=>{write('scenarios',scenarios);},[scenarios]);useEffect(()=>{write('correct',correct);},[correct]);useEffect(()=>{write('notes',notes);},[notes]);
 useEffect(()=>{if(!toast)return;const h=setTimeout(()=>notify(''),4200);return()=>clearTimeout(h);},[toast]);
 useEffect(()=>{const f=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenu(false);};window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f);},[]);
 const navigate=(p:Page,k?:SourceKey,view:Lab3DView='bench')=>{setPage(p);if(k)setSource(k);setLabView(view);setMenu(false);window.scrollTo({top:0,behavior:'instant'});};
 const chooseSource=(k:SourceKey)=>setSource(k);
 const updateValues=(k:SourceKey,v:Parameters)=>{setValues(p=>({...p,[k]:v}));write('values.'+k,v);};
 const saveScenario=()=>{setScenarios(p=>[...p,{id:Date.now().toString(36),module:source,values:{...values[source]},date:new Date().toISOString()}].slice(-20));notify(L(persistence?'saved':'memoryOnly'));};
 const loadScenario=(s:Scenario)=>{updateValues(s.module,{...s.values});setResetKey(k=>k+1);navigate('sim',s.module);};
 const resetValues=()=>{updateValues(source,defaultsFor(source));setResetKey(k=>k+1);};
 return <AppContext value={{lang,setLang,theme,toggleTheme:()=>setTheme(p=>p==='dark'?'light':'dark'),page,source,labView,navigate,chooseSource,values,updateValues,visited,scenarios,saveScenario,loadScenario,removeScenario:id=>setScenarios(p=>p.filter(s=>s.id!==id)),resetKey,resetValues,menu,setMenu,notify,toast,correct,complete:k=>setCorrect(p=>p.includes(k)?p:[...p,k]),notes,setNotes,t,L,canPersist:()=>persistence,importLegacy:data=>{setValues(Object.fromEntries(sourceKeys.map(key=>{const v=data.values[key];const value=validValues(key,v)?v:defaultsFor(key);write('values.'+key,value);return[key,value];})) as Record<SourceKey,Parameters>);setNotes(data.notes);setVisited(data.visited.filter(k=>sourceKeys.includes(k as SourceKey)) as SourceKey[]);setCorrect(data.correct.filter(k=>sourceKeys.includes(k as SourceKey)) as SourceKey[]);setScenarios(data.scenarios.filter((item):item is Scenario=>{const s=item as Scenario;return !!s&&typeof s.id==='string'&&sourceKeys.includes(s.module)&&validValues(s.module,s.values)&&typeof s.date==='string'&&Number.isFinite(Date.parse(s.date));}).slice(-20));}}}>{children}</AppContext>;
}
