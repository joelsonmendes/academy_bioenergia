import test from 'node:test';
import assert from 'node:assert/strict';
import {assess, boardWidth, defaultControls, limits, makeCircuit, modules, pairKey, referenceWires,
  resizeArrayWires, simulate, wiringError} from '../src/pv-bench/circuit.mjs';

const run = (circuit, wires = referenceWires(circuit), controls = {}) =>
  simulate(circuit, assess(circuit, wires), {...defaultControls(), ...controls});
const without = (circuit, stage) => circuit.specs.filter(spec => spec.stage !== stage);
const grid = makeCircuit('grid');
const island = makeCircuit('island');
const hybrid = makeCircuit('hybrid');

test('each mode and array size has visible terminals and unique reference pairs', () => {
  for (const mode of Object.keys(modules.defaults)) {
    for (let count = modules.min; count <= modules.max; count++) {
      const circuit = makeCircuit(mode, count);
      const ports = circuit.items.flatMap(item => item.connections);
      assert.equal(circuit.items.filter(item => item.asset === 'pv').length, count);
      assert.equal(new Set(ports.map(port => port.id)).size, ports.length);
      assert.ok(ports.every(port => port.x > 15 && port.x < boardWidth - 15
        && port.y > 15 && port.y < circuit.height - 15));
      assert.equal(circuit.byKey.size, circuit.specs.length);
      assert.ok(circuit.specs.every(({a, b}) => circuit.ports[a] && circuit.ports[b]));
      const reversed = referenceWires(circuit).map(({a, b}) => ({a: b, b: a}));
      assert.equal(assess(circuit, reversed).correct, circuit.specs.length);
      assert.equal(assess(circuit, reversed).wrong.length, 0);
    }
  }
});

test('on-grid conserves the AC energy balance and ceases injection without the grid', () => {
  const r = run(grid);
  assert.ok(Math.abs(r.availableW - 2084.4) < 1e-6);
  assert.equal(r.loadW, 700);
  assert.equal(r.exportW, r.generationW - r.loadW);
  assert.equal(r.importW, 0);
  const low = run(grid, undefined, {irradiance: 100});
  assert.equal(low.importW, low.loadW - low.generationW);
  for (const off of [run(grid, undefined, {gridOnline: false}), run(grid, without(grid, 'grid'))]) {
    assert.equal(off.generationW, 0);
    assert.equal(off.loadW, 0);
    assert.equal(off.exportW + off.importW, 0);
  }
});

test('on-grid distinguishes the PV path, inverter branch and load branch', () => {
  for (const open of [run(grid, without(grid, 'string')), run(grid, undefined, {dcClosed: false}), run(grid, undefined, {acClosed: false})]) {
    assert.equal(open.generationW, 0);
    assert.equal(open.loadW, 700);
    assert.equal(open.importW, 700);
  }
  const disconnected = run(grid, without(grid, 'load'));
  assert.equal(disconnected.loadW, 0);
  assert.equal(disconnected.exportW, disconnected.generationW);
  const openLoad = run(grid, undefined, {demand: 0});
  assert.equal(openLoad.loadV, 220);
  assert.equal(openLoad.loadW, 0);
});

test('the simulation blocks missing PE and invalid cross-domain or polarity links', () => {
  for (const circuit of [grid, island, hybrid]) {
    assert.equal(run(circuit, []).loadW, 0);
    const bad = [...referenceWires(circuit), {a: 'm1+', b: 'panel-in1'}];
    const assessment = assess(circuit, bad);
    assert.equal(assessment.wrong.length, 1);
    assert.match(wiringError(circuit, assessment.wrong[0]), /Domínios/);
    assert.equal(run(circuit, bad).generationW, 0);
    assert.equal(run(circuit, without(circuit, 'pe')).loadW, 0);
    assert.match(wiringError(circuit, {a: 'm1+', b: 'box-in-'}), /Polaridade/);
  }
});

test('adding and removing modules keeps the other wires and opens the changed end of the string', () => {
  const seven = makeCircuit('hybrid', 7);
  const edited = resizeArrayWires(hybrid, seven, referenceWires(hybrid));
  const state = assess(seven, edited);
  assert.equal(state.correct, hybrid.specs.length - 1);
  assert.equal(state.wrong.length, 0);
  assert.ok(state.stage('battery') && state.stage('pe') && state.stage('grid'));
  assert.deepEqual(state.missing.map(({a,b}) => pairKey(a,b)),
    [pairKey('m6+', 'm7-'), pairKey('m7+', 'box-in+')]);
  const open = run(seven, edited);
  assert.equal(open.pvUsedW, 0);
  assert.equal(open.loadW, 700);
  const restored = [...edited, ...state.missing];
  assert.ok(run(seven, restored).availableW > run(hybrid).availableW);
  const short = resizeArrayWires(seven, hybrid, restored);
  assert.deepEqual(assess(hybrid, short).missing.map(spec => spec.key), [pairKey('m6+', 'box-in+')]);
  assert.equal(assess(hybrid, short).wrong.length, 0);
  assert.ok(short.every(({a,b}) => hybrid.ports[a] && hybrid.ports[b]));
});

test('larger arrays raise voltage and name the violated MPPT or Voc limit', () => {
  const baseline = run(hybrid, undefined, {temperature: 25});
  const larger = run(makeCircuit('hybrid', 8), undefined, {temperature: 25});
  assert.equal(larger.pvV, 8 * 41);
  assert.equal(larger.voc, 8 * 49.5);
  assert.ok(larger.availableW > baseline.availableW);
  assert.equal(run(makeCircuit('hybrid', 2)).pvStatus, 'mppt-low');
  const highMppt = run(makeCircuit('grid', 10), undefined, {temperature: 25});
  assert.equal(highMppt.pvStatus, 'mppt-high');
  const highVoc = run(makeCircuit('hybrid', 11), undefined, {temperature: 25});
  assert.equal(highVoc.pvStatus, 'voc-high');
  assert.equal(highVoc.pvUsedW, 0);
  assert.equal(highVoc.loadW, 700);
  assert.equal(run(makeCircuit('island', 4)).pvStatus, 'voc-high');
});

test('hybrid uses solar, storage and the grid in order, respecting conversion and battery limits', () => {
  const charging = run(hybrid);
  assert.equal(charging.loadW + charging.normalLoadW, 1200);
  assert.equal(charging.generationW, 1200);
  assert.equal(charging.importW + charging.exportW, 0);
  assert.ok(charging.chargeW > 0 && charging.nextSoc > 65);
  assert.equal(charging.dischargeW, 0);
  const full = run(hybrid, undefined, {soc: limits.socMax, irradiance: 1000});
  assert.equal(full.chargeW, 0);
  assert.equal(full.exportW, full.generationW - 1200);
  assert.ok(full.exportW > 0);
  const dark = run(hybrid, undefined, {irradiance: 0, normalDemand: 1900});
  assert.equal(dark.dischargeW, limits.batteryW);
  assert.ok(dark.importW > 0);
  assert.equal(dark.exportW, 0);
  assert.ok(Math.abs(dark.generationW + dark.importW - dark.loadW - dark.normalLoadW) < 1e-8);
  assert.equal(run(hybrid, undefined, {irradiance: 0, soc: limits.socMin}).importW, 1200);
  assert.equal(run(makeCircuit('hybrid', 10), undefined, {soc: limits.socMax, irradiance: 1200}).generationW,
    limits.hybridGridLimit);
});

test('hybrid EPS isolates the external ramal and follows its own protection and battery state', () => {
  const outage = {gridOnline: false, irradiance: 0};
  const backup = run(hybrid, undefined, outage);
  assert.equal(backup.loadW, 700);
  assert.equal(backup.normalLoadW, 0);
  assert.equal(backup.importW + backup.exportW, 0);
  assert.equal(backup.gridBranchW, 0);
  assert.ok(backup.backupActive && backup.nextSoc < 65);
  const surplus = run(hybrid, undefined, {gridOnline: false, irradiance: 1200, soc: limits.socMax});
  assert.equal(surplus.generationW, 700);
  assert.equal(surplus.exportW + surplus.importW, 0);
  for (const failure of [{epsClosed: false}, {soc: limits.socMin}, {demand: 1800}]) {
    assert.equal(run(hybrid, undefined, {...outage, ...failure}).loadW, 0);
  }
  assert.equal(run(hybrid, without(hybrid, 'battery'), outage).loadW, 0);
  assert.equal(run(hybrid, without(hybrid, 'epsOut'), outage).loadW, 0);
  const openedRamal = run(hybrid, undefined, {acClosed: false, irradiance: 0});
  assert.equal(openedRamal.loadW, 700);
  assert.equal(openedRamal.normalLoadW, 500);
  assert.equal(openedRamal.importW, 500);
  assert.equal(openedRamal.exportW, 0);
  const cross = {a: 'inv-eps1', b: 'grid-l1'};
  assert.match(wiringError(hybrid, cross), /EPS/);
  assert.equal(run(hybrid, [...referenceWires(hybrid), cross]).loadW, 0);
});

test('off-grid supplies a connected load from storage at night and bounds SOC', () => {
  const r = run(island, undefined, {irradiance: 0});
  assert.equal(r.pvUsedW, 0);
  assert.equal(r.loadW, 700);
  assert.ok(r.dischargeW > 700);
  assert.ok(r.nextSoc < 65 && r.nextSoc > limits.socMin);
  assert.equal(run(island, undefined, {irradiance: 0, soc: 20}).loadW, 0);
  assert.equal(run(island, undefined, {irradiance: 0, demand: 1800}).loadW, 0);
  assert.equal(run(island, without(island, 'battery')).loadW, 0);
  assert.equal(run(island, undefined, {acClosed: false}).loadW, 0);
  const full = run(island, undefined, {soc: 94.99, demand: 0, irradiance: 1200});
  assert.ok(full.chargeW > 0);
  assert.ok(Math.abs(full.nextSoc - 95) < 1e-9);
  assert.equal(run(island, undefined, {soc: 95}).chargeW, 0);
  const unlinked = run(island, without(island, 'battery'), {demand: 0});
  assert.ok(unlinked.chargeW > 0);
  const cold = run(island, undefined, {temperature: 10});
  assert.ok(cold.voc > 150 && !cold.mpptReady);
  assert.equal(cold.chargeW, 0);
  assert.equal(cold.loadW, 700);
});
