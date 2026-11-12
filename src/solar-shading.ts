export type Point2 = readonly [number, number];
export type Point3 = readonly [number, number, number];
export type Obstacle = 'none' | 'pole' | 'wall' | 'building';

export interface ShadeScenario {
  date: string;
  latitude: number;
  tilt: number;
  azimuth: number;
  obstacle: Obstacle;
  height: number;
  distance: number;
  bearing: number;
  dni: number;
  dhi: number;
  cellTemperature: number;
}

export const shadeDefaults: ShadeScenario = {
  date: '2026-06-21', latitude: -9.97, tilt: 15, azimuth: 0,
  obstacle: 'pole', height: 5.5, distance: 3.6, bearing: 62,
  dni: 850, dhi: 110, cellTemperature: 45
};
export const shadeStartMinute = 540;
export const shadeLimits = {
  latitude: [-60, 60], tilt: [0, 60], azimuth: [0, 359],
  height: [.5, 7], distance: [3.6, 6.2], bearing: [0, 359],
  dni: [0, 1100], dhi: [0, 400], cellTemperature: [0, 80]
} as const;

export const moduleIds = ['M1', 'M2', 'M3', 'M4'] as const;
export type ModuleId = typeof moduleIds[number];
export const shadeModule = {width: 1.134, length: 1.762, power: 450, blocks: 3, temperatureCoefficient: -.0035};
export const shadeGround = {halfWidth: 8, halfDepth: 8};
export const obstacleSizes = {pole: [.24, .24], wall: [3.2, .25], building: [2.6, 1.9]} as const;

const radians = Math.PI / 180;
const gap = .06;
const halfTableLength = shadeModule.length + gap / 2;
const epsilon = 1e-8;
const moduleArea = shadeModule.width * shadeModule.length;

export const modulePositions = moduleIds.map((id, index) => ({
  id,
  u: ((index % 2) - .5) * (shadeModule.width + gap),
  v: (Math.floor(index / 2) - .5) * (shadeModule.length + gap)
}));

export function normalizeBearing(value: number) {
  return (value % 360 + 360) % 360;
}

export function validShadeDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= '2000-01-01' && date <= '2099-12-31' &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

export function solarPosition(latitude: number, date: string, minute: number) {
  const year = Number(date.slice(0, 4));
  const start = Date.UTC(year, 0, 1);
  const dayOfYear = (Date.parse(date) - start) / 86400000;
  const yearDays = (Date.UTC(year + 1, 0, 1) - start) / 86400000;
  // NOAA declination approximation, evaluated at solar noon for the chosen date.
  const g = 2 * Math.PI * dayOfYear / yearDays;
  const declination = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) -
    .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g);
  const phi = latitude * radians;
  const hourAngle = (minute / 4 - 180) * radians;
  const east = -Math.cos(declination) * Math.sin(hourAngle);
  const north = Math.cos(phi) * Math.sin(declination) - Math.sin(phi) * Math.cos(declination) * Math.cos(hourAngle);
  const up = Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle);
  const direction: Point3 = [east, up, -north];
  return {
    direction,
    altitude: Math.asin(Math.max(-1, Math.min(1, up))) / radians,
    azimuth: Math.hypot(east, north) > epsilon ? normalizeBearing(Math.atan2(east, north) / radians) : null
  };
}

export function panelFrame(tilt: number, azimuth: number) {
  const b = tilt * radians;
  const a = azimuth * radians;
  // x east, y up, z south. u follows the short side; v follows the slope downhill.
  return {
    origin: [0, .66 + halfTableLength * Math.sin(b), 0] as Point3,
    u: [Math.cos(a), 0, Math.sin(a)] as Point3,
    v: [Math.cos(b) * Math.sin(a), -Math.sin(b), -Math.cos(b) * Math.cos(a)] as Point3,
    normal: [Math.sin(b) * Math.sin(a), Math.cos(b), -Math.sin(b) * Math.cos(a)] as Point3
  };
}

export function panelPoint(frame: ReturnType<typeof panelFrame>, u: number, v: number): Point3 {
  return [
    frame.origin[0] + u * frame.u[0] + v * frame.v[0],
    frame.origin[1] + u * frame.u[1] + v * frame.v[1],
    frame.origin[2] + u * frame.u[2] + v * frame.v[2]
  ];
}

function dot(a: Point3, b: Point3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function obstruction(scenario: ShadeScenario) {
  if (scenario.obstacle === 'none') return null;
  const [width, depth] = obstacleSizes[scenario.obstacle];
  const angle = scenario.bearing * radians;
  const east = scenario.distance * Math.sin(angle);
  const south = -scenario.distance * Math.cos(angle);
  const footprint: Point2[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [
    east + u * width / 2 * Math.cos(angle) - v * depth / 2 * Math.sin(angle),
    south + u * width / 2 * Math.sin(angle) + v * depth / 2 * Math.cos(angle)
  ]);
  const vertices: Point3[] = [0, scenario.height].flatMap(y => footprint.map(([x, z]) => [x, y, z] as Point3));
  return {width, depth, angle, east, south, height: scenario.height, vertices};
}

function hull(points: Point2[]): Point2[] {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return [];
  const cross = (a: Point2, b: Point2, c: Point2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  function half(sequence: Point2[]) {
    const result: Point2[] = [];
    for (const point of sequence) {
      while (result.length >= 2 && cross(result[result.length - 2], result[result.length - 1], point) <= epsilon) result.pop();
      result.push(point);
    }
    result.pop();
    return result;
  }
  return [...half(sorted), ...half(sorted.reverse())];
}

function clipEdge(polygon: Point2[], axis: 0 | 1, bound: number, sign: number) {
  const clipped: Point2[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];
    const d1 = sign * (start[axis] - bound);
    const d2 = sign * (end[axis] - bound);
    if (d1 >= 0) clipped.push(start);
    if ((d1 >= 0) === (d2 >= 0)) continue;
    const f = d1 / (d1 - d2);
    clipped.push([start[0] + f * (end[0] - start[0]), start[1] + f * (end[1] - start[1])]);
  }
  return clipped;
}

function clipRectangle(polygon: Point2[], left: number, right: number, bottom: number, top: number) {
  let clipped = clipEdge(polygon, 0, left, 1);
  clipped = clipEdge(clipped, 0, right, -1);
  clipped = clipEdge(clipped, 1, bottom, 1);
  return clipEdge(clipped, 1, top, -1);
}

export function polygonArea(polygon: Point2[]) {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

const prismEdges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]] as const;

function projectPrism(vertices: Point3[], frame: ReturnType<typeof panelFrame>, sun: Point3, incidence: number) {
  const relative = vertices.map(([x, y, z]): Point3 => [x, y - frame.origin[1], z]);
  const heights = relative.map(point => dot(point, frame.normal));
  const front = relative.filter((_, i) => heights[i] >= 0);
  // Clip the solid to the half-space above the active face before casting a shadow.
  for (const [i, j] of prismEdges) {
    const h1 = heights[i];
    const h2 = heights[j];
    if ((h1 >= 0) === (h2 >= 0)) continue;
    const f = h1 / (h1 - h2);
    const a = relative[i];
    const b = relative[j];
    front.push([a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])]);
  }
  return hull(front.map(point => {
    const ray = Math.max(0, dot(point, frame.normal)) / incidence;
    const projected: Point3 = [point[0] - ray * sun[0], point[1] - ray * sun[1], point[2] - ray * sun[2]];
    return [dot(projected, frame.u), dot(projected, frame.v)];
  }));
}

export function groundShadow(vertices: Point3[], sun: Point3) {
  if (sun[1] <= epsilon) return [];
  const polygon = hull(vertices.map(([x, y, z]) => [x - y * sun[0] / sun[1], z - y * sun[2] / sun[1]]));
  return clipRectangle(polygon, -shadeGround.halfWidth, shadeGround.halfWidth, -shadeGround.halfDepth, shadeGround.halfDepth);
}

export function evaluateShade(scenario: ShadeScenario, minute: number) {
  const sun = solarPosition(scenario.latitude, scenario.date, minute);
  const daylight = sun.direction[1] > epsilon;
  const frame = panelFrame(scenario.tilt, scenario.azimuth);
  const object = obstruction(scenario);
  const incidence = daylight ? Math.max(0, dot(frame.normal, sun.direction)) : 0;
  const shadow = object && incidence > epsilon ? projectPrism(object.vertices, frame, sun.direction, incidence) : [];
  const beam = scenario.dni * incidence;
  const cosTilt = frame.normal[1];
  const diffuse = daylight ? scenario.dhi * (1 + cosTilt) / 2 : 0;
  const reflected = daylight ? .2 * (scenario.dhi + scenario.dni * sun.direction[1]) * (1 - cosTilt) / 2 : 0;
  const other = diffuse + reflected;
  const poa = beam + other;
  const powerPerIrradiance = shadeModule.power / 1000 * (1 + shadeModule.temperatureCoefficient * (scenario.cellTemperature - 25));
  const clearW = powerPerIrradiance * poa * moduleIds.length;

  const modules = modulePositions.map(({id, u, v}) => {
    const left = u - shadeModule.width / 2;
    const right = u + shadeModule.width / 2;
    const bottom = v - shadeModule.length / 2;
    const top = v + shadeModule.length / 2;
    const polygon = clipRectangle(shadow, left, right, bottom, top);
    const shadedFraction = Math.min(1, polygonArea(polygon) / moduleArea);
    const blockWidth = shadeModule.width / shadeModule.blocks;
    const blocks = Array.from({length: shadeModule.blocks}, (_, index) => {
      const x = left + index * blockWidth;
      return polygonArea(clipEdge(clipEdge(polygon, 0, x, 1), 0, x + blockWidth, -1)) > epsilon;
    });
    const blockCount = blocks.filter(Boolean).length;
    // Martínez-Moreno et al., Eq. (6) and (8). Diffuse sky and ground terms are unchanged.
    const beamFactor = (1 - shadedFraction) * (1 - blockCount / (shadeModule.blocks + 1));
    return {id, u, v, polygon, shadedFraction, blocks, blockCount,
      powerW: powerPerIrradiance * (beam * beamFactor + other)};
  });

  const powerW = modules.reduce((sum, module) => sum + module.powerW, 0);
  return {
    sun, daylight, frame, object, incidence, beam, diffuse, reflected, poa, modules, clearW, powerW,
    shadedFraction: modules.reduce((sum, module) => sum + module.shadedFraction, 0) / moduleIds.length,
    lossFraction: clearW > 0 ? Math.max(0, (clearW - powerW) / clearW) : 0
  };
}

export function evaluateShadeDay(scenario: ShadeScenario) {
  const step = 5;
  const samples = Array.from({length: 1440 / step + 1}, (_, i) => {
    const minute = step * i;
    const {daylight, sun, clearW, powerW, shadedFraction, lossFraction} = evaluateShade(scenario, minute);
    return {minute, daylight, altitude: sun.altitude, clearW, powerW, shadedFraction, lossFraction};
  });
  let clearKwh = 0;
  let shadedKwh = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    clearKwh += (a.clearW + b.clearW) / 2 * step / 60000;
    shadedKwh += (a.powerW + b.powerW) / 2 * step / 60000;
  }
  const daylightSamples = samples.filter(sample => sample.daylight);
  return {samples, clearKwh, shadedKwh,
    firstMinute: daylightSamples[0]?.minute ?? 0, lastMinute: daylightSamples.at(-1)?.minute ?? 1440};
}
