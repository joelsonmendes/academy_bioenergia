import {schoolLoads, validLoad, type LoadRow} from './amazon-engine';

export const integratorSteps = ['loads', 'sizing', 'compare', 'delivery'] as const;
export type IntegratorStep = typeof integratorSteps[number];
export type ProjectChoice = 'solar' | 'diesel' | 'revise';
export interface ProjectLoad extends LoadRow { essential: boolean }

export const designDefaults = {hsp: 4, moduleW: 550, pr: 78, autonomyDays: 1, dod: 80};
export const simulationDefaults = {
  hsp: 1.25, modules: 6, batteryKWh: 11.2, inverterKW: 1.5,
  socStart: 50, generatorKW: 3, fuelLiters: 3
};
export const designLimits = {
  hsp: [.5, 8], moduleW: [10, 1000], pr: [45, 100], autonomyDays: [.1, 5], dod: [50, 90]
} as const;
export const simulationLimits = {
  hsp: [0, 8], modules: [0, 1000], batteryKWh: [1, 200], inverterKW: [.5, 50],
  socStart: [10, 100], generatorKW: [.2, 50], fuelLiters: [0, 500]
} as const;

export interface IntegratorRecord {
  step: IntegratorStep;
  loads: ProjectLoad[];
  design: typeof designDefaults;
  simulation: typeof simulationDefaults;
  compared: boolean;
  reviewed: boolean;
  choice: ProjectChoice | '';
  author: string;
  rationale: string;
  maintenance: string;
  fieldData: string;
}

export function newIntegratorRecord(): IntegratorRecord {
  return {
    step: 'loads',
    loads: schoolLoads.map(row => ({...row, essential: ['light', 'cold', 'router'].includes(row.id)})),
    design: {...designDefaults},
    simulation: {...simulationDefaults},
    compared: false, reviewed: false, choice: '', author: '', rationale: '', maintenance: '', fieldData: ''
  };
}

function inRanges<K extends string>(values: Record<K, number>, limits: Record<K, readonly [number, number]>) {
  return !!values && (Object.keys(limits) as K[]).every(key => {
    const [min, max] = limits[key];
    return Number.isFinite(values[key]) && values[key] >= min && values[key] <= max;
  });
}

export function validIntegratorRecord(value: unknown): value is IntegratorRecord {
  const v = value as IntegratorRecord;
  return !!v && integratorSteps.includes(v.step) && Array.isArray(v.loads) && v.loads.length > 0 && v.loads.length <= 30 &&
    v.loads.every(row => validLoad(row) && typeof row.essential === 'boolean') &&
    new Set(v.loads.map(row => row.id)).size === v.loads.length &&
    inRanges(v.design, designLimits) && inRanges(v.simulation, simulationLimits) && Number.isInteger(v.simulation.modules) &&
    v.simulation.socStart >= 100 - v.design.dod &&
    typeof v.compared === 'boolean' && typeof v.reviewed === 'boolean' && ['', 'solar', 'diesel', 'revise'].includes(v.choice) &&
    typeof v.author === 'string' && v.author.length <= 80 &&
    [v.rationale, v.maintenance, v.fieldData].every(note => typeof note === 'string' && note.length <= 2400);
}
