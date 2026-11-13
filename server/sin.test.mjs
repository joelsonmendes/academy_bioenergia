import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const {outputFiles} = await build({
  entryPoints: [fileURLToPath(new URL('../src/sin-engine.ts', import.meta.url))],
  platform: 'node', bundle: true, format: 'esm', write: false
});
const {calculateSin, sinRegions, sinScenarios, sinCorridors} = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64')
);

test('SIN reference dispatch transfers surplus, serves all demand and respects the regional balances', () => {
  const {total, regions, corridors} = calculateSin(sinScenarios.reference);
  assert.deepEqual(total, {available: 82000, generated: 82000, demand: 82000, served: 82000, deficit: 0, unused: 0});
  assert.equal(regions.north.exported, 3000);
  assert.equal(regions.northeast.exported, 4000);
  assert.equal(regions.central.imported, 7000);
  assert.equal(regions.central.exported, 2500);
  assert.equal(corridors.find(link => link.id === 'central-south').flow, 2500);
});

test('demand peak and wind reduction expose the actual availability shortfall', () => {
  assert.equal(calculateSin(sinScenarios.peak).total.deficit, 6500);
  assert.equal(calculateSin(sinScenarios.wind).total.deficit, 3500);
});

test('a congested corridor leaves both unused power and deficit even with balanced totals', () => {
  const {total, regions, corridors} = calculateSin(sinScenarios.bottleneck);
  assert.equal(total.available, total.demand);
  assert.equal(total.unused, 1000);
  assert.equal(total.deficit, 1000);
  assert.equal(regions.south.served, 14500);
  assert.equal(regions.south.imported, 5000);
  assert.equal(corridors.find(link => link.id === 'central-south').flow, 5000);
});

test('a disconnected South relies on local generation and does not import power', () => {
  const {total, regions, corridors} = calculateSin(sinScenarios.outage);
  assert.equal(total.deficit, 2500);
  assert.equal(total.unused, 2500);
  assert.equal(regions.south.served, 9500);
  assert.equal(regions.south.imported, 0);
  const link = corridors.find(link => link.id === 'central-south');
  assert.equal(link.enabled, false);
  assert.equal(link.flow, 0);
});

test('corridor flows reverse with the regional balances', () => {
  const input = sinScenarios.reference;
  const result = calculateSin({...input, available: {...input.available, south: 15000}, demand: {...input.demand, central: 55500}});
  assert.equal(result.corridors.find(link => link.id === 'central-south').flow, -3000);
  assert.equal(result.regions.south.exported, 3000);
  assert.equal(result.total.deficit, 0);
});

test('SIN model conserves power and respects the max-flow cut across varied inputs', () => {
  const variants = [
    sinScenarios.reference, sinScenarios.peak, sinScenarios.wind, sinScenarios.bottleneck, sinScenarios.outage,
    {...sinScenarios.reference, available: {north: 0, northeast: 0, central: 0, south: 0}},
    {...sinScenarios.reference, demand: {north: 0, northeast: 0, central: 0, south: 0}}
  ];
  for (let i = 0; i < 32; i++) {
    variants.push({
      available: Object.fromEntries(sinRegions.map((region, j) => [region, (i * 997 + j * 4999) % 23000])),
      demand: Object.fromEntries(sinRegions.map((region, j) => [region, (i * 1379 + j * 3697) % 23000])),
      disabled: sinCorridors.filter((_, j) => i & (1 << j)).map(link => link.id)
    });
  }
  for (const input of variants) {
    const {total, regions, corridors} = calculateSin(input);
    assert.equal(total.generated, total.served);
    assert.equal(total.served + total.deficit, total.demand);
    assert.equal(total.generated + total.unused, total.available);
    for (const data of Object.values(regions)) {
      assert.equal(data.generated + data.imported - data.exported, data.served);
      assert.ok(data.deficit >= 0 && data.unused >= 0 && data.generated >= 0 && data.served >= 0);
    }
    for (const link of corridors) assert.ok(Math.abs(link.flow) <= (link.enabled ? link.limit : 0));
    // Every partition bounds served load by its demand, external supply and boundary capacities.
    let cut = Infinity;
    for (let mask = 0; mask < (1 << sinRegions.length); mask++) {
      const inside = region => Boolean(mask & (1 << sinRegions.indexOf(region)));
      const internal = sinRegions.reduce((sum, region) => sum + (inside(region) ? input.demand[region] : input.available[region]), 0);
      const across = corridors.reduce((sum, link) => sum + (link.enabled && inside(link.from) !== inside(link.to) ? link.limit : 0), 0);
      cut = Math.min(cut, internal + across);
    }
    assert.equal(total.served, cut);
  }
});
