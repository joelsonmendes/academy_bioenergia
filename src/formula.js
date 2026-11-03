import {UI,INPUTS,MODULES,T} from './content.js';
import {calculate} from './energy.ts';
export function renderFormula(module,values,language){
 const state={module,values:{[module]:values}};
 const t=value=>typeof value==='object'&&value!==null?(value[language]??value.pt??''):String(value??'');
 const L=key=>t(UI[key]);
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=(value,digits=2)=>Number.isFinite(value)?new Intl.NumberFormat(language==='pt'?'pt-BR':language==='es'?'es-ES':'en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value):'—';
 const icon=()=>'';
function localSymbols(value){
 let text=String(value);
 if(language==='en')for(const [from,to] of [['seco','dry'],['térm','th'],['líq','net'],['bruto','gross'],['recurso','resource'],['eixo','shaft'],['perda','loss'],['ger','gen']])text=text.replaceAll('<sub>'+from+'</sub>','<sub>'+to+'</sub>');
 if(language==='es')for(const [from,to] of [['líq','neta'],['perda','pérdida'],['eixo','eje']])text=text.replaceAll('<sub>'+from+'</sub>','<sub>'+to+'</sub>');
 return text;
}
function localMath(value){let text=String(value).replaceAll('1.000','1\u202f000');if(language==='en')text=text.replace(/(\d),(\d)/g,'$1.$2');return localSymbols(text);}
function formulaHtml(){const key=state.module,v=state.values[key],r=calculate(key,v),a=r.details;let steps=[],symbols=[];
 const add=(name,math,sub)=>steps.push({name,math,sub});
 if(key==='biomass'){
  add(T('Umidade em fração','Moisture as fraction','Humedad en fracción'),'U = M / 100',`${n(v.moisture,0)} / 100 = <strong>${n(a.u,3)}</strong>`);
  add(T('PCI recebido','As-received LHV','PCI recibido'),'PCI<sub>ar</sub> = PCI<sub>seco</sub>(1 − U) − 2,443U',`${n(v.lhv)} × (1 − ${n(a.u,3)}) − ${n(2.443,3)} × ${n(a.u,3)} = <strong>${n(a.lhv,3)} MJ/kg</strong>`);
  add(T('Potência térmica de entrada','Fuel thermal input','Potencia térmica de entrada'),'P<sub>térm</sub> = ṁ × PCI<sub>ar</sub> / 3,6',`${n(v.mass)} kg/h × ${n(a.lhv,3)} MJ/kg ÷ ${n(3.6,1)} = <strong>${n(r.resource,3)} kW</strong>`);
  add(T('Potência elétrica líquida','Net electrical power','Potencia eléctrica neta'),'P<sub>líq</sub> = P<sub>térm</sub> × η<sub>bruto</sub> × (1 − f<sub>aux</sub>)',`${n(r.resource,3)} × ${n(v.etaBio/100,3)} × (1 − ${n(v.aux/100,3)}) = <strong>${n(r.power,3)} kW</strong>`);
  add(T('Energia no período','Energy over the period','Energía en el período'),'E = P<sub>líq</sub> × t',`${n(r.power,3)} kW × ${n(v.hours,1)} h = <strong>${n(r.energy,3)} kWh</strong>`);
  add(T('Massa no período','Fuel mass over the period','Masa en el período'),'m = ṁ × t',`${n(v.mass)} kg/h × ${n(v.hours,1)} h = <strong>${n(a.fuelMass)} kg</strong>`);
  symbols=[['ṁ',INPUTS.mass.label,v.mass,'kg/h'],['PCI<sub>seco</sub>',INPUTS.lhv.label,v.lhv,'MJ/kg'],['U',T('Umidade em fração de massa úmida','Wet-mass moisture fraction','Fracción de humedad en masa húmeda'),a.u,'—'],['η<sub>bruto</sub>',INPUTS.etaBio.label,v.etaBio,'%'],['f<sub>aux</sub>',INPUTS.aux.label,v.aux,'%']];
 }else if(key==='solar'){
  add(T('Correção de temperatura','Temperature correction','Corrección de temperatura'),'f<sub>T</sub> = max[0; 1 + γ(T<sub>c</sub> − 25)]',`max[0; 1 + (${n(v.gamma/100,4)}) × (${n(v.temp,0)} − 25)] = <strong>${n(a.temperature,4)}</strong>`);
  add(T('Potência CC após perdas','DC power after losses','Potencia CC tras pérdidas'),'P<sub>CC</sub> = P<sub>STC</sub> × (G / 1.000) × f<sub>T</sub> × (1 − L)',`${n(v.pv)} × (${n(v.irradiance,0)} / ${n(1000,0)}) × ${n(a.temperature,4)} × (1 − ${n(v.lossesPV/100,2)}) = <strong>${n(a.dc,3)} kW</strong>`);
  add(T('Conversão e limite CA','AC conversion and clipping','Conversión y límite CA'),'P<sub>CA</sub> = min[P<sub>nom</sub>; P<sub>CC</sub> × η<sub>inv</sub>]',`min[${n(v.ratedPV)}; ${n(a.dc,3)} × ${n(v.etaInv/100,2)}] = <strong>${n(r.power,3)} kW</strong>`);
  add(UI.energy,'E = P<sub>CA</sub> × t',`${n(r.power,3)} kW × ${n(v.hours,1)} h = <strong>${n(r.energy,3)} kWh</strong>`);
  symbols=[['P<sub>STC</sub>',INPUTS.pv.label,v.pv,'kWp'],['G',INPUTS.irradiance.label,v.irradiance,'W/m²'],['T<sub>c</sub>',INPUTS.temp.label,v.temp,'°C'],['γ',INPUTS.gamma.label,v.gamma,'%/°C'],['L',INPUTS.lossesPV.label,v.lossesPV,'%'],['η<sub>inv</sub>',INPUTS.etaInv.label,v.etaInv,'%']];
 }else if(key==='wind'||key==='tidal'){
  const d=key==='wind'?v.diameter:v.tidalDiameter;
  add(T('Área varrida do rotor','Rotor swept area','Área barrida del rotor'),'A = πD² / 4',`π × ${n(d)}² / 4 = <strong>${n(a.area,3)} m²</strong>`);
  add(UI.available,'P<sub>recurso</sub> = ½ρAv³ / 1.000',`${n(.5,1)} × ${n(a.rho,3)} × ${n(a.area,3)} × ${n(a.speed,1)}³ / ${n(1000,0)} = <strong>${n(r.resource,3)} kW</strong>`);
  add(T('Extração e conversão','Extraction and conversion','Extracción y conversión'),'P<sub>calc</sub> = P<sub>recurso</sub> × Cp × η',`${n(r.resource,3)} × ${n(a.cp,2)} × ${n(a.eta,2)} = <strong>${n(a.uncapped,3)} kW</strong>`);
  add(T('Limite e saída elétrica','Limit and electrical output','Límite y salida eléctrica'),key==='wind'?t(T('P = 0, v &lt; 3 ou v ≥ 25; senão min(P<sub>nom</sub>; P<sub>calc</sub>)','P = 0 if v &lt; 3 or v ≥ 25; otherwise min(P<sub>rated</sub>; P<sub>calc</sub>)','P = 0 si v &lt; 3 o v ≥ 25; si no, min(P<sub>nom</sub>; P<sub>calc</sub>)')):'P = min(P<sub>nom</sub>; P<sub>calc</sub>)',`${r.stopped?esc(L('stopped')):`min[${n(a.rated)}; ${n(a.uncapped,3)}]`} → <strong>${n(r.power,3)} kW</strong>`);
  add(UI.energy,'E = P × t',`${n(r.power,3)} kW × ${n(v.hours,1)} h = <strong>${n(r.energy,3)} kWh</strong>`);
  add(T('Potência mecânica captada','Captured mechanical power','Potencia mecánica captada'),'P<sub>eixo</sub> = P<sub>recurso</sub> × Cp',`${n(r.resource,3)} × ${n(a.cp,2)} = <strong>${n(a.shaft,3)} kW</strong>${key==='wind'?` • ${esc(t(T('valor teórico antes dos controles','theoretical value before controls','valor teórico antes de controles')))}`:''}`);
  symbols=[['ρ',key==='wind'?INPUTS.rhoAir.label:INPUTS.rhoSea.label,a.rho,'kg/m³'],['A',T('Área varrida','Swept area','Área barrida'),a.area,'m²'],['v',key==='wind'?INPUTS.speed.label:INPUTS.tidalSpeed.label,a.speed,'m/s'],['Cp',INPUTS.cp.label,a.cp,'—'],['η',key==='wind'?INPUTS.etaDrive.label:INPUTS.etaMarine.label,a.eta*100,'%']];
 }else{
  add(T('Queda líquida','Net head','Altura neta'),'H<sub>líq</sub> = max[0; H<sub>bruta</sub> − h<sub>perda</sub>]',`max[0; ${n(v.head,1)} − ${n(v.lossHead,1)}] = <strong>${n(a.netHead,1)} m</strong>`);
  add(T('Potência hidráulica disponível','Available hydraulic power','Potencia hidráulica disponible'),'P<sub>hid</sub> = ρgQH<sub>líq</sub> / 1.000',`${n(1000,0)} × ${n(9.81,2)} × ${n(v.flow,3)} × ${n(a.netHead,1)} / ${n(1000,0)} = <strong>${n(r.resource,3)} kW</strong>`);
  add(T('Conversão eletromecânica','Electromechanical conversion','Conversión electromecánica'),'P<sub>calc</sub> = P<sub>hid</sub> × η<sub>turb</sub> × η<sub>ger</sub>',`${n(r.resource,3)} × ${n(v.etaTurb/100,2)} × ${n(v.etaGen/100,2)} = <strong>${n(a.uncapped,3)} kW</strong>`);
  add(T('Limite nominal','Rated limiting','Límite nominal'),'P = min(P<sub>nom</sub>; P<sub>calc</sub>)',`min[${n(v.ratedHydro)}; ${n(a.uncapped,3)}] = <strong>${n(r.power,3)} kW</strong>`);
  add(UI.energy,'E = P × t',`${n(r.power,3)} kW × ${n(v.hours,1)} h = <strong>${n(r.energy,3)} kWh</strong>`);
  symbols=[['ρ',T('Densidade da água doce','Freshwater density','Densidad de agua dulce'),1000,'kg/m³'],['g',T('Aceleração da gravidade','Gravitational acceleration','Aceleración de gravedad'),9.81,'m/s²'],['Q',INPUTS.flow.label,v.flow,'m³/s'],['H<sub>líq</sub>',T('Queda líquida após perdas','Net head after losses','Altura neta tras pérdidas'),a.netHead,'m'],['η<sub>turb</sub>',INPUTS.etaTurb.label,v.etaTurb,'%'],['η<sub>ger</sub>',INPUTS.etaGen.label,v.etaGen,'%']];
 }
 symbols.push(['t',INPUTS.hours.label,v.hours,'h']);
 return `<section class="panel formula-panel"><div class="panel-title"><h2>${esc(L('formula'))}</h2>${icon('flask')}</div><p>${esc(L('formulaDesc'))}</p><div class="formula-steps">${steps.map((s,i)=>`<div class="formula-step"><div class="step-name"><b>${i+1}</b>${esc(t(s.name))}</div><div class="formula-math">${localMath(s.math)}</div><div class="formula-value">${localSymbols(s.sub)}</div></div>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>${esc(L('symbol'))}</th><th>${esc(L('meaning'))}</th><th>${esc(L('value'))}</th><th>${esc(L('unit'))}</th></tr></thead><tbody>${symbols.map(([s,l,v,u])=>`<tr><td><span class="symbol">${localSymbols(s)}</span></td><td>${esc(t(l))}</td><td>${n(v,s==='ρ'?3:2)}</td><td>${esc(u)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

return formulaHtml();
}
