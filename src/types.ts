export type Language='pt'|'en'|'es';
export type SourceKey='biomass'|'solar'|'wind'|'hydro'|'tidal';
export type Page='home'|'plants'|'sim'|'lab3d'|'amazon'|'activities'|'mentor'|'sources';
export type Localized=string|{pt:string;en:string;es:string};
export type Parameters=Record<string,number>;
export interface Result {power:number;energy:number;resource:number;gross:number;efficiency:number;limited:boolean;stopped:boolean;details:Record<string,number|null>}
export interface InputDefinition {label:Localized;unit:string;min:number;max:number;step:number;default:number}
export interface Lesson {name:Localized;icon:string;color:string;tag:Localized;short:Localized;description:Localized;path:Localized;inputs:string[];sourceIds:string[];primary:string;xLabel:Localized;learn:Localized;limits:Localized;extra:Localized;components:[Localized,Localized][];activity:Localized;quiz:{q:Localized;options:Localized[];answer:number;explain:Localized}}
export interface Reference {id:string;by:string;title:string;url:string;modules:SourceKey[];scope:Localized;origin:'BR'|'INT';language:'pt'|'en';kind:'education'|'technical'|'atlas'|'thesis'|'article'|'statistics';format:'page'|'pdf';verifiedOn:string;year?:number;alternateUrl?:string;keywords?:string}
export interface Scenario{id:string;module:SourceKey;values:Parameters;date:string}
export interface Hotspot{x:number;y:number}
