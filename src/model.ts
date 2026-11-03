import {MODULES,INPUTS,SOURCES,UI,T} from './content.js';
import type {SourceKey,Lesson,InputDefinition,Reference,Localized,Language} from './types';
export const lessons=MODULES as unknown as Record<SourceKey,Lesson>;
export const fields=INPUTS as Record<string,InputDefinition>;
export const references=SOURCES as Reference[];
export const ui=UI as unknown as Record<string,Localized>;
export {T};
export const tr=(v:Localized|undefined,lang:Language):string=>typeof v==='object'&&v!==null?v[lang]??v.pt:String(v??'');
export const format=(v:number|null|undefined,lang:Language,digits=2)=>typeof v==='number'&&Number.isFinite(v)?new Intl.NumberFormat(lang==='pt'?'pt-BR':lang==='es'?'es-ES':'en-US',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(v):'—';
