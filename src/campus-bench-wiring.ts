import type {Terminal, Wire} from './amazon-engine';

export const benchDevices = ['source', 'controller', 'battery', 'inverter', 'protection', 'load'] as const;
export type BenchDevice = typeof benchDevices[number];
export type BenchPoint = [number, number, number];

export const deviceTerminals = {
  source: ['source+', 'source-'],
  controller: ['mpptPV+', 'mpptPV-', 'mpptBAT+', 'mpptBAT-'],
  battery: ['bat+', 'bat-'],
  inverter: ['invDC+', 'invDC-', 'invL', 'invN'],
  protection: [],
  load: ['loadL', 'loadN']
} as const satisfies Record<BenchDevice, readonly Terminal[]>;

export const benchTerminalPositions: Record<Terminal, BenchPoint> = {
  'source+': [.51, .49, 1.65], 'source-': [1.04, .49, 1.65],
  'mpptPV+': [-3.11, 2.27, .64], 'mpptPV-': [-2.77, 2.27, .64],
  'mpptBAT+': [-3.11, 1.96, .64], 'mpptBAT-': [-2.77, 1.96, .64],
  'bat+': [-2.94, 1.46, .82], 'bat-': [-2.41, 1.46, .82],
  'invDC+': [-2.09, 2.25, .68], 'invDC-': [-1.69, 2.25, .68],
  invL: [-2.09, 1.94, .68], invN: [-1.69, 1.94, .68],
  loadL: [-2.10, 2.88, .60], loadN: [-1.67, 2.88, .60]
};

export const wireColors = {
  positive: '#ff795c',
  negative: '#54aaff',
  line: '#f5bc55',
  neutral: '#b79bf9',
  mixed: '#f779c0'
} as const;

export function terminalMark(terminal: Terminal) {
  const suffix = terminal.at(-1);
  return suffix === '-' ? '−' : suffix;
}

export function wireKind([a, b]: Wire) {
  const mark = terminalMark(a);
  if (mark !== terminalMark(b)) return 'mixed';
  if (mark === '+') return 'positive';
  if (mark === '−') return 'negative';
  return mark === 'L' ? 'line' : 'neutral';
}

export function addBenchWire(wires: Wire[], wire: Wire): {
  status: 'cancelled' | 'duplicate' | 'full' | 'added';
  wires: Wire[];
} {
  const [a, b] = wire;
  if (a === b) return {status: 'cancelled', wires};
  if (wires.some(([left, right]) => (left === a && right === b) || (left === b && right === a))) {
    return {status: 'duplicate', wires};
  }
  if (wires.length >= 24) return {status: 'full', wires};
  return {status: 'added', wires: [...wires, wire]};
}

export function benchCablePath(wire: Wire): BenchPoint[] {
  const start = benchTerminalPositions[wire[0]];
  const end = benchTerminalPositions[wire[1]];
  const routeFrom = (prefix: string, towards: string, route: (a: BenchPoint, b: BenchPoint) => BenchPoint[]) => {
    const [a, b] = wire;
    if (a.startsWith(prefix) && b.startsWith(towards)) return route(start, end);
    if (b.startsWith(prefix) && a.startsWith(towards)) return route(end, start).reverse();
  };
  const pv = routeFrom('source', 'mpptPV', (a, b) => {
    const lane = (a[0] - .51) * .45;
    return [a, [a[0], .25, 1.86 + lane], [-.12, .12, 1.86 + lane],
      [-3.44 - lane, .15, 1.17 + lane], [-3.48 - lane, 1.68, .83 + lane],
      [-3.38 - lane, b[1] + .16, .88 + lane], [b[0], b[1] + .13, .91], b];
  });
  const battery = routeFrom('mpptBAT', 'bat', (a, b) =>
    [a, [a[0], a[1] - .16, .90], [b[0], b[1] + .15, .99], b]);
  const inverter = routeFrom('bat', 'invDC', (a, b) =>
    [a, [a[0], a[1] + .10, 1.07], [b[0], b[1] - .21, 1.05], b]);
  const load = routeFrom('inv', 'load', (a, b) => {
    const lane = (a[0] + 2.09) * .46;
    return [a, [a[0], 1.77, .89], [-1.18 + lane, 1.84, .84],
      [-1.08 + lane, 2.65, .86], [b[0], 2.71 - lane, .84], b];
  });
  const front = Math.max(start[2], end[2]) + .25;
  return pv ?? battery ?? inverter ?? load ??
    [start, [start[0], start[1] - .15, front], [end[0], end[1] - .15, front], end];
}
