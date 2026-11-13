import {newPVProject, pvDefaults, pvLimits, sizePVEnergy, validPVLoads} from './pv-report-engine';
import type {PVInputs, PVLoad, PVProject, PVSystem} from './pv-report-engine';

export const pvCalculatorDefaults = {
  monthlyKwh: 450,
  hsp: pvDefaults.hsp,
  moduleW: pvDefaults.moduleW,
  pr: pvDefaults.pr,
  days: pvDefaults.days,
  coverage: pvDefaults.coverage,
  dcAc: pvDefaults.dcAc,
  autonomyDays: pvDefaults.autonomyDays,
  dod: pvDefaults.dod
};

export type PVCalculatorValues = typeof pvCalculatorDefaults;
export type PVCalculatorField = keyof PVCalculatorValues;

function inputFields(system: PVSystem) {
  const keys: PVCalculatorField[] = ['hsp', 'moduleW', 'pr'];
  if (system !== 'offgrid') keys.push('monthlyKwh', 'days', 'coverage', 'dcAc');
  if (system !== 'ongrid') keys.push('autonomyDays', 'dod');
  return keys;
}

type EfficiencyInputs = Pick<PVInputs, 'inverterEff' | 'batteryRoundEff' | 'batteryDisEff'>;

export function calculatePVPreview(system: PVSystem, values: PVCalculatorValues, loads: readonly PVLoad[], efficiencies: EfficiencyInputs = pvDefaults) {
  const inputs = {...pvDefaults};
  inputs.inverterEff = efficiencies.inverterEff;
  inputs.batteryRoundEff = efficiencies.batteryRoundEff;
  inputs.batteryDisEff = efficiencies.batteryDisEff;
  for (const field of inputFields(system)) {
    const [min, max] = pvLimits[field];
    const value = values[field];
    if (!Number.isFinite(value) || value < min || value > max || (field === 'days' && !Number.isInteger(value))) {
      return {error: 'inputs'} as const;
    }
    inputs[field] = value;
  }

  const inventory = system === 'ongrid' ? [] : loads;
  if (system !== 'ongrid' && !validPVLoads(inventory)) return {error: 'loads'} as const;
  const sizing = sizePVEnergy(system, inputs, inventory);
  if (system !== 'ongrid' && sizing.criticalDaily <= 0) return {error: 'demand'} as const;

  const installedKWp = sizing.neededModules * inputs.moduleW / 1000;
  return {
    error: null,
    system, inputs, loads: inventory,
    ...sizing, installedKWp,
    referenceInverterKW: system === 'offgrid' ? sizing.peakKW : Math.max(installedKWp / inputs.dcAc, system === 'hybrid' ? sizing.peakKW : 0),
    periodDays: system === 'offgrid' ? 1 : inputs.days,
    generation: installedKWp * sizing.dailyYield * (system === 'offgrid' ? 1 : inputs.days)
  } as const;
}

export type PVPreview = Extract<ReturnType<typeof calculatePVPreview>, {error: null}>;

export function createPVStudy(preview: PVPreview, labels: {title: string; moduleName: string; locationNote: string}, previous: PVProject | null): PVProject {
  const base = previous ?? newPVProject();
  const inputs = {...base.inputs};
  for (const field of inputFields(preview.system)) inputs[field] = preview.inputs[field];
  const moduleChanged = inputs.moduleW !== base.inputs.moduleW;
  return {
    ...base,
    system: preview.system,
    title: previous?.title ?? labels.title,
    moduleName: !previous || moduleChanged ? labels.moduleName : base.moduleName,
    site: previous?.site ?? {...base.site, city: '', locationNote: labels.locationNote},
    solarMode: 'manual',
    stringMode: !previous || moduleChanged || previous.system !== preview.system ? 'auto' : previous.stringMode,
    moduleConfirmed: base.moduleConfirmed && !moduleChanged,
    batteryConfirmed: base.batteryConfirmed && inputs.dod === base.inputs.dod,
    inputs,
    loads: preview.loads.length ? preview.loads.map(load => ({...load}))
      : previous?.loads ?? base.loads.map(load => ({...load, quantity: 0}))
  };
}
