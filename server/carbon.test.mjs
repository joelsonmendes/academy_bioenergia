import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const {outputFiles} = await build({
  entryPoints: [fileURLToPath(new URL('../src/carbon-engine.ts', import.meta.url))],
  platform: 'node', bundle: true, format: 'esm', write: false
});
const {carbonDefaults, estimateCarbon, sbceBand} = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64')
);

test('SBCE article 30 thresholds are strict at 10,000 and 25,000 tCO2e', () => {
  assert.equal(sbceBand(10000), 'under');
  assert.equal(sbceBand(10000.01), 'report');
  assert.equal(sbceBand(25000), 'report');
  assert.equal(sbceBand(25000.01), 'reconcile');
  for (const invalid of [null, -1, NaN, Infinity]) assert.equal(sbceBand(invalid), null);
});

test('diesel scenario converts kilograms to tonnes and conserves baseline CO2', () => {
  const result = estimateCarbon('microgrid', carbonDefaults.microgrid);
  assert.equal(result.savedActivity, 2400);
  assert.equal(result.remainingActivity, 5600);
  assert.ok(Math.abs(result.avoided - 6.432) < 1e-9);
  assert.ok(Math.abs(result.baseline - result.project - result.avoided) < 1e-9);
});

test('purchased electricity uses tCO2 per MWh without a second conversion', () => {
  assert.deepEqual(estimateCarbon('electricity', carbonDefaults.electricity), {
    baseline: 40, project: 32, avoided: 8, savedActivity: 160, remainingActivity: 640
  });
});

test('zero and full reduction are bounded and invalid data does not yield a result', () => {
  const input = carbonDefaults.industry;
  assert.equal(estimateCarbon('industry', {...input, reduction: 0}).avoided, 0);
  assert.equal(estimateCarbon('industry', {...input, reduction: 100}).project, 0);
  assert.equal(estimateCarbon('industry', {...input, reduction: 101}), null);
  assert.equal(estimateCarbon('industry', {...input, activity: -100}), null);
  assert.equal(estimateCarbon('industry', {...input, factor: null}), null);
});
