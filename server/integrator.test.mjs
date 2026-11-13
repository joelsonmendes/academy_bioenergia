import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {newLearningRecord, parseLearningBackup, validLearningRecord} from './learning-model.mjs';

const {outputFiles} = await build({
  stdin: {contents: "export * from './src/integrator-engine'; export * from './src/integrator-schema'; export * from './src/integrator-report';",
    resolveDir: new URL('..', import.meta.url).pathname},
  platform: 'node', bundle: true, format: 'esm', write: false
});
const {newIntegratorRecord, estimateSchool, compareSchool, suggestedEquipment, submissionReadiness, makeProjectReport} =
  await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('school case reuses PV sizing and converts scheduled loads to equivalent hours', () => {
  const project = newIntegratorRecord();
  const estimate = estimateSchool(project);
  near(estimate.daily, 7.952);
  near(estimate.essential, 2.592);
  near(estimate.peak, 1.352);
  assert.ok(estimate.inventoryReady);
  assert.equal(estimate.preview.neededModules, 6);
  assert.deepEqual(suggestedEquipment(estimate.preview), {
    modules: project.simulation.modules, batteryKWh: project.simulation.batteryKWh, inverterKW: project.simulation.inverterKW
  });
  const night = {...project, loads: [{...project.loads[0], start: 22, end: 6, watts: 100, quantity: 2, duty: .5}]};
  near(estimateSchool(night).daily, .8);
  near(compareSchool(night).solar.loadKWh, .8);
});

test('A/B dispatch shares demand and initial conditions and preserves the hourly balance', () => {
  const project = newIntegratorRecord();
  const {solar, diesel} = compareSchool(project);
  assert.deepEqual(solar.rows.map(row => row.load), diesel.rows.map(row => row.load));
  near(solar.pvKWh, diesel.pvKWh);
  near(solar.socInitial, diesel.socInitial);
  near(solar.unservedKWh, 1.73555);
  near(solar.dieselLiters, 0);
  near(diesel.unservedKWh, 0);
  near(diesel.dieselLiters, 1.506);
  for (const result of [solar, diesel]) {
    near(result.loadKWh, result.servedKWh + result.unservedKWh);
    near(result.maxBalanceError, 0);
  }
  const noFuel = compareSchool({...project, simulation: {...project.simulation, fuelLiters: 0}});
  assert.deepEqual(noFuel.solar.rows, noFuel.diesel.rows);
  assert.equal(compareSchool({...project, simulation: {...project.simulation, modules: 1000}}), null);
});

test('old notebook backups and new project drafts can both be restored', () => {
  const notebook = newLearningRecord();
  assert.deepEqual(parseLearningBackup(JSON.stringify(notebook)), notebook);
  const project = {...newIntegratorRecord(), step: 'compare', compared: true};
  const saved = {...notebook, integrator: project};
  assert.deepEqual(parseLearningBackup(JSON.stringify({format: 'bioenergia-local-1', record: saved})), saved);
  assert.equal(validLearningRecord({...saved, integrator: {...project, simulation: {...project.simulation, modules: 2.5}}}), false);
  assert.equal(validLearningRecord({...saved, integrator: {...project, loads: [project.loads[0], project.loads[0]]}}), false);
  assert.equal(validLearningRecord({...saved, integrator: {...project, simulation: {...project.simulation, socStart: 19}}}), false);
});

test('submission reflects the current run, includes the selected diagram and escapes student text', () => {
  const project = {
    ...newIntegratorRecord(), author: '<Equipe 1>', choice: 'diesel', compared: true, reviewed: true,
    rationale: '<img src=x onerror=alert(1)>', maintenance: 'Checar histórico de alarmes.', fieldData: 'Medir a demanda.'
  };
  const estimate = estimateSchool(project);
  const comparison = compareSchool(project);
  assert.equal(submissionReadiness({...project, compared: false}, estimate, comparison).comparison, false);
  const html = makeProjectReport(project, estimate, comparison, 'pt', 'data:image/webp;base64,AA==');
  assert.match(html, /Pronto para revisão docente/);
  assert.match(html, /1,736 kWh/);
  assert.match(html, /Diagrama funcional · B/);
  assert.match(html, /&lt;Equipe 1&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  const draft = makeProjectReport({...project, reviewed: false, choice: 'solar'}, estimate, comparison, 'en', '');
  assert.match(draft, /Draft · evidence pending/);
  assert.match(draft, /Functional diagram · A/);
  assert.doesNotMatch(draft, /<path d="M376 92V71"/);
});
