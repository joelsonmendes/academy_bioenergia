import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const {outputFiles} = await build({
  entryPoints: [fileURLToPath(new URL('../src/solar-shading.ts', import.meta.url))],
  platform: 'node', bundle: true, format: 'esm', write: false
});
const {evaluateShade, evaluateShadeDay, groundShadow, obstruction, polygonArea, shadeDefaults, solarPosition, validShadeDate} =
  await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));

test('solar time places the Sun east in the morning, north at June noon in Rio Branco and west in the afternoon', () => {
  const position = minute => solarPosition(shadeDefaults.latitude, shadeDefaults.date, minute);
  assert.ok(position(540).direction[0] > 0);
  assert.ok(position(900).direction[0] < 0);
  assert.ok(Math.abs(position(720).altitude - 56.6) < .2);
  assert.ok(position(720).direction[2] < 0);
  assert.ok(position(0).altitude < 0);
  assert.equal(validShadeDate('2024-02-29'), true);
  assert.equal(validShadeDate('2026-02-29'), false);
});

test('a square post casts a ground shadow two metres longer at 45 degrees of solar altitude', () => {
  const post = obstruction({...shadeDefaults, obstacle: 'pole', bearing: 0, height: 2});
  const polygon = groundShadow(post.vertices, [Math.SQRT1_2, Math.SQRT1_2, 0]);
  const xs = polygon.map(([x]) => x);
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 2.24) < 1e-9);
  assert.ok(Math.abs(polygonArea(polygon) - 2.24 * .24) < 1e-9);
});

test('a narrow projected shadow can cross multiple bypass blocks; a post on the opposite side has no effect', () => {
  const shade = evaluateShade(shadeDefaults, 540);
  assert.ok(shade.shadedFraction > 0 && shade.shadedFraction < .15);
  assert.ok(shade.modules.some(module => module.blockCount === 3));
  assert.ok(shade.lossFraction > 2 * shade.shadedFraction);
  const opposite = evaluateShade({...shadeDefaults, bearing: shadeDefaults.bearing + 180}, 540);
  assert.equal(opposite.shadedFraction, 0);
  assert.equal(opposite.powerW, opposite.clearW);
  const low = evaluateShade({...shadeDefaults, height: .5}, 540);
  assert.ok(low.shadedFraction < shade.shadedFraction);
});

test('diffuse-only conditions have zero direct shading loss, and nighttime generation is zero', () => {
  const cloudy = evaluateShade({...shadeDefaults, dni: 0}, 540);
  assert.ok(cloudy.clearW > 0);
  assert.equal(cloudy.powerW, cloudy.clearW);
  assert.equal(cloudy.lossFraction, 0);
  const night = evaluateShade(shadeDefaults, 0);
  assert.equal(night.powerW, 0);
  assert.equal(night.shadedFraction, 0);
});

test('daily DC energy never exceeds the unobstructed reference and converges when the obstacle is removed', () => {
  const day = evaluateShadeDay(shadeDefaults);
  const clear = evaluateShadeDay({...shadeDefaults, obstacle: 'none'});
  assert.equal(day.samples.length, 289);
  assert.ok(day.shadedKwh > 0 && day.shadedKwh < day.clearKwh);
  assert.ok(day.samples.every(sample => sample.powerW >= 0 && sample.powerW <= sample.clearW + 1e-9));
  assert.equal(day.clearKwh, clear.clearKwh);
  assert.equal(clear.shadedKwh, clear.clearKwh);
});
