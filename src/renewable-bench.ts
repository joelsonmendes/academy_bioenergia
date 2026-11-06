import {calculate} from './energy';

export type BenchMode = 'grid' | 'island' | 'pump';
export type BenchMix = 'solar' | 'wind' | 'hybrid';

export interface RenewableInput {
  mode: BenchMode;
  mix: BenchMix;
  series: number;
  parallel: number;
  irradiance: number;
  cellTemp: number;
  windSpeed: number;
  loadW: number;
  gridPresent: boolean;
  headM: number;
}

export const renewableDefaults: RenewableInput = {
  mode: 'grid', mix: 'solar', series: 2, parallel: 1,
  irradiance: 800, cellTemp: 25, windSpeed: 7, loadW: 100,
  gridPresent: true, headM: 5
};

export const benchLimits = {
  batteryV: 24, batteryWh: 240, minSoc: 20, maxSoc: 95,
  upperCapacityL: 20, waterTotalL: 24, lowerReserveL: 1,
  maxSamples: 120
} as const;

const moduleKW = .1;
const moduleVmp = 18;
const voltageCoeff = -.35;
const acVoltage = 220;
const gridEfficiency = .94;
const controllerEfficiency = .94;
const inverterEfficiency = .92;
const batteryEfficiency = .95;
const batteryLimitW = 150;
const pumpEfficiency = .30;
const pumpLimitW = 20;
const waterDensity = 1000;
const gravity = 9.81;

export function initialBenchState() {
  return {minute: 0, storedWh: .6 * benchLimits.batteryWh, upperL: 4};
}

export type RenewableState = ReturnType<typeof initialBenchState>;

export function evaluateRenewableBench(input: RenewableInput, state: RenewableState) {
  const pump = input.mode === 'pump';
  const grid = input.mode === 'grid';
  const solar = pump || input.mix !== 'wind';
  const wind = !pump && input.mix !== 'solar';

  // Values at the illustrative maximum-power point, independent of dispatch.
  const pv = calculate('solar', {
    pv: moduleKW * input.series * input.parallel, irradiance: solar ? input.irradiance : 0,
    temp: input.cellTemp, gamma: voltageCoeff, lossesPV: 0, etaInv: 100, ratedPV: 10, hours: 1
  });
  const solarW = (pv.details.dc ?? 0) * 1000;
  const solarV = solarW > 0 ? moduleVmp * input.series * (pv.details.temperature ?? 0) : 0;
  const solarA = solarV > 0 ? solarW / solarV : 0;
  const windW = wind ? 1000 * calculate('wind', {
    speed: input.windSpeed, diameter: 1.25, rhoAir: 1.225, cp: .3,
    etaDrive: 85, ratedWind: .15, hours: 1
  }).power : 0;
  const availableW = solarW + windW;

  let generationW = 0;
  let servedW = 0;
  let importW = 0;
  let exportW = 0;
  let batteryW = 0;
  let storedWh = state.storedWh;
  let flowLpm = 0;
  let pumpW = 0;
  let upperL = state.upperL;

  if (grid && input.gridPresent) {
    generationW = Math.min(250, availableW * gridEfficiency);
    servedW = input.loadW;
    importW = Math.max(0, servedW - generationW);
    exportW = Math.max(0, generationW - servedW);
  } else if (input.mode === 'island') {
    const minWh = benchLimits.batteryWh * benchLimits.minSoc / 100;
    const maxWh = benchLimits.batteryWh * benchLimits.maxSoc / 100;
    const busW = availableW * controllerEfficiency;
    const requiredW = input.loadW / inverterEfficiency;
    const chargeW = Math.min(batteryLimitW, Math.max(0, busW - requiredW),
      Math.max(0, maxWh - storedWh) * 60 / batteryEfficiency);
    const dischargeW = Math.min(batteryLimitW, Math.max(0, requiredW - busW),
      Math.max(0, storedWh - minWh) * 60 * batteryEfficiency);
    batteryW = chargeW - dischargeW;
    servedW = Math.min(input.loadW, (busW + dischargeW) * inverterEfficiency);
    generationW = servedW;
    storedWh += (chargeW * batteryEfficiency - dischargeW / batteryEfficiency) / 60;
    storedWh = Math.max(minWh, Math.min(maxWh, storedWh));
  } else if (pump) {
    // Mean flow over the next minute. Stop at full upper or protected lower level.
    const wattsPerLpm = waterDensity * gravity * input.headM / (60_000 * pumpEfficiency);
    const suppliedW = Math.min(solarW * controllerEfficiency, pumpLimitW);
    if (suppliedW >= 4) {
      flowLpm = Math.max(0, Math.min(suppliedW / wattsPerLpm,
        benchLimits.upperCapacityL - upperL, benchLimits.waterTotalL - upperL - benchLimits.lowerReserveL));
    }
    pumpW = flowLpm * wattsPerLpm;
    upperL += flowLpm;
  }

  const acV = pump || (grid && !input.gridPresent) ||
    (input.mode === 'island' && availableW === 0 && state.storedWh <= benchLimits.batteryWh * benchLimits.minSoc / 100)
    ? 0 : acVoltage;
  const unmetW = pump ? 0 : Math.max(0, input.loadW - servedW);
  const hydraulicW = pumpW * pumpEfficiency;

  return {
    solarW, solarV, solarA, windW, availableW, generationW, servedW, importW, exportW,
    batteryW, batteryA: batteryW / benchLimits.batteryV, soc: 100 * state.storedWh / benchLimits.batteryWh,
    acV, acA: acV ? servedW / acV : 0, unmetW,
    pumpW, hydraulicW, flowLpm, upperL: state.upperL, lowerL: benchLimits.waterTotalL - state.upperL,
    distanceCm: 30 - 25 * state.upperL / benchLimits.upperCapacityL,
    next: {minute: state.minute + 1, storedWh, upperL}
  };
}

type Reading = Omit<ReturnType<typeof evaluateRenewableBench>, 'next'>;
export type BenchSample = Reading & RenewableInput & {minute: number};
export type BenchRun = {state: RenewableState; samples: BenchSample[]};

export function advanceBench(input: RenewableInput, run: BenchRun): BenchRun {
  const {next, ...reading} = evaluateRenewableBench(input, run.state);
  const sample: BenchSample = {
    ...input, ...reading, minute: next.minute,
    mix: input.mode === 'pump' ? 'solar' : input.mix
  };
  return {state: next, samples: [...run.samples.slice(-(benchLimits.maxSamples - 1)), sample]};
}
