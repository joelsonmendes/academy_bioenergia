import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {calculatePV, newPVProject, validPVProject} from './pv-report-model.mjs';

const {outputFiles} = await build({
  entryPoints: [fileURLToPath(new URL('../src/pv-calculator-engine.ts', import.meta.url))],
  platform: 'node', bundle: true, format: 'esm', write: false
});
const {calculatePVPreview, createPVStudy, pvCalculatorDefaults} = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64')
);

const labels = {title: 'Estudo da Calculadora FV', moduleName: 'Módulo de referência', locationNote: 'HSP manual'};
const defaults = pvCalculatorDefaults;
const loads = [
  {id: 'light', name: 'Iluminação', quantity: 5, watts: 20, hours: 5, startFactor: 1, critical: true},
  {id: 'motor', name: 'Ventilador', quantity: 1, watts: 100, hours: 8, startFactor: 3, critical: false}
];

test('quick on-grid estimate uses the energy minimum and passes its assumptions to the report', () => {
  const preview = calculatePVPreview('ongrid', defaults, []);
  assert.equal(preview.error, null);
  assert.equal(preview.neededModules, 8);
  assert.equal(preview.installedKWp, 4.4);
  assert.ok(Math.abs(preview.generation - 475.2) < 1e-9);
  const study = createPVStudy(preview, labels, null);
  assert.equal(validPVProject(study), true);
  const report = calculatePV(study);
  assert.equal(report.requiredKWp, preview.requiredKWp);
  assert.equal(report.monthlyGeneration, preview.generation);
});

test('stand-alone estimate uses all loads while the hybrid bank uses only backup loads', () => {
  const offgrid = calculatePVPreview('offgrid', defaults, loads);
  const hybrid = calculatePVPreview('hybrid', defaults, loads);
  assert.equal(offgrid.error, null);
  assert.equal(hybrid.error, null);
  assert.equal(offgrid.targetDaily, 1.3);
  assert.equal(offgrid.periodDays, 1);
  assert.equal(offgrid.surgeKW, 0.4);
  assert.equal(hybrid.targetDaily, 15);
  assert.equal(hybrid.criticalDaily, 0.5);
  assert.equal(hybrid.surgeKW, 0.1);
  for (const preview of [offgrid, hybrid]) {
    const study = createPVStudy(preview, labels, null);
    const report = calculatePV(study);
    assert.equal(report.batteryNeededKwh, preview.batteryNeededKwh);
    assert.equal(report.requiredKWp, preview.requiredKWp);
    assert.deepEqual(study.loads, loads);
    assert.notEqual(study.loads[0], loads[0]);
  }
});

test('incomplete, invalid and unserved inputs produce no estimate or handoff', () => {
  for (const values of [{hsp: 0}, {monthlyKwh: NaN}, {moduleW: Infinity}, {days: 30.5}]) {
    assert.equal(calculatePVPreview('ongrid', {...defaults, ...values}, []).error, 'inputs');
  }
  assert.equal(calculatePVPreview('offgrid', defaults, []).error, 'loads');
  assert.equal(calculatePVPreview('offgrid', defaults, [{...loads[0], hours: 0}]).error, 'demand');
  assert.equal(calculatePVPreview('hybrid', defaults, [loads[1]]).error, 'demand');
  assert.equal(calculatePVPreview('offgrid', {...defaults, monthlyKwh: NaN}, loads).error, null);
});

test('applying a new estimate keeps detailed project metadata and rechecks changed equipment', () => {
  const original = newPVProject();
  original.title = 'Projeto Escola';
  original.client.name = 'Cliente de teste';
  original.inverterConfirmed = true;
  original.moduleConfirmed = true;
  original.inputs.inverterEff = 92;
  original.inputs.acLength = 37;
  original.notes = 'Conferir a instalação';
  const preview = calculatePVPreview('hybrid', {...defaults, moduleW: 620}, loads, original.inputs);
  assert.equal(preview.error, null);
  const study = createPVStudy(preview, labels, original);
  assert.equal(study.id, original.id);
  assert.equal(study.title, original.title);
  assert.deepEqual(study.client, original.client);
  assert.equal(study.inputs.acLength, 37);
  assert.equal(study.notes, original.notes);
  assert.equal(study.moduleConfirmed, false);
  assert.equal(study.inverterConfirmed, true);
  assert.equal(study.inputs.moduleW, 620);
  assert.equal(original.inputs.moduleW, 550);
  assert.equal(calculatePV(study).batteryNeededKwh, preview.batteryNeededKwh);
});
