import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {benchDefaults, evaluateBench, referenceWires, terminalIds} from './amazon-model.mjs';

const {outputFiles} = await build({
  entryPoints: [fileURLToPath(new URL('../src/campus-bench-wiring.ts', import.meta.url))],
  platform: 'node', bundle: true, format: 'esm', write: false
});
const {addBenchWire, benchCablePath, benchTerminalPositions, deviceTerminals, wireKind} =
  await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));

test('3D routes use the same fourteen terminal IDs and remain reversible', () => {
  assert.deepEqual(Object.keys(benchTerminalPositions).sort(), [...terminalIds].sort());
  assert.deepEqual(Object.values(deviceTerminals).flat().sort(), [...terminalIds].sort());
  for (const [a, b] of referenceWires) {
    const path = benchCablePath([a, b]);
    assert.deepEqual(path[0], benchTerminalPositions[a]);
    assert.deepEqual(path.at(-1), benchTerminalPositions[b]);
    assert.deepEqual(benchCablePath([b, a]), [...path].reverse());
    assert.equal(wireKind([a, b]), wireKind([b, a]));
  }
  assert.equal(wireKind(['source+', 'mpptPV-']), 'mixed');
  assert.equal(wireKind(['invL', 'loadL']), 'line');
  assert.equal(wireKind(['bat-', 'invDC-']), 'negative');
});

test('wiring actions preserve the notebook format and expose a virtual polarity fault', () => {
  let wires = [];
  for (const pair of referenceWires) {
    const next = addBenchWire(wires, pair);
    assert.equal(next.status, 'added');
    wires = next.wires;
  }
  assert.deepEqual(wires, referenceWires);
  assert.equal(evaluateBench(benchDefaults, wires).outputW, 1200);
  assert.equal(addBenchWire(wires, ['mpptPV+', 'source+']).status, 'duplicate');
  assert.equal(addBenchWire(wires, ['source+', 'source+']).status, 'cancelled');
  const wrong = addBenchWire(wires, ['source+', 'mpptPV-']);
  const fault = evaluateBench(benchDefaults, wrong.wires);
  assert.equal(wrong.status, 'added');
  assert.equal(fault.outputW, 0);
  assert.ok(fault.tripped);
  assert.equal(addBenchWire(Array.from({length: 24}, () => ['bat+', 'invDC+']), ['invL', 'loadL']).status, 'full');
});
