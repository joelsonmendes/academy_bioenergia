import test from 'node:test';
import assert from 'node:assert/strict';
import {benchDefaults,referenceWires,evaluateBench,measureVoltage,hybridDefaults,schoolLoads,dispatchHybrid,hourlyLoads,validHybridInput} from './amazon-model.mjs';
import {newLearningRecord,validLearningRecord,parseLearningBackup} from './learning-model.mjs';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('DC bench has calibrated reference power, voltage, cable resistance and AC readings',()=>{
 const r=evaluateBench(benchDefaults,referenceWires);
 near(r.sourceW,1636.8);near(r.sourceV,76.26);near(r.batteryV,49.152);near(r.resistance,.075502);near(r.outputW,1200);near(r.outputA,1200/220);
 near(measureVoltage(r,'source+','source-','dc').value,76.26);near(measureVoltage(r,'source-','source+','dc').value,-76.26);
 near(measureVoltage(r,'invL','invN','ac').value,220);assert.equal(measureVoltage(r,'bat+','invL','dc').value,null);
 near(r.controllerW,(r.sourceOperatingV*r.drawI-r.drawI**2*r.resistance)*.96);
});
test('PV opens while the battery continues serving the load, and AC open does not discharge it',()=>{
 const open=evaluateBench(benchDefaults,referenceWires,'open');near(open.outputW,1200);near(open.drawI,0);assert.ok(open.batteryW<0);near(measureVoltage(open,'source+','source-','dc').value,open.sourceVoc);
 const fuse=evaluateBench(benchDefaults,referenceWires,'fuse');near(fuse.outputW,0);assert.ok(fuse.batteryW>0);assert.equal(measureVoltage(fuse,'loadL','loadN','ac').reason,'floating');
 const noInverter=evaluateBench(benchDefaults,referenceWires.filter(w=>!w.includes('invDC+')));near(noInverter.outputV,0);assert.ok(noInverter.controllerW>0);
});
test('shorts, reverse polarity and cross-domain wiring are safely blocked',()=>{
 for(const fault of ['short','reverse','overload']){const r=evaluateBench(benchDefaults,referenceWires,fault);assert.ok(r.tripped);near(r.outputW,0);}
 const r=evaluateBench(benchDefaults,[...referenceWires,['bat+','bat-']]);assert.ok(r.codes.includes('short'));assert.equal(measureVoltage(r,'bat+','bat-','dc').reason,'floating');
 const cross=evaluateBench(benchDefaults,[...referenceWires,['source+','invL']]);assert.ok(cross.codes.includes('wiring'));near(cross.outputW,0);
});
test('electrically equivalent battery buses are accepted and cable drop follows section and length',()=>{
 const alternative=referenceWires.map(w=>w.includes('invDC+')?['mpptBAT+','invDC+']:w.includes('invDC-')?['mpptBAT-','invDC-']:w);
 assert.ok(evaluateBench(benchDefaults,alternative).connected);
 const r=evaluateBench(benchDefaults,referenceWires),long=evaluateBench({...benchDefaults,length:24},referenceWires),thick=evaluateBench({...benchDefaults,section:12},referenceWires);
 near(long.dropPct,r.dropPct*2);near(thick.dropPct,r.dropPct/2);assert.ok(long.codes.includes('drop'));
});
test('zero irradiance, high PV voltage, depleted/full battery and wind cut-in are bounded',()=>{
 const night=evaluateBench({...benchDefaults,irradiance:0},referenceWires);near(night.sourceVoc,0);near(night.sourceW,0);near(night.outputW,1200);
 const high=evaluateBench({...benchDefaults,series:6},referenceWires);assert.ok(high.codes.includes('pvVoltage'));near(high.controllerW,0);
 const empty=evaluateBench({...benchDefaults,irradiance:0,soc:20},referenceWires);near(empty.outputW,0);near(empty.socAfter10min,20);
 const full=evaluateBench({...benchDefaults,soc:95,loadW:0},referenceWires);near(full.chargeW,0);near(full.drawI,0);near(full.socAfter10min,95);
 const wind=evaluateBench({...benchDefaults,source:'wind',windSpeed:2},referenceWires);near(wind.sourceW,0);
});
test('the load inventory integrates duty, schedule and overnight usage',()=>{
 near(hourlyLoads(schoolLoads).reduce((a,b)=>a+b,0),7.952);
 const x=hourlyLoads([{id:'night',label:'Night',watts:100,quantity:2,start:18,end:6,duty:.5}]);near(x.reduce((a,b)=>a+b,0),1.2);near(x[12],0);near(x[22],.1);
 assert.throws(()=>hourlyLoads([{...schoolLoads[0],watts:-1}]),RangeError);
});
test('hourly dispatch conserves bus and stored energy, with bounded SOC and fuel',()=>{
 const r=dispatchHybrid(hybridDefaults,schoolLoads);near(r.loadKWh,7.952);assert.ok(r.maxBalanceError<1e-9);assert.ok(r.rows.every(x=>x.soc>=20-1e-8&&x.soc<=95+1e-8));
 const dumped=r.rows.reduce((s,x)=>s+x.dumped,0);
 near(r.pvKWh+r.dieselKWh,r.servedKWh+r.curtailedKWh+dumped+r.storageChangeKWh+r.storageLossKWh);
 near(r.dieselLiters+r.fuelRemaining,hybridDefaults.fuelLiters);
});
test('no sun, no diesel and low fuel expose unserved demand instead of inventing supply',()=>{
 const empty=dispatchHybrid({...hybridDefaults,sunHours:0,generatorKW:0,socStart:20},schoolLoads);near(empty.unservedKWh,7.952);near(empty.dieselLiters,0);
 const battery=dispatchHybrid({...hybridDefaults,sunHours:0,generatorKW:0},schoolLoads);near(battery.dischargeKWh,8*(.6-.2)*.95);assert.ok(battery.unservedKWh>0);
 const fuel=dispatchHybrid({...hybridDefaults,sunHours:0,socStart:20,fuelLiters:.1},schoolLoads);near(fuel.dieselLiters,.1);assert.ok(fuel.generatorHours>0&&fuel.generatorHours<1);assert.ok(fuel.unservedKWh>0);
});
test('dispatch remains conservative across varied solar, storage, efficiencies and strategies',()=>{
 for(let i=0;i<120;i++){const p={...hybridDefaults,pvKWp:(i%11)*.7,sunHours:(i%9),batteryKWh:1+(i%30),socStart:20+(i%76),generatorKW:(i%8)*.6,fuelLiters:(i%7)*.2,strategy:i%2?'reserve':'battery-first',etaCharge:.7+(i%31)/100,etaDischarge:.7+((i*3)%31)/100};assert.ok(validHybridInput(p));const r=dispatchHybrid(p,schoolLoads);assert.ok(r.maxBalanceError<1e-8);assert.ok(r.rows.every(x=>x.soc>=p.socMin-1e-7&&x.soc<=p.socMax+1e-7&&x.unserved>=-1e-9));assert.ok(r.dieselLiters<=p.fuelLiters+1e-8);}
});
test('portable learning backups validate identity-free content and reject malformed data',()=>{
 const record=newLearningRecord();assert.ok(validLearningRecord(record));assert.deepEqual(parseLearningBackup(JSON.stringify({format:'bioenergia-amazonia-1',record})),record);assert.deepEqual(parseLearningBackup(JSON.stringify({format:'bioenergia-local-1',profile:{name:'Equipe'},record})),record);
 for(const bad of [{...record,loads:[{...schoolLoads[0],duty:2}]},{...record,hybrid:{...record.hybrid,socStart:5}},{...record,wires:[['bad','source+']]},{...record,questions:[{id:'tiny',subject:'x',body:'x'}]},{...record,completed:['unknown']}])assert.equal(validLearningRecord(bad),false);
 assert.throws(()=>parseLearningBackup('{broken'));assert.throws(()=>parseLearningBackup('x'.repeat(550001)));
});
