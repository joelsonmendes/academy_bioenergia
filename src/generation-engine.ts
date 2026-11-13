export const microLimitKw = 75;
export const nondispatchableLimitKw = 3000;
export const dispatchableLimitKw = 5000;

export type Connection = 'consumer' | 'isolated' | 'plant';
export type GenerationSource =
  | 'solar' | 'wind' | 'hydro' | 'controlledHydro' | 'biomass' | 'biogas'
  | 'otherRenewable' | 'qualifiedChp' | 'other';

export interface GenerationInput {
  powerKw: number | null;
  connection: Connection;
  source: GenerationSource;
  dispatchControl: boolean;
}

export type GenerationBand = 'micro' | 'mini' | 'above' | 'isolated' | 'otherRegime' | 'ineligible';

export const dispatchableSources: ReadonlySet<GenerationSource> = new Set([
  'controlledHydro', 'biomass', 'biogas', 'qualifiedChp'
]);

function nonnegative(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function classifyGeneration({powerKw, connection, source, dispatchControl}: GenerationInput):
  {band: GenerationBand; miniLimitKw?: number} | null {
  if (!nonnegative(powerKw) || powerKw === 0) return null;
  if (connection === 'isolated') return {band: 'isolated'};
  if (connection === 'plant') return {band: 'otherRegime'};
  if (source === 'other') return {band: 'ineligible'};

  const miniLimitKw = dispatchControl && dispatchableSources.has(source) ? dispatchableLimitKw : nondispatchableLimitKw;
  if (powerKw <= microLimitKw) return {band: 'micro', miniLimitKw};
  return {band: powerKw <= miniLimitKw ? 'mini' : 'above', miniLimitKw};
}

export function compensateEnergy(generated: number | null, consumed: number | null, direct: number | null) {
  if (!nonnegative(generated) || !nonnegative(consumed) || !nonnegative(direct) || direct > Math.min(generated, consumed)) {
    return null;
  }
  const injected = generated - direct;
  const imported = consumed - direct;
  const compensated = Math.min(injected, imported);
  return {direct, injected, imported, compensated, credits: injected - compensated, remaining: imported - compensated};
}

export type CogenerationSource = 'otherFuel' | 'fossil' | 'recovered';

export interface CogenerationInput {
  source: CogenerationSource;
  installedMw: number | null;
  inputEnergy: number | null;
  electricity: number | null;
  recoverableHeat: number | null;
  heatDemand: number | null;
}

// REN ANEEL 1.031/2022, art. 15, § 1º. Each pair gives X and Fc in percent.
const energyCriteria: Record<CogenerationSource, ReadonlyArray<readonly [number, number]>> = {
  otherFuel: [[2.5, 32], [2.14, 37], [1.88, 42]],
  fossil: [[2.14, 41], [2.13, 44], [2, 50]],
  recovered: [[2.6, 25], [2.17, 30], [1.86, 35]]
};

export function calculateCogeneration(input: CogenerationInput) {
  const {source, installedMw, inputEnergy, electricity, recoverableHeat, heatDemand} = input;
  if (!nonnegative(installedMw) || installedMw === 0 ||
      !nonnegative(inputEnergy) || inputEnergy === 0 ||
      !nonnegative(electricity) || !nonnegative(recoverableHeat) || !nonnegative(heatDemand)) {
    return {valid: false, error: 'input'} as const;
  }
  // The energy quantities refer to one hour, so kWh / 1 h and kW are numerically equal.
  if (electricity / 1000 > installedMw) return {valid: false, error: 'nameplate'} as const;
  const available = electricity + recoverableHeat;
  if (available - inputEnergy > inputEnergy * 1e-12) return {valid: false, error: 'balance'} as const;

  const heat = Math.min(recoverableHeat, heatDemand);
  const electricShare = electricity / inputEnergy;
  const heatShare = heat / inputEnergy;
  const efficiency = Math.min(100, (electricShare + heatShare) * 100);
  const [x, fc] = energyCriteria[source][installedMw <= 5 ? 0 : installedMw <= 20 ? 1 : 2];
  const score = (heatShare / x + electricShare) * 100;
  return {
    valid: true as const, inputEnergy, electricity, heat,
    discardedHeat: recoverableHeat - heat, losses: Math.max(0, inputEnergy - electricity - heat),
    efficiency, electricPercent: electricShare * 100, heatPercent: heatShare * 100,
    x, fc, score, meetsEnergyCriteria: electricity > 0 && heatShare >= 0.15 && score + 1e-10 >= fc
  };
}

export function annualEnergy(installedMw: number | null, capacityFactor: number) {
  if (!nonnegative(installedMw) || installedMw === 0 ||
      !nonnegative(capacityFactor) || capacityFactor > 100) return null;
  const averageMw = installedMw * (capacityFactor / 100);
  const energyMwh = averageMw * 8760;
  return Number.isFinite(energyMwh) ? {averageMw, energyMwh} : null;
}
