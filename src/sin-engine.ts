export const sinRegions = ['north', 'northeast', 'central', 'south'] as const;
export type SinRegion = typeof sinRegions[number];
type RegionalPower = Record<SinRegion, number>;

export const sinCorridors = [
  {id: 'north-northeast', from: 'north', to: 'northeast', limit: 4000},
  {id: 'north-central', from: 'north', to: 'central', limit: 6000},
  {id: 'northeast-central', from: 'northeast', to: 'central', limit: 6500},
  {id: 'central-south', from: 'central', to: 'south', limit: 5000}
] as const;
export type SinCorridor = typeof sinCorridors[number]['id'];

export interface SinInput {
  available: RegionalPower;
  demand: RegionalPower;
  disabled: readonly SinCorridor[];
}

export const sinMaxPower = 70000;

const reference: SinInput = {
  available: {north: 11000, northeast: 16000, central: 45500, south: 9500},
  demand: {north: 8000, northeast: 12000, central: 50000, south: 12000},
  disabled: []
};

export const sinScenarios = {
  reference,
  peak: {...reference, demand: {...reference.demand, central: 55000, south: 13500}},
  wind: {...reference, available: {...reference.available, northeast: 12500}},
  bottleneck: {...reference, available: {...reference.available, northeast: 19500}, demand: {...reference.demand, south: 15500}},
  outage: {...reference, disabled: ['central-south']}
} satisfies Record<string, SinInput>;
export type SinScenario = keyof typeof sinScenarios;

export interface SinRegionResult {
  available: number;
  demand: number;
  generated: number;
  served: number;
  imported: number;
  exported: number;
  deficit: number;
  unused: number;
}

export interface SinCorridorResult {
  id: SinCorridor;
  from: SinRegion;
  to: SinRegion;
  limit: number;
  flow: number;
  enabled: boolean;
}

export function calculateSin(input: SinInput) {
  // Aggregate transport model. Serve each region locally before routing its surplus.
  const source = sinRegions.length;
  const sink = source + 1;
  const nodeCount = sink + 1;
  const residual = Array.from({length: nodeCount}, () => Array<number>(nodeCount).fill(0));
  const local = sinRegions.map(region => Math.min(input.available[region], input.demand[region]));
  sinRegions.forEach((region, index) => {
    residual[source][index] = input.available[region] - local[index];
    residual[index][sink] = input.demand[region] - local[index];
  });
  for (const {id, from, to, limit} of sinCorridors) {
    if (input.disabled.includes(id)) continue;
    const a = sinRegions.indexOf(from);
    const b = sinRegions.indexOf(to);
    residual[a][b] = limit;
    residual[b][a] = limit;
  }

  // Edmonds–Karp on the residual graph. Reverse capacity permits rerouting and signed flows.
  while (true) {
    const parent = Array<number>(nodeCount).fill(-1);
    parent[source] = source;
    const queue: number[] = [source];
    for (let head = 0; head < queue.length && parent[sink] === -1; head++) {
      const current = queue[head];
      for (let next = 0; next < nodeCount; next++) {
        if (parent[next] !== -1 || residual[current][next] <= 0) continue;
        parent[next] = current;
        queue.push(next);
      }
    }
    if (parent[sink] === -1) break;
    let amount = Infinity;
    for (let node = sink; node !== source; node = parent[node]) {
      amount = Math.min(amount, residual[parent[node]][node]);
    }
    for (let node = sink; node !== source; node = parent[node]) {
      residual[parent[node]][node] -= amount;
      residual[node][parent[node]] += amount;
    }
  }

  const corridors: SinCorridorResult[] = sinCorridors.map(corridor => {
    const enabled = !input.disabled.includes(corridor.id);
    const {from, to, limit} = corridor;
    const flow = enabled ? limit - residual[sinRegions.indexOf(from)][sinRegions.indexOf(to)] : 0;
    return {...corridor, enabled, flow};
  });
  const regions = {} as Record<SinRegion, SinRegionResult>;
  const total = {available: 0, generated: 0, demand: 0, served: 0, deficit: 0, unused: 0};
  sinRegions.forEach((region, index) => {
    const available = input.available[region];
    const demand = input.demand[region];
    const generated = available - residual[source][index];
    const served = demand - residual[index][sink];
    let imported = 0;
    let exported = 0;
    for (const link of corridors) {
      const outward = link.from === region ? link.flow : link.to === region ? -link.flow : 0;
      exported += Math.max(0, outward);
      imported += Math.max(0, -outward);
    }
    const deficit = demand - served;
    const unused = available - generated;
    regions[region] = {available, demand, generated, served, imported, exported, deficit, unused};
    total.available += available;
    total.generated += generated;
    total.demand += demand;
    total.served += served;
    total.deficit += deficit;
    total.unused += unused;
  });
  return {regions, corridors, total};
}

export type SinResult = ReturnType<typeof calculateSin>;
