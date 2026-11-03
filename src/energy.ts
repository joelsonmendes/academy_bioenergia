import {MODULES,INPUTS} from './content.js';
import type {SourceKey,Parameters,Result,InputDefinition,Lesson} from './types';
const modules=MODULES as unknown as Record<SourceKey,Lesson>;
const inputs=INPUTS as Record<string,InputDefinition>;
export function calculate(key:SourceKey,v:Parameters):Result{
 let power=0,resource=0,gross=0,details:Record<string,number|null>={},limited=false,stopped=false;
 const h=v.hours;
 if(key==='biomass'){
  const u=v.moisture/100,lhv=Math.max(0,v.lhv*(1-u)-2.443*u);
  resource=v.mass*lhv/3.6;gross=resource*v.etaBio/100;power=gross*(1-v.aux/100);
  details={u,lhv,auxPower:gross-power,fuelMass:v.mass*h,specific:power>0?v.mass/power:null};
 }else if(key==='solar'){
  const temperature=Math.max(0,1+v.gamma/100*(v.temp-25));
  resource=v.pv*v.irradiance/1000;
  const dc=resource*temperature*(1-v.lossesPV/100);gross=dc*v.etaInv/100;power=Math.min(v.ratedPV,gross);limited=gross>v.ratedPV;details={temperature,dc,uncapped:gross};
 }else if(key==='wind'||key==='tidal'){
  const isWind=key==='wind',d=isWind?v.diameter:v.tidalDiameter,speed=isWind?v.speed:v.tidalSpeed,rho=isWind?v.rhoAir:v.rhoSea,cp=isWind?v.cp:v.cpTidal,eta=(isWind?v.etaDrive:v.etaMarine)/100,rated=isWind?v.ratedWind:v.ratedTidal;
  const area=Math.PI*d*d/4;resource=.5*rho*area*speed**3/1000;const shaft=resource*cp;gross=shaft*eta;stopped=isWind&&(speed<3||speed>=25);power=stopped?0:Math.min(gross,rated);limited=!stopped&&gross>rated;details={area,speed,rho,cp,eta,rated,shaft,uncapped:gross};
 }else{
  const netHead=Math.max(0,v.head-v.lossHead);resource=1000*9.81*v.flow*netHead/1000;gross=resource*v.etaTurb/100*v.etaGen/100;power=Math.min(gross,v.ratedHydro);limited=gross>v.ratedHydro;details={netHead,shaft:resource*v.etaTurb/100,uncapped:gross,grossPotential:1000*9.81*v.flow*v.head/1000};
 }
 return {power:Math.max(0,power),energy:Math.max(0,power*h),resource,gross,efficiency:resource>0?power/resource*100:0,limited,stopped,details};
}
export function defaultsFor(key:SourceKey):Parameters{const v:Parameters={};for(const k of modules[key].inputs)v[k]=inputs[k].default;if(key==='solar')v.hours=5;if(['wind','hydro','tidal'].includes(key))v.hours=8;return v;}
export function validValues(key:SourceKey,value:unknown):value is Parameters{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const v=value as Parameters;
 return modules[key].inputs.every(k=>typeof v[k]==='number'&&Number.isFinite(v[k])&&v[k]>=inputs[k].min&&v[k]<=inputs[k].max);
}
export const sourceKeys=Object.keys(modules) as SourceKey[];
