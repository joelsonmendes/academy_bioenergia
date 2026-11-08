import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePV, newPVProject, validPVProject, parsePowerClimate, tiltedIrradiation, annualMean} from './pv-report-model.mjs';

test('PV sizing rounds real modules and checks cold Voc, hot MPPT and currents', () => {
  const p = newPVProject();
  const r = calculatePV(p);
  assert.equal(r.modules, r.ns * r.strings);
  assert.equal(r.distribution.reduce((a,b) => a+b, 0), r.strings);
  assert.ok(r.dailyGeneration >= r.targetDaily);
  assert.ok(r.stringVoc < p.inputs.inverterMaxV);
  assert.ok(r.stringVmpHot >= p.inputs.mpptMin);
  assert.deepEqual(r.checks.filter(c => c.kind === 'error'), []);
  p.stringMode = 'manual';
  p.inputs.manualNs = 20;
  p.inputs.manualStrings = 4;
  const invalid = calculatePV(p);
  for (const id of ['string-voc','string-mppt','mppt-current','dc-power']) {
    assert.equal(invalid.checks.find(c => c.id === id).kind, 'error', id);
  }
});

test('PV string ampacity uses the declared installation table and a two-conductor voltage loop', () => {
  const p = newPVProject();
  const r = calculatePV(p);
  assert.ok(Math.abs(r.dcResistance - 5.09 * (1 + .00393 * (90 - 20))) < 1e-9);
  assert.ok(Math.abs(r.dcDropV - 2 * r.dcResistance * .02 * p.inputs.imp * p.inputs.iscFactor) < 1e-9);
  assert.equal(r.dcIz, 35);
  p.inputs.dcLength *= 2;
  assert.ok(Math.abs(calculatePV(p).dcDropV - 2 * r.dcDropV) < 1e-9);
  p.inputs.dcGroup = .3;
  assert.equal(calculatePV(p).checks.find(c => c.id === 'dc-cable').kind, 'error');
});

test('independent MPPT inputs are not treated as a common parallel bus for reverse current', () => {
  const p = newPVProject();
  p.stringMode = 'manual';
  p.inputs.manualNs = 4;
  p.inputs.manualStrings = 2;
  const independent = calculatePV(p);
  assert.deepEqual(independent.distribution, [1,1]);
  assert.equal(independent.reverseA, 0);
  assert.equal(independent.fuseNeeded, false);
  p.inputs.mppts = 1;
  p.inputs.stringsPerMppt = 3;
  p.inputs.mpptA = 100;
  p.inputs.mpptIsc = 150;
  p.inputs.manualStrings = 3;
  const parallel = calculatePV(p);
  assert.ok(parallel.reverseA > p.inputs.moduleReverse);
  assert.equal(parallel.fuseNeeded, true);
  assert.ok(parallel.fuseA > 1.5 * p.inputs.isc && parallel.fuseA < 2.4 * p.inputs.isc);
  assert.ok(parallel.fuseA <= p.inputs.moduleFuse);
});

test('battery sizing meets energy, voltage association and rated inverter current in off-grid and hybrid modes', () => {
  for (const system of ['offgrid','hybrid']) {
    const p = newPVProject();p.system = system;
    const r = calculatePV(p);
    assert.ok(r.batteryUsableKwh >= r.criticalDaily * p.inputs.autonomyDays);
    assert.ok(r.batteryParallel * p.inputs.batteryMaxA >= r.batteryFuseA);
    assert.equal(r.batterySeries * p.inputs.unitV, p.inputs.batteryV);
    assert.equal(r.batteryUnits, r.batteryParallel * r.batterySeries);
    p.hasBatteryPort = false;
    assert.equal(calculatePV(p).checks.find(c => c.id === 'battery-port').kind, 'error');
  }
});

test('grid current distinguishes two-wire and three-phase voltage and protects cables', () => {
  const p = newPVProject();
  p.inputs.inverterAcA = 0;
  const single = calculatePV(p);
  p.inputs.phases = 3;
  const three = calculatePV(p);
  assert.ok(Math.abs(three.acCurrent * Math.sqrt(3) - single.acCurrent) < 1e-9);
  p.inputs.acIz = 2;
  assert.equal(calculatePV(p).checks.find(c => c.id === 'ac-protection').kind, 'error');
});

test('invalid and unbounded PV imports are rejected before calculations', () => {
  const p = newPVProject();
  assert.equal(validPVProject(p), true);
  p.inputs.hsp = 0;
  assert.equal(calculatePV(p), null);
  p.inputs.hsp = 4.5;
  p.loads[0].hours = 25;
  assert.equal(validPVProject(p), false);
  p.loads[0].hours = 5;
  p.inputs.manualNs = Infinity;
  assert.equal(calculatePV(p), null);
});

test('NASA climate units are checked and converted, and horizontal transposition conserves GHI', () => {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const rows = value => Object.fromEntries(months.map((key, i) => [key, value + i / 10]));
  const raw = {
    properties:{parameter:{ALLSKY_SFC_SW_DWN:rows(18),ALLSKY_SFC_SW_DIFF:rows(7.2)}},
    parameters:{ALLSKY_SFC_SW_DWN:{units:'MJ/m^2/day'},ALLSKY_SFC_SW_DIFF:{units:'MJ/m^2/day'}},
    header:{range:'Fixture, not a measured climatology'}
  };
  const climate = parsePowerClimate(raw,-9.97,-67.81,'https://power.larc.nasa.gov/api/temporal/climatology/point?fixture=1');
  assert.ok(Math.abs(climate.ghi[0] - 5) < 1e-9);
  const horizontal = tiltedIrradiation(climate, 0, 0);
  horizontal.forEach((value, i) => assert.ok(Math.abs(value-climate.ghi[i]) < 1e-9));
  const p = newPVProject();
  p.solar = climate;p.solarMode='annual';p.inputs.tilt=0;
  assert.ok(Math.abs(calculatePV(p).hsp - annualMean(climate.ghi)) < 1e-9);
  p.solarMode='worst';
  assert.equal(calculatePV(p).hsp, Math.min(...climate.ghi));
  p.inputs.latitude=-12;
  assert.equal(calculatePV(p).hsp,p.inputs.hsp);
  raw.parameters.ALLSKY_SFC_SW_DWN.units='W/m2';
  assert.throws(() => parsePowerClimate(raw,-9.97,-67.81,climate.url),/SOLAR_UNITS/);
});
