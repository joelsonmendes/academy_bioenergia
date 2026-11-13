import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const {outputFiles} = await build({
  entryPoints: [fileURLToPath(new URL('../src/generation-engine.ts', import.meta.url))],
  platform: 'node', bundle: true, format: 'esm', write: false
});
const {annualEnergy, calculateCogeneration, classifyGeneration, compensateEnergy} = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64')
);

const connectedSolar = {connection: 'consumer', source: 'solar', powerKw: 75, dispatchControl: false};
const biomass = {
  source: 'otherFuel', installedMw: 0.5, inputEnergy: 1000, electricity: 300, recoverableHeat: 450, heatDemand: 450
};

test('MMGD treats 75, 3,000 and 5,000 kW AC as inclusive ceilings', () => {
  const cases = [
    ['solar', 75, 'micro', 3000],
    ['solar', 75.001, 'mini', 3000],
    ['solar', 3000, 'mini', 3000],
    ['solar', 3000.001, 'above', 3000],
    ['wind', 4000, 'above', 3000],
    ['hydro', 4000, 'above', 3000],
    ['controlledHydro', 4000, 'mini', 5000],
    ['biomass', 5000, 'mini', 5000],
    ['biogas', 5000.001, 'above', 5000],
    ['qualifiedChp', 5000, 'mini', 5000]
  ];
  for (const [source, powerKw, band, miniLimitKw] of cases) {
    assert.deepEqual(classifyGeneration({...connectedSolar, source, powerKw, dispatchControl: true}), {band, miniLimitKw});
  }
  assert.deepEqual(classifyGeneration({...connectedSolar, source: 'biomass', powerKw: 4000}), {band: 'above', miniLimitKw: 3000});
});

test('size alone cannot make an off-grid, separate-access or ineligible plant part of MMGD', () => {
  assert.deepEqual(classifyGeneration({...connectedSolar, connection: 'isolated'}), {band: 'isolated'});
  assert.deepEqual(classifyGeneration({...connectedSolar, connection: 'plant'}), {band: 'otherRegime'});
  assert.deepEqual(classifyGeneration({...connectedSolar, source: 'other'}), {band: 'ineligible'});
  for (const powerKw of [null, 0, -1, NaN, Infinity]) {
    assert.equal(classifyGeneration({...connectedSolar, powerKw}), null);
  }
});

test('SCEE accounting uses the metered import and injection after simultaneous self-consumption', () => {
  assert.deepEqual(compensateEnergy(550, 600, 250), {
    direct: 250, injected: 300, imported: 350, compensated: 300, credits: 0, remaining: 50
  });
  assert.deepEqual(compensateEnergy(800, 600, 250), {
    direct: 250, injected: 550, imported: 350, compensated: 350, credits: 200, remaining: 0
  });
  assert.equal(compensateEnergy(550, 600, 550).compensated, 0);
  assert.equal(compensateEnergy(0, 0, 0).remaining, 0);
  assert.equal(compensateEnergy(550, 600, 551), null);
  assert.equal(compensateEnergy(700, 600, 601), null);
  assert.equal(compensateEnergy(550, 600, null), null);
});

test('cogeneration credits only the heat used and conserves the hourly energy balance', () => {
  const full = calculateCogeneration(biomass);
  assert.equal(full.efficiency, 75);
  assert.equal(full.electricPercent, 30);
  assert.equal(full.heat + full.electricity + full.losses, full.inputEnergy);
  assert.equal(full.meetsEnergyCriteria, true);

  const noDemand = calculateCogeneration({...biomass, heatDemand: 0});
  assert.equal(noDemand.efficiency, 30);
  assert.equal(noDemand.discardedHeat, 450);
  assert.equal(noDemand.losses, 700);
  assert.equal(noDemand.meetsEnergyCriteria, false);
  assert.equal(calculateCogeneration({...biomass, heatDemand: 1000}).heat, 450);
  assert.deepEqual(calculateCogeneration({...biomass, inputEnergy: 749}), {valid: false, error: 'balance'});
  assert.deepEqual(calculateCogeneration({...biomass, installedMw: 0.2}), {valid: false, error: 'nameplate'});
});

test('REN 1,031 criteria use the correct source and installed MW band and enforce both inequalities', () => {
  for (const [source, installedMw, x, fc] of [
    ['otherFuel', 5, 2.5, 32], ['otherFuel', 5.01, 2.14, 37], ['otherFuel', 20, 2.14, 37], ['otherFuel', 20.01, 1.88, 42],
    ['fossil', 5, 2.14, 41], ['fossil', 10, 2.13, 44], ['fossil', 30, 2, 50],
    ['recovered', 5, 2.6, 25], ['recovered', 10, 2.17, 30], ['recovered', 30, 1.86, 35]
  ]) {
    const result = calculateCogeneration({...biomass, source, installedMw});
    assert.equal(result.x, x);
    assert.equal(result.fc, fc);
  }
  assert.equal(calculateCogeneration({...biomass, electricity: 260, heatDemand: 150}).meetsEnergyCriteria, true);
  assert.equal(calculateCogeneration({...biomass, electricity: 259, heatDemand: 150}).meetsEnergyCriteria, false);
  assert.equal(calculateCogeneration({...biomass, heatDemand: 149.99}).meetsEnergyCriteria, false);
  assert.equal(calculateCogeneration({...biomass, electricity: 0, recoverableHeat: 900, heatDemand: 900}).meetsEnergyCriteria, false);
});

test('annual estimate converts MW to MWh using 8,760 hours and a fractional capacity factor', () => {
  assert.deepEqual(annualEnergy(20, 22), {averageMw: 4.4, energyMwh: 38544});
  assert.deepEqual(annualEnergy(20, 0), {averageMw: 0, energyMwh: 0});
  assert.equal(annualEnergy(20, 100).energyMwh, 175200);
  assert.equal(annualEnergy(20, 101), null);
  assert.equal(annualEnergy(null, 22), null);
});
