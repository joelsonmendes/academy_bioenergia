import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const {outputFiles} = await build({
  entryPoints: [fileURLToPath(new URL('../src/renewable-bench.ts', import.meta.url))],
  platform: 'node', bundle: true, format: 'esm', write: false
});
const {advanceBench, benchLimits, evaluateRenewableBench, initialBenchState, renewableDefaults} =
  await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, actual + ' ≈ ' + expected);
const evaluate = (input, state = initialBenchState()) => evaluateRenewableBench({...renewableDefaults, ...input}, state);

test('PV series raises voltage and parallel strings raise current at the virtual PMP', () => {
  const single = evaluate({series: 1, parallel: 1});
  const series = evaluate({series: 2, parallel: 1});
  const parallel = evaluate({series: 1, parallel: 2});
  near(series.solarV, 2 * single.solarV);
  near(series.solarA, single.solarA);
  near(parallel.solarV, single.solarV);
  near(parallel.solarA, 2 * single.solarA);
  near(series.solarV * series.solarA, series.solarW);
});

test('on-grid exchange balances the load, and loss of the grid stops AC output', () => {
  const sunny = evaluate({});
  near(sunny.solarW, 160);
  near(sunny.exportW, 50.4);
  near(sunny.generationW + sunny.importW - sunny.exportW, sunny.servedW);
  const dim = evaluate({irradiance: 250});
  near(dim.importW, 53);
  near(dim.generationW + dim.importW - dim.exportW, dim.servedW);
  const outage = evaluate({gridPresent: false});
  near(outage.solarW, 160);
  for (const key of ['generationW', 'servedW', 'importW', 'exportW', 'acV', 'acA']) near(outage[key], 0);
  near(outage.unmetW, renewableDefaults.loadW);
});

test('off-grid charging and discharging respect stored energy, power and SOC boundaries', () => {
  const initial = initialBenchState();
  const day = evaluate({mode: 'island', mix: 'hybrid'}, initial);
  assert.ok(day.solarW > 0 && day.windW > 0 && day.batteryW > 0);
  near(day.next.storedWh - initial.storedWh, day.batteryW * .95 / 60);
  const dark = {...renewableDefaults, mode: 'island', mix: 'hybrid', irradiance: 0, windSpeed: 0};
  const first = evaluate(dark, initial);
  near(first.servedW, dark.loadW);
  near(first.next.storedWh - initial.storedWh, first.batteryW / (.95 * 60));
  let state = initial;
  for (let i = 0; i < 100; i++) {
    const reading = evaluate(dark, state);
    assert.ok(reading.next.storedWh <= state.storedWh + 1e-8);
    state = reading.next;
  }
  near(state.storedWh, benchLimits.batteryWh * benchLimits.minSoc / 100);
  near(evaluate(dark, state).unmetW, dark.loadW);
  const full = {...state, storedWh: benchLimits.batteryWh * benchLimits.maxSoc / 100};
  const fullDay = evaluate({mode: 'island', loadW: 0}, full);
  near(fullDay.batteryW, 0);
  near(fullDay.next.storedWh, full.storedWh);
});

test('pumping respects head, power, available water and level limits', () => {
  const low = evaluate({mode: 'pump', headM: 5});
  const high = evaluate({mode: 'pump', headM: 10});
  near(low.pumpW, 20);
  near(low.flowLpm, 2 * high.flowLpm);
  near(low.flowLpm / 60000 * 1000 * 9.81 * 5, low.hydraulicW);
  near(evaluate({mode: 'pump', irradiance: 0}).flowLpm, 0);
  let state = initialBenchState();
  for (let i = 0; i < 6; i++) {
    const reading = evaluate({mode: 'pump'}, state);
    near(reading.upperL + reading.lowerL, benchLimits.waterTotalL);
    near(reading.next.upperL - state.upperL, reading.flowLpm);
    assert.ok(reading.next.upperL <= benchLimits.upperCapacityL);
    state = reading.next;
  }
  near(state.upperL, benchLimits.upperCapacityL);
  near(evaluate({mode: 'pump'}, state).flowLpm, 0);
});

test('the sampling window preserves chronology and records pumping as solar', () => {
  let run = {state: initialBenchState(), samples: []};
  const input = {...renewableDefaults, mode: 'pump', mix: 'wind'};
  for (let i = 0; i < benchLimits.maxSamples + 5; i++) run = advanceBench(input, run);
  assert.equal(run.samples.length, benchLimits.maxSamples);
  assert.equal(run.samples[0].minute, 6);
  assert.equal(run.samples.at(-1).minute, run.state.minute);
  assert.ok(run.samples.every(sample => sample.mode === 'pump' && sample.mix === 'solar'));
});
