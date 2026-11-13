import {dispatchHybrid, hybridDefaults, hybridRanges, hourlyLoads, type HybridInput} from './amazon-engine';
import {calculatePVPreview, pvCalculatorDefaults, type PVPreview} from './pv-calculator-engine';
import {pvDefaults} from './pv-report-engine';
import {simulationLimits, type IntegratorRecord, type ProjectLoad} from './integrator-schema';

export const projectEfficiencies = {
  inverterEff: pvDefaults.inverterEff,
  batteryRoundEff: hybridDefaults.etaCharge * hybridDefaults.etaDischarge * 100,
  batteryDisEff: hybridDefaults.etaDischarge * 100
};
export const deficitTolerance = 1e-6;

export function equivalentHours(row: ProjectLoad) {
  const hours = row.end >= row.start ? row.end - row.start : 24 - row.start + row.end;
  return hours * row.duty;
}

export function loadEnergy(row: ProjectLoad) {
  return row.watts * row.quantity * equivalentHours(row) / 1000;
}

export function estimateSchool({loads, design}: Pick<IntegratorRecord, 'loads' | 'design'>) {
  const hourly = hourlyLoads(loads);
  const rows = loads.map(row => ({...row, kWh: loadEnergy(row)}));
  const daily = rows.reduce((sum, row) => sum + row.kWh, 0);
  const essential = rows.reduce((sum, row) => sum + (row.essential ? row.kWh : 0), 0);
  const peak = Math.max(...hourly);
  const preview = calculatePVPreview('offgrid', {...pvCalculatorDefaults, ...design}, loads.map(row => ({
    id: row.id, name: row.label, quantity: row.quantity, watts: row.watts,
    hours: equivalentHours(row), startFactor: 1, critical: row.essential
  })), projectEfficiencies);
  return {
    rows, daily, essential, peak, peakHour: hourly.indexOf(peak),
    inventoryReady: essential > 0 && rows.every(row => row.kWh > 0 && row.label.trim()),
    preview: preview.error === null ? preview : null
  };
}

export function suggestedEquipment(preview: PVPreview) {
  const roundUpTenth = (value: number) => Math.ceil(value * 10) / 10;
  const inverterKW = Math.max(simulationLimits.inverterKW[0], roundUpTenth(preview.referenceInverterKW));
  const batteryKWh = Math.max(simulationLimits.batteryKWh[0], roundUpTenth(preview.batteryNeededKwh));
  if (preview.installedKWp > hybridRanges.pvKWp[1] || preview.neededModules > simulationLimits.modules[1] ||
      inverterKW > simulationLimits.inverterKW[1] || batteryKWh > simulationLimits.batteryKWh[1]) return null;
  return {modules: preview.neededModules, batteryKWh, inverterKW};
}

export function compareSchool({design, simulation, loads}: Pick<IntegratorRecord, 'design' | 'simulation' | 'loads'>) {
  const pvKWp = simulation.modules * design.moduleW / 1000;
  if (pvKWp > hybridRanges.pvKWp[1]) return null;
  const socMin = 100 - design.dod;
  const input: HybridInput = {
    ...hybridDefaults,
    pvKWp, sunHours: simulation.hsp, performance: design.pr * projectEfficiencies.inverterEff / 10000,
    batteryKWh: simulation.batteryKWh, inverterKW: simulation.inverterKW,
    socStart: simulation.socStart, socMin, socMax: 100, reserveSOC: Math.max(socMin, hybridDefaults.reserveSOC),
    generatorKW: simulation.generatorKW, fuelLiters: simulation.fuelLiters
  };
  return {
    input,
    solar: dispatchHybrid({...input, generatorKW: 0, fuelLiters: 0}, loads),
    diesel: dispatchHybrid(input, loads)
  };
}

export type SchoolEstimate = ReturnType<typeof estimateSchool>;
export type SchoolComparison = NonNullable<ReturnType<typeof compareSchool>>;

export function submissionReadiness(record: IntegratorRecord, estimate: SchoolEstimate, comparison: SchoolComparison | null) {
  return {
    inventory: estimate.inventoryReady,
    sizing: !!estimate.preview,
    comparison: !!comparison && record.compared && estimate.daily > 0,
    analysis: !!record.choice && !!record.rationale.trim() && !!record.maintenance.trim() && !!record.fieldData.trim(),
    reviewed: record.reviewed
  };
}
