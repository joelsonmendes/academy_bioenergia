import type {Localized} from './types';
export {parsePowerClimate, bestAnnualTilt, tiltedIrradiation, annualMean} from './pv-solar';
import {annualMean, tiltedIrradiation, validSolarClimate, type SolarClimate} from './pv-solar';

export type PVSystem = 'ongrid' | 'offgrid' | 'hybrid';
export const pvDefaults = {
  latitude: -9.97, longitude: -67.81, tilt: 10, azimuth: 0, hsp: 4.5,
  monthlyKwh: 500, days: 30, coverage: 100, pr: 80, dcAc: 1.2,
  minTemp: 10, maxCellTemp: 70,
  moduleW: 550, voc: 49.9, vmp: 41.96, isc: 13.99, imp: 13.11,
  betaVoc: -.28, betaVmp: -.34, alphaIsc: .05, moduleFuse: 25, moduleReverse: 25, moduleMaxV: 1500, moduleArea: 2.6,
  inverterKW: 5, inverterDCW: 6500, inverterMaxV: 550, mpptMin: 120, mpptMax: 500,
  mppts: 2, stringsPerMppt: 1, mpptA: 18, mpptIsc: 22.5, startV: 140,
  inverterEff: 94, inverterSurgeKW: 10, epsKW: 5, batteryMinV: 40, batteryMaxV: 60, chargeA: 100,
  acV: 220, phases: 1, pf: 1, inverterAcA: 25,
  batteryV: 51.2, unitV: 51.2, batteryAh: 100, dod: 80, batteryDisEff: 95, batteryRoundEff: 92,
  batteryMaxA: 100, batterySeriesMax: 1, autonomyDays: 1,
  dcLength: 20, dcSection: 4, cableTemp: 90, dcDrop: 1.5, dcR20: 5.09, dcIz: 35, dcCorrection: 1, dcGroup: 1,
  iscFactor: 1.25, fuseFactor: 1.56, backfeedA: 0,
  acLength: 15, acSection: 6, acIz: 36, acCorrection: 1, acDrop: 2,
  batteryIz: 200, manualNs: 4, manualStrings: 2
};
export type PVInputs = typeof pvDefaults;
export type PVInputKey = keyof PVInputs;
export interface PVLoad {id: string;name: string;quantity: number;watts: number;hours: number;startFactor: number;critical: boolean}
export interface DatasheetRef {id: string;name: string;size: number;addedAt: string}
export interface PVProject {
  version: 1;id: string;system: PVSystem;title: string;designer: string;registration: string;
  client: {name: string;contact: string;consumerUnit: string};
  site: {region: string;uf: string;city: string;cep: string;address: string;locationNote: string};
  moduleName: string;inverterName: string;batteryName: string;
  inputs: PVInputs;loads: PVLoad[];solar: SolarClimate | null;
  solarMode: 'manual' | 'annual' | 'worst';stringMode: 'auto' | 'manual';
  hasBatteryPort: boolean;hasEPS: boolean;locationConfirmed: boolean;
  moduleConfirmed: boolean;inverterConfirmed: boolean;batteryConfirmed: boolean;
  cableMethod: 'prysun40' | 'manual';attachments: {module?: DatasheetRef;inverter?: DatasheetRef};
  notes: string;
}
const initialLoads: PVLoad[] = [
  {id: 'lighting', name: 'Iluminação', quantity: 10, watts: 10, hours: 5, startFactor: 1, critical: true},
  {id: 'fridge', name: 'Refrigerador', quantity: 1, watts: 150, hours: 10, startFactor: 3, critical: true},
  {id: 'fans', name: 'Ventiladores', quantity: 2, watts: 60, hours: 8, startFactor: 1, critical: true},
  {id: 'outlets', name: 'Tomadas', quantity: 1, watts: 300, hours: 3, startFactor: 1, critical: false}
];
export function pvId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
export function newPVProject(): PVProject {
  return {
    version: 1, id: pvId(), system: 'ongrid', title: 'Estudo fotovoltaico',
    designer: '', registration: '', client: {name: '', contact: '', consumerUnit: ''},
    site: {region: 'Norte', uf: 'AC', city: 'Rio Branco', cep: '', address: '', locationNote: 'Coordenadas de referência didática de Rio Branco. Confirme o local.'},
    moduleName: 'Módulo didático 550 W', inverterName: 'Inversor didático multimodo 5 kW', batteryName: 'Bateria didática 51,2 V / 100 Ah',
    inputs: {...pvDefaults}, loads: initialLoads.map(load => ({...load})), solar: null,
    solarMode: 'manual', stringMode: 'auto', hasBatteryPort: true, hasEPS: true, locationConfirmed: false,
    moduleConfirmed: false, inverterConfirmed: false, batteryConfirmed: false,
    cableMethod: 'prysun40', attachments: {}, notes: ''
  };
}

// Ranges also bound search complexity and prohibit NaN/Infinity in restored projects.
export const pvLimits: Record<PVInputKey, [number, number]> = {
  latitude: [-35, 6], longitude: [-75, -32], tilt: [0, 90], azimuth: [0, 360], hsp: [.1, 12],
  monthlyKwh: [.1, 100000], days: [1, 31], coverage: [1, 100], pr: [10, 100], dcAc: [.5, 2],
  minTemp: [-40, 50], maxCellTemp: [25, 100], moduleW: [10, 1000], voc: [5, 150], vmp: [3, 140],
  isc: [.1, 60], imp: [.1, 60], betaVoc: [-1, 0], betaVmp: [-1, 0], alphaIsc: [0, .3],
  moduleFuse: [1, 100], moduleReverse: [0, 200], moduleMaxV: [50, 2000], moduleArea: [.1, 6],
  inverterKW: [.1, 500], inverterDCW: [100, 1000000], inverterMaxV: [20, 2000],
  mpptMin: [5, 1500], mpptMax: [10, 2000], mppts: [1, 30], stringsPerMppt: [1, 30],
  mpptA: [.1, 1000], mpptIsc: [.1, 1500], startV: [5, 1500], inverterEff: [30, 100], inverterSurgeKW: [.1, 1000],
  epsKW: [0, 500], batteryMinV: [5, 1500], batteryMaxV: [5, 1500], chargeA: [1, 1000],
  acV: [100, 1000], phases: [1, 3], pf: [.5, 1], inverterAcA: [0, 3000],
  batteryV: [12, 1500], unitV: [2, 1500], batteryAh: [1, 5000], dod: [10, 100],
  batteryDisEff: [30, 100], batteryRoundEff: [30, 100], batteryMaxA: [1, 2000],
  batterySeriesMax: [1, 100], autonomyDays: [.05, 30],
  dcLength: [0, 1000], dcSection: [1.5, 240], cableTemp: [20, 120], dcDrop: [.1, 10],
  dcR20: [.001, 100], dcIz: [0, 1000], dcCorrection: [.1, 1.5], dcGroup: [.1, 1], iscFactor: [1, 2], fuseFactor: [1.51, 2.39], backfeedA: [0, 1000],
  acLength: [0, 1000], acSection: [1.5, 240], acIz: [0, 3000], acCorrection: [.1, 1.5], acDrop: [.1, 10],
  batteryIz: [0, 3000], manualNs: [1, 200], manualStrings: [1, 900]
};
const integerKeys: PVInputKey[] = ['mppts', 'stringsPerMppt', 'batterySeriesMax', 'manualNs', 'manualStrings', 'phases'];
export function validPVInputs(input: unknown): input is PVInputs {
  if (!input || typeof input !== 'object') return false;
  const v = input as PVInputs;
  return (Object.keys(pvLimits) as PVInputKey[]).every(key =>
    Number.isFinite(v[key]) && v[key] >= pvLimits[key][0] && v[key] <= pvLimits[key][1]) &&
    integerKeys.every(key => Number.isInteger(v[key])) && [1, 3].includes(v.phases);
}
const shortText = (v: unknown, max = 200) => typeof v === 'string' && v.length <= max;
export function validPVProject(value: unknown): value is PVProject {
  const p = value as PVProject;
  return !!p && p.version === 1 && typeof p.id === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(p.id) &&
    ['ongrid', 'offgrid', 'hybrid'].includes(p.system) && validPVInputs(p.inputs) &&
    [p.title, p.designer, p.registration, p.moduleName, p.inverterName, p.batteryName].every(v => shortText(v)) &&
    !!p.client && Object.values(p.client).length === 3 && Object.values(p.client).every(v => shortText(v)) &&
    !!p.site && ['region', 'uf', 'city', 'cep', 'address', 'locationNote'].every(key => shortText(p.site[key as keyof typeof p.site], 400)) &&
    Array.isArray(p.loads) && p.loads.length >= 1 && p.loads.length <= 30 && p.loads.every(load =>
      !!load && shortText(load.id, 80) && shortText(load.name, 120) &&
      Number.isInteger(load.quantity) && load.quantity >= 0 && load.quantity <= 1000 &&
      Number.isFinite(load.watts) && load.watts >= 0 && load.watts <= 1000000 &&
      Number.isFinite(load.hours) && load.hours >= 0 && load.hours <= 24 &&
      Number.isFinite(load.startFactor) && load.startFactor >= 1 && load.startFactor <= 10 && typeof load.critical === 'boolean') &&
    new Set(p.loads.map(load => load.id)).size === p.loads.length &&
    (p.solar === null || validSolarClimate(p.solar)) && ['manual', 'annual', 'worst'].includes(p.solarMode) &&
    ['auto', 'manual'].includes(p.stringMode) && ['manual', 'prysun40'].includes(p.cableMethod) &&
    ['hasBatteryPort', 'hasEPS', 'locationConfirmed', 'moduleConfirmed', 'inverterConfirmed', 'batteryConfirmed'].every(key => typeof p[key as keyof PVProject] === 'boolean') &&
    !!p.attachments && Object.entries(p.attachments).every(([key, a]) => ['module', 'inverter'].includes(key) &&
      !!a && shortText(a.id, 80) && /^[a-zA-Z0-9-]{8,80}$/.test(a.id) && shortText(a.name, 200) &&
      Number.isFinite(a.size) && a.size > 0 && a.size <= 10000000 && Number.isFinite(Date.parse(a.addedAt))) && shortText(p.notes, 6000);
}

export const cableSections = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
// Prysun datasheet column (2), two touching cables in free air, ambient 40°C, conductor 90°C.
const prysunR20 = [13.7, 8.21, 5.09, 3.39, 1.95, 1.24, .795, .565, .393, .277, .21, .164, .132, .108, .082];
const prysun40 = [20, 26, 35, 44, 61, 79, 104, 128, 159, 196, 233, 271, 308, 347, 411];
const fuseRatings = [2, 4, 6, 8, 10, 12, 15, 16, 20, 25, 30, 32, 35, 40, 50, 63, 80, 100];
const breakerRatings = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500];
const say = (pt: string, en: string, es: string): Localized => ({pt, en, es});
export interface PVCheck {id: string;kind: 'pass' | 'error' | 'review';title: Localized;detail: string}
export interface PVCalculation {
  checks: PVCheck[];hsp: number;monthlyPOA: number[] | null;dailyLoad: number;criticalDaily: number;
  peakKW: number;surgeKW: number;targetDaily: number;requiredKWp: number;recommendedInverterKW: number;
  modules: number;ns: number;strings: number;distribution: number[];installedKWp: number;dailyGeneration: number;monthlyGeneration: number;
  vocCold: number;vmpHot: number;vmpCold: number;vocHot: number;stringVoc: number;stringVmpHot: number;
  dcCurrent: number;mpptCurrent: number;mpptShortCircuit: number;fuseA: number | null;fuseNeeded: boolean;reverseA: number;
  dcIz: number;dcResistance: number;dcDropV: number;dcDropPercent: number;recommendedSection: number | null;rho: number;
  acCurrent: number;acBreakerA: number | null;acIz: number;acDropV: number;acDropPercent: number;
  batteryNeededKwh: number;batterySeries: number;batteryParallel: number;batteryUnits: number;batteryKwh: number;
  batteryUsableKwh: number;batteryCurrent: number;batteryFuseA: number | null;chargeCurrent: number;
  roofArea: number;
}

export function calculatePV(p: PVProject): PVCalculation | null {
  if (!validPVProject(p)) return null;
  const v = p.inputs;
  const storage = p.system !== 'ongrid';
  const checks: PVCheck[] = [];
  const check = (id: string, ok: boolean, title: Localized, detail: string) =>
    checks.push({id, kind: ok ? 'pass' : 'error', title, detail});
  const review = (id: string, title: Localized, detail = '') =>
    checks.push({id, kind: 'review', title, detail});
  const fixed = (x: number, digits = 2) => x.toFixed(digits);

  const climateMatches = p.solar && Math.abs(p.solar.latitude - v.latitude) < .00001 && Math.abs(p.solar.longitude - v.longitude) < .00001;
  const monthlyPOA = climateMatches && p.solar ? tiltedIrradiation(p.solar, v.tilt, v.azimuth) : null;
  const hsp = p.solarMode === 'manual' || !monthlyPOA ? v.hsp
    : p.solarMode === 'worst' ? Math.min(...monthlyPOA) : annualMean(monthlyPOA);
  const energy = (loads: PVLoad[]) => loads.reduce((sum, row) => sum + row.quantity * row.watts * row.hours / 1000, 0);
  const servedLoads = storage && p.system === 'hybrid' ? p.loads.filter(load => load.critical) : p.loads;
  const dailyLoad = energy(p.loads);
  const criticalDaily = energy(servedLoads);
  const peakKW = servedLoads.reduce((sum, row) => sum + row.quantity * row.watts / 1000, 0);
  // Worst individual motor start with all other declared loads running.
  const surgeKW = peakKW + Math.max(0, ...servedLoads.map(row => row.watts * (row.startFactor - 1) / 1000 * Math.min(1, row.quantity)));
  const targetDaily = p.system === 'offgrid' ? dailyLoad : v.monthlyKwh / v.days * v.coverage / 100;
  const generationEfficiency = p.system === 'offgrid' ? v.inverterEff / 100 * v.batteryRoundEff / 100 : 1;
  const requiredKWp = targetDaily / (hsp * v.pr / 100 * generationEfficiency);
  const neededModules = Math.ceil(requiredKWp * 1000 / v.moduleW);
  const vocCold = v.voc * (1 + v.betaVoc / 100 * (v.minTemp - 25));
  const vocHot = v.voc * (1 + v.betaVoc / 100 * (v.maxCellTemp - 25));
  const vmpHot = v.vmp * (1 + v.betaVmp / 100 * (v.maxCellTemp - 25));
  const vmpCold = v.vmp * (1 + v.betaVmp / 100 * (v.minTemp - 25));
  const correctedIsc = v.isc * v.iscFactor * (1 + v.alphaIsc / 100 * Math.max(0, v.maxCellTemp - 25));
  const correctedImp = v.imp * v.iscFactor;
  const nsMin = Math.max(1, Math.ceil(v.mpptMin / vmpHot), Math.ceil(v.startV / vocHot));
  const nsMax = Math.min(200, Math.floor(Math.min(v.inverterMaxV, v.moduleMaxV) / vocCold), Math.floor(v.mpptMax / vmpCold));
  const candidates: {ns: number;strings: number;extra: number;unused: number}[] = [];
  for (let ns = nsMin; ns <= nsMax; ns++) {
    const strings = Math.max(1, Math.ceil(neededModules / ns));
    const parallel = Math.ceil(strings / v.mppts);
    if (parallel > v.stringsPerMppt || parallel * correctedImp > v.mpptA || parallel * correctedIsc > v.mpptIsc) continue;
    candidates.push({ns, strings, extra: ns * strings - neededModules, unused: Math.max(0, v.mppts - strings)});
  }
  candidates.sort((a, b) => a.extra - b.extra || a.unused - b.unused || b.ns - a.ns);
  const automatic = candidates[0];
  // Keep an inspectable draft when the selected inverter cannot accommodate the target.
  const ns = p.stringMode === 'manual' ? v.manualNs : automatic?.ns ?? Math.max(1, Math.min(200, nsMax));
  const strings = p.stringMode === 'manual' ? v.manualStrings : automatic?.strings ?? Math.max(1, Math.ceil(neededModules / ns));
  const distribution = Array.from({length: v.mppts}, (_, i) => Math.floor(strings / v.mppts) + (i < strings % v.mppts ? 1 : 0));
  const parallel = Math.max(...distribution);
  const modules = ns * strings;
  const installedKWp = modules * v.moduleW / 1000;
  const dailyGeneration = installedKWp * hsp * v.pr / 100 * generationEfficiency;
  const stringVoc = ns * vocCold;
  const stringVmpHot = ns * vmpHot;
  const dcCurrent = correctedIsc;
  const mpptCurrent = parallel * correctedImp;
  const mpptShortCircuit = parallel * correctedIsc;
  const reverseA = (parallel - 1) * correctedIsc + v.backfeedA;
  const fuseNeeded = reverseA > v.moduleReverse;
  const fuseA = fuseRatings.find(a => a >= v.fuseFactor * v.isc && a > 1.5 * v.isc && a < 2.4 * v.isc && a <= v.moduleFuse) ?? null;
  const rho = .0175 * (1 + .00393 * (v.cableTemp - 20));
  const sectionIndex = cableSections.indexOf(v.dcSection);
  const dcR20 = p.cableMethod === 'prysun40' ? prysunR20[sectionIndex] ?? Infinity : v.dcR20;
  const dcResistance = dcR20 * (1 + .00393 * (v.cableTemp - 20));
  const dcDropV = 2 * dcResistance * v.dcLength / 1000 * correctedImp;
  const dcDropPercent = stringVmpHot > 0 ? dcDropV / stringVmpHot * 100 : Infinity;
  const dcBaseIz = p.cableMethod === 'prysun40' ? prysun40[sectionIndex] ?? 0 : v.dcIz;
  const dcIz = dcBaseIz * v.dcCorrection * v.dcGroup;
  const protectionCurrent = fuseNeeded ? fuseA ?? Infinity : dcCurrent;
  const recommendedSection = cableSections.find((section, index) =>
    section >= 4 && 2 * (p.cableMethod === 'prysun40' ? prysunR20[index] : v.dcR20 * v.dcSection / section) *
      (1 + .00393 * (v.cableTemp - 20)) * v.dcLength / 1000 * correctedImp / stringVmpHot * 100 <= v.dcDrop &&
    (p.cableMethod === 'manual' || prysun40[index] * v.dcCorrection * v.dcGroup >= Math.max(dcCurrent, protectionCurrent))) ?? null;
  const acCurrent = Math.max(v.inverterAcA, v.inverterKW * 1000 / ((v.phases === 3 ? Math.sqrt(3) : 1) * v.acV * v.pf));
  const acBreakerA = breakerRatings.find(a => a >= acCurrent) ?? null;
  const acIz = v.acIz * v.acCorrection;
  const acDropV = (v.phases === 3 ? Math.sqrt(3) : 2) * rho * v.acLength * acCurrent / v.acSection;
  const acDropPercent = acDropV / v.acV * 100;
  const batteryNeededKwh = storage ? criticalDaily * v.autonomyDays / (v.dod / 100 * v.batteryDisEff / 100 * v.inverterEff / 100) : 0;
  const batterySeries = storage ? Math.max(1, Math.round(v.batteryV / v.unitV)) : 0;
  const batteryCurrent = storage ? v.inverterKW * 1000 / (v.batteryMinV * v.inverterEff / 100) : 0;
  const batteryFuseA = storage ? breakerRatings.find(a => a >= batteryCurrent * 1.25) ?? null : null;
  const batteryParallel = storage ? Math.max(1,
    Math.ceil(batteryNeededKwh / (batterySeries * v.unitV * v.batteryAh / 1000)),
    Math.ceil((batteryFuseA ?? batteryCurrent) / v.batteryMaxA)) : 0;
  const batteryUnits = batterySeries * batteryParallel;
  const batteryKwh = batteryUnits * v.unitV * v.batteryAh / 1000;
  const batteryUsableKwh = batteryKwh * v.dod / 100 * v.batteryDisEff / 100 * v.inverterEff / 100;
  const chargeCurrent = storage ? installedKWp * 1000 / v.batteryMinV : 0;

  check('electrical-inputs', v.vmp < v.voc && v.imp <= v.isc && v.mpptMin < v.mpptMax && v.mpptMax <= v.inverterMaxV &&
    v.minTemp < v.maxCellTemp && v.batteryRoundEff <= v.batteryDisEff,
    say('Coerência dos dados elétricos', 'Electrical data consistency', 'Coherencia de los datos eléctricos'),
    'Vmp < Voc · Imp ≤ Isc · MPPTmín < MPPTmáx ≤ Vccmáx · ηbat,ciclo ≤ ηbat,descarga');
  check('module-power', Math.abs(v.vmp * v.imp - v.moduleW) / v.moduleW <= .06,
    say('Potência e ponto de máxima potência do módulo', 'Module power and maximum power point', 'Potencia y punto de máxima potencia del módulo'),
    fixed(v.vmp * v.imp) + ' W ≈ ' + fixed(v.moduleW) + ' W');
  check('string-voc', stringVoc < Math.min(v.inverterMaxV, v.moduleMaxV),
    say('Voc da string na temperatura mínima', 'String Voc at minimum temperature', 'Voc de la cadena a temperatura mínima'),
    fixed(stringVoc) + ' V < ' + fixed(Math.min(v.inverterMaxV, v.moduleMaxV)) + ' V');
  check('string-mppt', stringVmpHot >= v.mpptMin && ns * vmpCold <= v.mpptMax && ns * vocHot >= v.startV,
    say('Janela MPPT e tensão de partida', 'MPPT window and startup voltage', 'Ventana MPPT y tensión de arranque'),
    fixed(v.mpptMin) + ' ≤ ' + fixed(stringVmpHot) + '…' + fixed(ns * vmpCold) + ' ≤ ' + fixed(v.mpptMax) + ' V');
  check('mppt-current', mpptCurrent <= v.mpptA && mpptShortCircuit <= v.mpptIsc && parallel <= v.stringsPerMppt,
    say('Corrente e entradas por MPPT', 'Current and inputs per MPPT', 'Corriente y entradas por MPPT'),
    fixed(mpptCurrent) + ' / ' + fixed(v.mpptA) + ' A · Isc ' + fixed(mpptShortCircuit) + ' / ' + fixed(v.mpptIsc) + ' A');
  check('dc-power', installedKWp * 1000 <= v.inverterDCW,
    say('Potência FV máxima admitida pelo inversor', 'Inverter maximum PV power', 'Potencia FV máxima del inversor'),
    fixed(installedKWp) + ' / ' + fixed(v.inverterDCW / 1000) + ' kWp');
  check('energy', dailyGeneration + .00001 >= targetDaily,
    say('Atendimento da meta energética', 'Energy target coverage', 'Cobertura del objetivo energético'),
    fixed(dailyGeneration) + ' ≥ ' + fixed(targetDaily) + ' kWh/dia');
  check('dc-cable', dcDropPercent <= v.dcDrop && dcIz >= dcCurrent && (!fuseNeeded || (!!fuseA && fuseA <= dcIz)),
    say('Cabo da string e coordenação da proteção', 'String cable and protection coordination', 'Cable de cadena y coordinación de protección'),
    'ΔV ' + fixed(dcDropPercent) + '% / ' + fixed(v.dcDrop) + '% · Iz ' + fixed(dcIz) + ' A ≥ Ib ' + fixed(dcCurrent) + ' A');
  check('fuse', !fuseNeeded || fuseA !== null,
    say('Proteção gPV e limite do módulo', 'gPV protection and module limit', 'Protección gPV y límite del módulo'),
    'Irev ' + fixed(reverseA) + ' A · Irev,adm ' + fixed(v.moduleReverse) + ' A · In ' + (fuseA ?? '—') + ' A · máx ' + v.moduleFuse + ' A');
  check('ac-protection', !!acBreakerA && acBreakerA <= acIz && acDropPercent <= v.acDrop,
    say('Circuito CA e disjuntor', 'AC circuit and circuit breaker', 'Circuito CA e interruptor'),
    'Ib ' + fixed(acCurrent) + ' A ≤ In ' + (acBreakerA ?? '—') + ' A ≤ Iz ' + fixed(acIz) + ' A · ΔV ' + fixed(acDropPercent) + '%');
  if (storage) {
    check('battery-port', p.hasBatteryPort && v.batteryV >= v.batteryMinV && v.batteryV <= v.batteryMaxV &&
      Math.abs(batterySeries * v.unitV - v.batteryV) < .01 && batterySeries <= v.batterySeriesMax,
      say('Compatibilidade do banco e porta de bateria', 'Battery bank and battery port compatibility', 'Compatibilidad del banco y puerto de batería'),
      batterySeries + 'S × ' + batteryParallel + 'P · ' + fixed(v.batteryV) + ' V · faixa ' + v.batteryMinV + '–' + v.batteryMaxV + ' V');
    check('battery-energy', batteryUsableKwh >= criticalDaily * v.autonomyDays && criticalDaily > 0,
      say('Autonomia energética calculada', 'Calculated energy autonomy', 'Autonomía energética calculada'),
      fixed(batteryUsableKwh) + ' ≥ ' + fixed(criticalDaily * v.autonomyDays) + ' kWh CA');
    check('battery-current', !!batteryFuseA && batteryFuseA <= v.batteryIz && batteryFuseA <= batteryParallel * v.batteryMaxA,
      say('Corrente do banco, BMS e proteção principal', 'Bank current, BMS and main protection', 'Corriente del banco, BMS y protección principal'),
      'Ib ' + fixed(batteryCurrent) + ' A · In ' + (batteryFuseA ?? '—') + ' A · Iz ' + v.batteryIz + ' A');
    if (chargeCurrent > v.chargeA) review('battery-charge-limited',
      say('Verificar limitação de carga e tempo de recarga', 'Verify charge limiting and recharge time', 'Verificar limitación de carga y tiempo de recarga'),
      fixed(chargeCurrent) + ' A FV potencial · limite ' + v.chargeA + ' A');
    else check('battery-charge', true,
      say('Corrente de carga dentro do limite declarado', 'Charge current within declared limit', 'Corriente de carga dentro del límite declarado'),
      fixed(chargeCurrent) + ' ≤ ' + v.chargeA + ' A');
    check('backup-load', p.hasEPS && peakKW <= (p.system === 'hybrid' ? v.epsKW : v.inverterKW) && surgeKW <= v.inverterSurgeKW,
      say('Saída autônoma e partida das cargas', 'Stand-alone output and starting loads', 'Salida autónoma y arranque de cargas'),
      fixed(peakKW) + ' kW · partida ' + fixed(surgeKW) + ' kW · inversor ' + v.inverterKW + ' kW');
    if (!p.batteryConfirmed) review('battery-datasheet', say('Conferir datasheet, BMS e associação das baterias', 'Verify battery datasheet, BMS and configuration', 'Verificar ficha de batería, BMS y asociación'));
    review('battery-engineering', say('Validar ramais de bateria, curto-circuito e tempo de recarga', 'Validate battery branches, short-circuit and recharge time', 'Validar ramales de batería, cortocircuito y tiempo de recarga'));
  }
  if (installedKWp > v.inverterKW) review('inverter-clipping',
    say('Avaliar clipping e perfil horário do inversor', 'Assess inverter clipping and hourly profile', 'Evaluar clipping y perfil horario del inversor'),
    'CC/CA ' + fixed(installedKWp / v.inverterKW));
  if (p.solarMode !== 'manual' && !climateMatches) check('solar-location', false,
    say('A climatologia deve corresponder às coordenadas', 'Climatology must match the coordinates', 'La climatología debe coincidir con las coordenadas'),
    'HSP manual de contingência · atualizar consulta');
  if (!p.locationConfirmed) review('location', say('Confirmar as coordenadas da instalação', 'Confirm installation coordinates', 'Confirmar las coordenadas de instalación'));
  if (!p.moduleConfirmed) review('module-datasheet', say('Conferir os valores do módulo no datasheet', 'Verify module values against its datasheet', 'Verificar datos del módulo en su ficha técnica'));
  if (!p.inverterConfirmed) review('inverter-datasheet', say('Conferir inversor, MPPT e funções de operação no datasheet', 'Verify inverter, MPPT and operating modes against its datasheet', 'Verificar inversor, MPPT y modos de operación en la ficha técnica'));
  if (p.solarMode === 'manual' || !monthlyPOA) review('solar-manual', say('HSP manual adotada como premissa do estudo', 'Manual peak sun hours used as a study assumption', 'HSP manual adoptada como supuesto del estudio'), fixed(hsp) + ' h/dia');
  if (storage && p.solarMode !== 'worst') review('solar-seasonality', say('Avaliar o mês crítico e a continuidade do suprimento', 'Assess the critical month and supply continuity', 'Evaluar el mes crítico y la continuidad del suministro'));
  review('site-engineering', say('Validar método de instalação, DPS, aterramento e capacidade de interrupção', 'Validate installation method, surge protection, earthing and interrupting capacity', 'Validar instalación, protección contra sobretensiones, tierra y poder de corte'));
  return {
    checks, hsp, monthlyPOA, dailyLoad, criticalDaily, peakKW, surgeKW, targetDaily, requiredKWp,
    recommendedInverterKW: Math.max(installedKWp / v.dcAc, storage ? peakKW : 0),
    modules, ns, strings, distribution, installedKWp, dailyGeneration, monthlyGeneration: dailyGeneration * v.days,
    vocCold, vmpHot, vmpCold, vocHot, stringVoc, stringVmpHot, dcCurrent, mpptCurrent, mpptShortCircuit, fuseA, fuseNeeded, reverseA,
    dcIz, dcResistance, dcDropV, dcDropPercent, recommendedSection, rho, acCurrent, acBreakerA, acIz, acDropV, acDropPercent,
    batteryNeededKwh, batterySeries, batteryParallel, batteryUnits, batteryKwh, batteryUsableKwh, batteryCurrent, batteryFuseA, chargeCurrent,
    roofArea: modules * v.moduleArea
  };
}
