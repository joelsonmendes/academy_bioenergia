// src/pv-solar.ts
var solarMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
var monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var midDays = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
var radians = Math.PI / 180;
function validSolarClimate(value) {
  const s = value;
  return !!s && Number.isFinite(s.latitude) && Math.abs(s.latitude) <= 90 && Number.isFinite(s.longitude) && Math.abs(s.longitude) <= 180 && Array.isArray(s.ghi) && s.ghi.length === 12 && s.ghi.every((v) => Number.isFinite(v) && v > 0 && v < 15) && Array.isArray(s.diffuse) && s.diffuse.length === 12 && s.diffuse.every((v, i) => Number.isFinite(v) && v >= 0 && v <= s.ghi[i]) && typeof s.period === "string" && s.period.length < 300 && typeof s.url === "string" && s.url.startsWith("https://power.larc.nasa.gov/api/temporal/climatology/point?") && typeof s.retrievedAt === "string" && Number.isFinite(Date.parse(s.retrievedAt));
}
function parsePowerClimate(raw, latitude, longitude, url) {
  const body = raw;
  function parameter(id) {
    const values = body.properties?.parameter?.[id];
    const units = body.parameters?.[id]?.units?.toLowerCase().replace(/\s/g, "");
    const factor = units === "kw-hr/m^2/day" || units === "kwh/m^2/day" ? 1 : units === "mj/m^2/day" ? 1 / 3.6 : 0;
    if (!values || !factor) throw new Error("SOLAR_UNITS");
    return solarMonths.map((month) => values[month] * factor);
  }
  const climate = {
    latitude,
    longitude,
    ghi: parameter("ALLSKY_SFC_SW_DWN"),
    diffuse: parameter("ALLSKY_SFC_SW_DIFF"),
    period: body.header?.range ?? "Climatologia NASA POWER",
    retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
    url
  };
  if (!validSolarClimate(climate)) throw new Error("SOLAR_DATA");
  return climate;
}
function annualMean(values) {
  return values.reduce((total, value, month) => total + value * monthDays[month], 0) / 365;
}
function tiltedIrradiation(climate, tilt, azimuth, albedo = 0.2) {
  const latitude = climate.latitude * radians;
  const beta = tilt * radians;
  const bearing = azimuth * radians;
  const normal = [Math.sin(beta) * Math.sin(bearing), Math.sin(beta) * Math.cos(bearing), Math.cos(beta)];
  return climate.ghi.map((ghi, month) => {
    const declination = 23.45 * radians * Math.sin(tau * (284 + midDays[month]) / 365);
    let horizontal = 0;
    let incident = 0;
    for (let sample = 0; sample < 288; sample++) {
      const hourAngle = ((sample + 0.5) / 288 * 360 - 180) * radians;
      const east = -Math.cos(declination) * Math.sin(hourAngle);
      const north = Math.cos(latitude) * Math.sin(declination) - Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle);
      const up = Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
      if (up <= 0) continue;
      horizontal += up;
      incident += Math.max(0, east * normal[0] + north * normal[1] + up * normal[2]);
    }
    const diffuse = climate.diffuse[month];
    const beamRatio = horizontal > 0 ? incident / horizontal : 0;
    return (ghi - diffuse) * beamRatio + diffuse * (1 + Math.cos(beta)) / 2 + albedo * ghi * (1 - Math.cos(beta)) / 2;
  });
}
var tau = 2 * Math.PI;
function bestAnnualTilt(climate, azimuth) {
  let tilt = 0;
  let best = -Infinity;
  for (let candidate = 0; candidate <= 60; candidate++) {
    const value = annualMean(tiltedIrradiation(climate, candidate, azimuth));
    if (value > best) {
      best = value;
      tilt = candidate;
    }
  }
  return tilt;
}

// src/pv-report-engine.ts
var pvDefaults = {
  latitude: -9.97,
  longitude: -67.81,
  tilt: 10,
  azimuth: 0,
  hsp: 4.5,
  monthlyKwh: 500,
  days: 30,
  coverage: 100,
  pr: 80,
  dcAc: 1.2,
  minTemp: 10,
  maxCellTemp: 70,
  moduleW: 550,
  voc: 49.9,
  vmp: 41.96,
  isc: 13.99,
  imp: 13.11,
  betaVoc: -0.28,
  betaVmp: -0.34,
  alphaIsc: 0.05,
  moduleFuse: 25,
  moduleReverse: 25,
  moduleMaxV: 1500,
  moduleArea: 2.6,
  inverterKW: 5,
  inverterDCW: 6500,
  inverterMaxV: 550,
  mpptMin: 120,
  mpptMax: 500,
  mppts: 2,
  stringsPerMppt: 1,
  mpptA: 18,
  mpptIsc: 22.5,
  startV: 140,
  inverterEff: 94,
  inverterSurgeKW: 10,
  epsKW: 5,
  batteryMinV: 40,
  batteryMaxV: 60,
  chargeA: 100,
  acV: 220,
  phases: 1,
  pf: 1,
  inverterAcA: 25,
  batteryV: 51.2,
  unitV: 51.2,
  batteryAh: 100,
  dod: 80,
  batteryDisEff: 95,
  batteryRoundEff: 92,
  batteryMaxA: 100,
  batterySeriesMax: 1,
  autonomyDays: 1,
  dcLength: 20,
  dcSection: 4,
  cableTemp: 90,
  dcDrop: 1.5,
  dcR20: 5.09,
  dcIz: 35,
  dcCorrection: 1,
  dcGroup: 1,
  iscFactor: 1.25,
  fuseFactor: 1.56,
  backfeedA: 0,
  acLength: 15,
  acSection: 6,
  acIz: 36,
  acCorrection: 1,
  acDrop: 2,
  batteryIz: 200,
  manualNs: 4,
  manualStrings: 2
};
var initialLoads = [
  { id: "lighting", name: "Ilumina\xE7\xE3o", quantity: 10, watts: 10, hours: 5, startFactor: 1, critical: true },
  { id: "fridge", name: "Refrigerador", quantity: 1, watts: 150, hours: 10, startFactor: 3, critical: true },
  { id: "fans", name: "Ventiladores", quantity: 2, watts: 60, hours: 8, startFactor: 1, critical: true },
  { id: "outlets", name: "Tomadas", quantity: 1, watts: 300, hours: 3, startFactor: 1, critical: false }
];
function pvId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function newPVProject() {
  return {
    version: 1,
    id: pvId(),
    system: "ongrid",
    title: "Estudo fotovoltaico",
    designer: "",
    registration: "",
    client: { name: "", contact: "", consumerUnit: "" },
    site: { region: "Norte", uf: "AC", city: "Rio Branco", cep: "", address: "", locationNote: "Coordenadas de refer\xEAncia did\xE1tica de Rio Branco. Confirme o local." },
    moduleName: "M\xF3dulo did\xE1tico 550 W",
    inverterName: "Inversor did\xE1tico multimodo 5 kW",
    batteryName: "Bateria did\xE1tica 51,2 V / 100 Ah",
    inputs: { ...pvDefaults },
    loads: initialLoads.map((load) => ({ ...load })),
    solar: null,
    solarMode: "manual",
    stringMode: "auto",
    hasBatteryPort: true,
    hasEPS: true,
    locationConfirmed: false,
    moduleConfirmed: false,
    inverterConfirmed: false,
    batteryConfirmed: false,
    cableMethod: "prysun40",
    attachments: {},
    notes: ""
  };
}
var pvLimits = {
  latitude: [-35, 6],
  longitude: [-75, -32],
  tilt: [0, 90],
  azimuth: [0, 360],
  hsp: [0.1, 12],
  monthlyKwh: [0.1, 1e5],
  days: [1, 31],
  coverage: [1, 100],
  pr: [10, 100],
  dcAc: [0.5, 2],
  minTemp: [-40, 50],
  maxCellTemp: [25, 100],
  moduleW: [10, 1e3],
  voc: [5, 150],
  vmp: [3, 140],
  isc: [0.1, 60],
  imp: [0.1, 60],
  betaVoc: [-1, 0],
  betaVmp: [-1, 0],
  alphaIsc: [0, 0.3],
  moduleFuse: [1, 100],
  moduleReverse: [0, 200],
  moduleMaxV: [50, 2e3],
  moduleArea: [0.1, 6],
  inverterKW: [0.1, 500],
  inverterDCW: [100, 1e6],
  inverterMaxV: [20, 2e3],
  mpptMin: [5, 1500],
  mpptMax: [10, 2e3],
  mppts: [1, 30],
  stringsPerMppt: [1, 30],
  mpptA: [0.1, 1e3],
  mpptIsc: [0.1, 1500],
  startV: [5, 1500],
  inverterEff: [30, 100],
  inverterSurgeKW: [0.1, 1e3],
  epsKW: [0, 500],
  batteryMinV: [5, 1500],
  batteryMaxV: [5, 1500],
  chargeA: [1, 1e3],
  acV: [100, 1e3],
  phases: [1, 3],
  pf: [0.5, 1],
  inverterAcA: [0, 3e3],
  batteryV: [12, 1500],
  unitV: [2, 1500],
  batteryAh: [1, 5e3],
  dod: [10, 100],
  batteryDisEff: [30, 100],
  batteryRoundEff: [30, 100],
  batteryMaxA: [1, 2e3],
  batterySeriesMax: [1, 100],
  autonomyDays: [0.05, 30],
  dcLength: [0, 1e3],
  dcSection: [1.5, 240],
  cableTemp: [20, 120],
  dcDrop: [0.1, 10],
  dcR20: [1e-3, 100],
  dcIz: [0, 1e3],
  dcCorrection: [0.1, 1.5],
  dcGroup: [0.1, 1],
  iscFactor: [1, 2],
  fuseFactor: [1.51, 2.39],
  backfeedA: [0, 1e3],
  acLength: [0, 1e3],
  acSection: [1.5, 240],
  acIz: [0, 3e3],
  acCorrection: [0.1, 1.5],
  acDrop: [0.1, 10],
  batteryIz: [0, 3e3],
  manualNs: [1, 200],
  manualStrings: [1, 900]
};
var integerKeys = ["mppts", "stringsPerMppt", "batterySeriesMax", "manualNs", "manualStrings", "phases"];
function validPVInputs(input) {
  if (!input || typeof input !== "object") return false;
  const v = input;
  return Object.keys(pvLimits).every((key) => Number.isFinite(v[key]) && v[key] >= pvLimits[key][0] && v[key] <= pvLimits[key][1]) && integerKeys.every((key) => Number.isInteger(v[key])) && [1, 3].includes(v.phases);
}
var shortText = (v, max = 200) => typeof v === "string" && v.length <= max;
function validPVProject(value) {
  const p = value;
  return !!p && p.version === 1 && typeof p.id === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(p.id) && ["ongrid", "offgrid", "hybrid"].includes(p.system) && validPVInputs(p.inputs) && [p.title, p.designer, p.registration, p.moduleName, p.inverterName, p.batteryName].every((v) => shortText(v)) && !!p.client && Object.values(p.client).length === 3 && Object.values(p.client).every((v) => shortText(v)) && !!p.site && ["region", "uf", "city", "cep", "address", "locationNote"].every((key) => shortText(p.site[key], 400)) && Array.isArray(p.loads) && p.loads.length >= 1 && p.loads.length <= 30 && p.loads.every((load) => !!load && shortText(load.id, 80) && shortText(load.name, 120) && Number.isInteger(load.quantity) && load.quantity >= 0 && load.quantity <= 1e3 && Number.isFinite(load.watts) && load.watts >= 0 && load.watts <= 1e6 && Number.isFinite(load.hours) && load.hours >= 0 && load.hours <= 24 && Number.isFinite(load.startFactor) && load.startFactor >= 1 && load.startFactor <= 10 && typeof load.critical === "boolean") && new Set(p.loads.map((load) => load.id)).size === p.loads.length && (p.solar === null || validSolarClimate(p.solar)) && ["manual", "annual", "worst"].includes(p.solarMode) && ["auto", "manual"].includes(p.stringMode) && ["manual", "prysun40"].includes(p.cableMethod) && ["hasBatteryPort", "hasEPS", "locationConfirmed", "moduleConfirmed", "inverterConfirmed", "batteryConfirmed"].every((key) => typeof p[key] === "boolean") && !!p.attachments && Object.entries(p.attachments).every(([key, a]) => ["module", "inverter"].includes(key) && !!a && shortText(a.id, 80) && /^[a-zA-Z0-9-]{8,80}$/.test(a.id) && shortText(a.name, 200) && Number.isFinite(a.size) && a.size > 0 && a.size <= 1e7 && Number.isFinite(Date.parse(a.addedAt))) && shortText(p.notes, 6e3);
}
var cableSections = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
var prysunR20 = [13.7, 8.21, 5.09, 3.39, 1.95, 1.24, 0.795, 0.565, 0.393, 0.277, 0.21, 0.164, 0.132, 0.108, 0.082];
var prysun40 = [20, 26, 35, 44, 61, 79, 104, 128, 159, 196, 233, 271, 308, 347, 411];
var fuseRatings = [2, 4, 6, 8, 10, 12, 15, 16, 20, 25, 30, 32, 35, 40, 50, 63, 80, 100];
var breakerRatings = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1e3, 1250, 1600, 2e3, 2500];
var say = (pt, en, es) => ({ pt, en, es });
function calculatePV(p) {
  if (!validPVProject(p)) return null;
  const v = p.inputs;
  const storage = p.system !== "ongrid";
  const checks = [];
  const check = (id, ok, title, detail) => checks.push({ id, kind: ok ? "pass" : "error", title, detail });
  const review = (id, title, detail = "") => checks.push({ id, kind: "review", title, detail });
  const fixed = (x, digits = 2) => x.toFixed(digits);
  const climateMatches = p.solar && Math.abs(p.solar.latitude - v.latitude) < 1e-5 && Math.abs(p.solar.longitude - v.longitude) < 1e-5;
  const monthlyPOA = climateMatches && p.solar ? tiltedIrradiation(p.solar, v.tilt, v.azimuth) : null;
  const hsp = p.solarMode === "manual" || !monthlyPOA ? v.hsp : p.solarMode === "worst" ? Math.min(...monthlyPOA) : annualMean(monthlyPOA);
  const energy = (loads) => loads.reduce((sum, row) => sum + row.quantity * row.watts * row.hours / 1e3, 0);
  const servedLoads = storage && p.system === "hybrid" ? p.loads.filter((load) => load.critical) : p.loads;
  const dailyLoad = energy(p.loads);
  const criticalDaily = energy(servedLoads);
  const peakKW = servedLoads.reduce((sum, row) => sum + row.quantity * row.watts / 1e3, 0);
  const surgeKW = peakKW + Math.max(0, ...servedLoads.map((row) => row.watts * (row.startFactor - 1) / 1e3 * Math.min(1, row.quantity)));
  const targetDaily = p.system === "offgrid" ? dailyLoad : v.monthlyKwh / v.days * v.coverage / 100;
  const generationEfficiency = p.system === "offgrid" ? v.inverterEff / 100 * v.batteryRoundEff / 100 : 1;
  const requiredKWp = targetDaily / (hsp * v.pr / 100 * generationEfficiency);
  const neededModules = Math.ceil(requiredKWp * 1e3 / v.moduleW);
  const vocCold = v.voc * (1 + v.betaVoc / 100 * (v.minTemp - 25));
  const vocHot = v.voc * (1 + v.betaVoc / 100 * (v.maxCellTemp - 25));
  const vmpHot = v.vmp * (1 + v.betaVmp / 100 * (v.maxCellTemp - 25));
  const vmpCold = v.vmp * (1 + v.betaVmp / 100 * (v.minTemp - 25));
  const correctedIsc = v.isc * v.iscFactor * (1 + v.alphaIsc / 100 * Math.max(0, v.maxCellTemp - 25));
  const correctedImp = v.imp * v.iscFactor;
  const nsMin = Math.max(1, Math.ceil(v.mpptMin / vmpHot), Math.ceil(v.startV / vocHot));
  const nsMax = Math.min(200, Math.floor(Math.min(v.inverterMaxV, v.moduleMaxV) / vocCold), Math.floor(v.mpptMax / vmpCold));
  const candidates = [];
  for (let ns2 = nsMin; ns2 <= nsMax; ns2++) {
    const strings2 = Math.max(1, Math.ceil(neededModules / ns2));
    const parallel2 = Math.ceil(strings2 / v.mppts);
    if (parallel2 > v.stringsPerMppt || parallel2 * correctedImp > v.mpptA || parallel2 * correctedIsc > v.mpptIsc) continue;
    candidates.push({ ns: ns2, strings: strings2, extra: ns2 * strings2 - neededModules, unused: Math.max(0, v.mppts - strings2) });
  }
  candidates.sort((a, b) => a.extra - b.extra || a.unused - b.unused || b.ns - a.ns);
  const automatic = candidates[0];
  const ns = p.stringMode === "manual" ? v.manualNs : automatic?.ns ?? Math.max(1, Math.min(200, nsMax));
  const strings = p.stringMode === "manual" ? v.manualStrings : automatic?.strings ?? Math.max(1, Math.ceil(neededModules / ns));
  const distribution = Array.from({ length: v.mppts }, (_, i) => Math.floor(strings / v.mppts) + (i < strings % v.mppts ? 1 : 0));
  const parallel = Math.max(...distribution);
  const modules = ns * strings;
  const installedKWp = modules * v.moduleW / 1e3;
  const dailyGeneration = installedKWp * hsp * v.pr / 100 * generationEfficiency;
  const stringVoc = ns * vocCold;
  const stringVmpHot = ns * vmpHot;
  const dcCurrent = correctedIsc;
  const mpptCurrent = parallel * correctedImp;
  const mpptShortCircuit = parallel * correctedIsc;
  const reverseA = (parallel - 1) * correctedIsc + v.backfeedA;
  const fuseNeeded = reverseA > v.moduleReverse;
  const fuseA = fuseRatings.find((a) => a >= v.fuseFactor * v.isc && a > 1.5 * v.isc && a < 2.4 * v.isc && a <= v.moduleFuse) ?? null;
  const rho = 0.0175 * (1 + 393e-5 * (v.cableTemp - 20));
  const sectionIndex = cableSections.indexOf(v.dcSection);
  const dcR20 = p.cableMethod === "prysun40" ? prysunR20[sectionIndex] ?? Infinity : v.dcR20;
  const dcResistance = dcR20 * (1 + 393e-5 * (v.cableTemp - 20));
  const dcDropV = 2 * dcResistance * v.dcLength / 1e3 * correctedImp;
  const dcDropPercent = stringVmpHot > 0 ? dcDropV / stringVmpHot * 100 : Infinity;
  const dcBaseIz = p.cableMethod === "prysun40" ? prysun40[sectionIndex] ?? 0 : v.dcIz;
  const dcIz = dcBaseIz * v.dcCorrection * v.dcGroup;
  const protectionCurrent = fuseNeeded ? fuseA ?? Infinity : dcCurrent;
  const recommendedSection = cableSections.find((section, index) => section >= 4 && 2 * (p.cableMethod === "prysun40" ? prysunR20[index] : v.dcR20 * v.dcSection / section) * (1 + 393e-5 * (v.cableTemp - 20)) * v.dcLength / 1e3 * correctedImp / stringVmpHot * 100 <= v.dcDrop && (p.cableMethod === "manual" || prysun40[index] * v.dcCorrection * v.dcGroup >= Math.max(dcCurrent, protectionCurrent))) ?? null;
  const acCurrent = Math.max(v.inverterAcA, v.inverterKW * 1e3 / ((v.phases === 3 ? Math.sqrt(3) : 1) * v.acV * v.pf));
  const acBreakerA = breakerRatings.find((a) => a >= acCurrent) ?? null;
  const acIz = v.acIz * v.acCorrection;
  const acDropV = (v.phases === 3 ? Math.sqrt(3) : 2) * rho * v.acLength * acCurrent / v.acSection;
  const acDropPercent = acDropV / v.acV * 100;
  const batteryNeededKwh = storage ? criticalDaily * v.autonomyDays / (v.dod / 100 * v.batteryDisEff / 100 * v.inverterEff / 100) : 0;
  const batterySeries = storage ? Math.max(1, Math.round(v.batteryV / v.unitV)) : 0;
  const batteryCurrent = storage ? v.inverterKW * 1e3 / (v.batteryMinV * v.inverterEff / 100) : 0;
  const batteryFuseA = storage ? breakerRatings.find((a) => a >= batteryCurrent * 1.25) ?? null : null;
  const batteryParallel = storage ? Math.max(
    1,
    Math.ceil(batteryNeededKwh / (batterySeries * v.unitV * v.batteryAh / 1e3)),
    Math.ceil((batteryFuseA ?? batteryCurrent) / v.batteryMaxA)
  ) : 0;
  const batteryUnits = batterySeries * batteryParallel;
  const batteryKwh = batteryUnits * v.unitV * v.batteryAh / 1e3;
  const batteryUsableKwh = batteryKwh * v.dod / 100 * v.batteryDisEff / 100 * v.inverterEff / 100;
  const chargeCurrent = storage ? installedKWp * 1e3 / v.batteryMinV : 0;
  check(
    "electrical-inputs",
    v.vmp < v.voc && v.imp <= v.isc && v.mpptMin < v.mpptMax && v.mpptMax <= v.inverterMaxV && v.minTemp < v.maxCellTemp && v.batteryRoundEff <= v.batteryDisEff,
    say("Coer\xEAncia dos dados el\xE9tricos", "Electrical data consistency", "Coherencia de los datos el\xE9ctricos"),
    "Vmp < Voc \xB7 Imp \u2264 Isc \xB7 MPPTm\xEDn < MPPTm\xE1x \u2264 Vccm\xE1x \xB7 \u03B7bat,ciclo \u2264 \u03B7bat,descarga"
  );
  check(
    "module-power",
    Math.abs(v.vmp * v.imp - v.moduleW) / v.moduleW <= 0.06,
    say("Pot\xEAncia e ponto de m\xE1xima pot\xEAncia do m\xF3dulo", "Module power and maximum power point", "Potencia y punto de m\xE1xima potencia del m\xF3dulo"),
    fixed(v.vmp * v.imp) + " W \u2248 " + fixed(v.moduleW) + " W"
  );
  check(
    "string-voc",
    stringVoc < Math.min(v.inverterMaxV, v.moduleMaxV),
    say("Voc da string na temperatura m\xEDnima", "String Voc at minimum temperature", "Voc de la cadena a temperatura m\xEDnima"),
    fixed(stringVoc) + " V < " + fixed(Math.min(v.inverterMaxV, v.moduleMaxV)) + " V"
  );
  check(
    "string-mppt",
    stringVmpHot >= v.mpptMin && ns * vmpCold <= v.mpptMax && ns * vocHot >= v.startV,
    say("Janela MPPT e tens\xE3o de partida", "MPPT window and startup voltage", "Ventana MPPT y tensi\xF3n de arranque"),
    fixed(v.mpptMin) + " \u2264 " + fixed(stringVmpHot) + "\u2026" + fixed(ns * vmpCold) + " \u2264 " + fixed(v.mpptMax) + " V"
  );
  check(
    "mppt-current",
    mpptCurrent <= v.mpptA && mpptShortCircuit <= v.mpptIsc && parallel <= v.stringsPerMppt,
    say("Corrente e entradas por MPPT", "Current and inputs per MPPT", "Corriente y entradas por MPPT"),
    fixed(mpptCurrent) + " / " + fixed(v.mpptA) + " A \xB7 Isc " + fixed(mpptShortCircuit) + " / " + fixed(v.mpptIsc) + " A"
  );
  check(
    "dc-power",
    installedKWp * 1e3 <= v.inverterDCW,
    say("Pot\xEAncia FV m\xE1xima admitida pelo inversor", "Inverter maximum PV power", "Potencia FV m\xE1xima del inversor"),
    fixed(installedKWp) + " / " + fixed(v.inverterDCW / 1e3) + " kWp"
  );
  check(
    "energy",
    dailyGeneration + 1e-5 >= targetDaily,
    say("Atendimento da meta energ\xE9tica", "Energy target coverage", "Cobertura del objetivo energ\xE9tico"),
    fixed(dailyGeneration) + " \u2265 " + fixed(targetDaily) + " kWh/dia"
  );
  check(
    "dc-cable",
    dcDropPercent <= v.dcDrop && dcIz >= dcCurrent && (!fuseNeeded || !!fuseA && fuseA <= dcIz),
    say("Cabo da string e coordena\xE7\xE3o da prote\xE7\xE3o", "String cable and protection coordination", "Cable de cadena y coordinaci\xF3n de protecci\xF3n"),
    "\u0394V " + fixed(dcDropPercent) + "% / " + fixed(v.dcDrop) + "% \xB7 Iz " + fixed(dcIz) + " A \u2265 Ib " + fixed(dcCurrent) + " A"
  );
  check(
    "fuse",
    !fuseNeeded || fuseA !== null,
    say("Prote\xE7\xE3o gPV e limite do m\xF3dulo", "gPV protection and module limit", "Protecci\xF3n gPV y l\xEDmite del m\xF3dulo"),
    "Irev " + fixed(reverseA) + " A \xB7 Irev,adm " + fixed(v.moduleReverse) + " A \xB7 In " + (fuseA ?? "\u2014") + " A \xB7 m\xE1x " + v.moduleFuse + " A"
  );
  check(
    "ac-protection",
    !!acBreakerA && acBreakerA <= acIz && acDropPercent <= v.acDrop,
    say("Circuito CA e disjuntor", "AC circuit and circuit breaker", "Circuito CA e interruptor"),
    "Ib " + fixed(acCurrent) + " A \u2264 In " + (acBreakerA ?? "\u2014") + " A \u2264 Iz " + fixed(acIz) + " A \xB7 \u0394V " + fixed(acDropPercent) + "%"
  );
  if (storage) {
    check(
      "battery-port",
      p.hasBatteryPort && v.batteryV >= v.batteryMinV && v.batteryV <= v.batteryMaxV && Math.abs(batterySeries * v.unitV - v.batteryV) < 0.01 && batterySeries <= v.batterySeriesMax,
      say("Compatibilidade do banco e porta de bateria", "Battery bank and battery port compatibility", "Compatibilidad del banco y puerto de bater\xEDa"),
      batterySeries + "S \xD7 " + batteryParallel + "P \xB7 " + fixed(v.batteryV) + " V \xB7 faixa " + v.batteryMinV + "\u2013" + v.batteryMaxV + " V"
    );
    check(
      "battery-energy",
      batteryUsableKwh >= criticalDaily * v.autonomyDays && criticalDaily > 0,
      say("Autonomia energ\xE9tica calculada", "Calculated energy autonomy", "Autonom\xEDa energ\xE9tica calculada"),
      fixed(batteryUsableKwh) + " \u2265 " + fixed(criticalDaily * v.autonomyDays) + " kWh CA"
    );
    check(
      "battery-current",
      !!batteryFuseA && batteryFuseA <= v.batteryIz && batteryFuseA <= batteryParallel * v.batteryMaxA,
      say("Corrente do banco, BMS e prote\xE7\xE3o principal", "Bank current, BMS and main protection", "Corriente del banco, BMS y protecci\xF3n principal"),
      "Ib " + fixed(batteryCurrent) + " A \xB7 In " + (batteryFuseA ?? "\u2014") + " A \xB7 Iz " + v.batteryIz + " A"
    );
    if (chargeCurrent > v.chargeA) review(
      "battery-charge-limited",
      say("Verificar limita\xE7\xE3o de carga e tempo de recarga", "Verify charge limiting and recharge time", "Verificar limitaci\xF3n de carga y tiempo de recarga"),
      fixed(chargeCurrent) + " A FV potencial \xB7 limite " + v.chargeA + " A"
    );
    else check(
      "battery-charge",
      true,
      say("Corrente de carga dentro do limite declarado", "Charge current within declared limit", "Corriente de carga dentro del l\xEDmite declarado"),
      fixed(chargeCurrent) + " \u2264 " + v.chargeA + " A"
    );
    check(
      "backup-load",
      p.hasEPS && peakKW <= (p.system === "hybrid" ? v.epsKW : v.inverterKW) && surgeKW <= v.inverterSurgeKW,
      say("Sa\xEDda aut\xF4noma e partida das cargas", "Stand-alone output and starting loads", "Salida aut\xF3noma y arranque de cargas"),
      fixed(peakKW) + " kW \xB7 partida " + fixed(surgeKW) + " kW \xB7 inversor " + v.inverterKW + " kW"
    );
    if (!p.batteryConfirmed) review("battery-datasheet", say("Conferir datasheet, BMS e associa\xE7\xE3o das baterias", "Verify battery datasheet, BMS and configuration", "Verificar ficha de bater\xEDa, BMS y asociaci\xF3n"));
    review("battery-engineering", say("Validar ramais de bateria, curto-circuito e tempo de recarga", "Validate battery branches, short-circuit and recharge time", "Validar ramales de bater\xEDa, cortocircuito y tiempo de recarga"));
  }
  if (installedKWp > v.inverterKW) review(
    "inverter-clipping",
    say("Avaliar clipping e perfil hor\xE1rio do inversor", "Assess inverter clipping and hourly profile", "Evaluar clipping y perfil horario del inversor"),
    "CC/CA " + fixed(installedKWp / v.inverterKW)
  );
  if (p.solarMode !== "manual" && !climateMatches) check(
    "solar-location",
    false,
    say("A climatologia deve corresponder \xE0s coordenadas", "Climatology must match the coordinates", "La climatolog\xEDa debe coincidir con las coordenadas"),
    "HSP manual de conting\xEAncia \xB7 atualizar consulta"
  );
  if (!p.locationConfirmed) review("location", say("Confirmar as coordenadas da instala\xE7\xE3o", "Confirm installation coordinates", "Confirmar las coordenadas de instalaci\xF3n"));
  if (!p.moduleConfirmed) review("module-datasheet", say("Conferir os valores do m\xF3dulo no datasheet", "Verify module values against its datasheet", "Verificar datos del m\xF3dulo en su ficha t\xE9cnica"));
  if (!p.inverterConfirmed) review("inverter-datasheet", say("Conferir inversor, MPPT e fun\xE7\xF5es de opera\xE7\xE3o no datasheet", "Verify inverter, MPPT and operating modes against its datasheet", "Verificar inversor, MPPT y modos de operaci\xF3n en la ficha t\xE9cnica"));
  if (p.solarMode === "manual" || !monthlyPOA) review("solar-manual", say("HSP manual adotada como premissa do estudo", "Manual peak sun hours used as a study assumption", "HSP manual adoptada como supuesto del estudio"), fixed(hsp) + " h/dia");
  if (storage && p.solarMode !== "worst") review("solar-seasonality", say("Avaliar o m\xEAs cr\xEDtico e a continuidade do suprimento", "Assess the critical month and supply continuity", "Evaluar el mes cr\xEDtico y la continuidad del suministro"));
  review("site-engineering", say("Validar m\xE9todo de instala\xE7\xE3o, DPS, aterramento e capacidade de interrup\xE7\xE3o", "Validate installation method, surge protection, earthing and interrupting capacity", "Validar instalaci\xF3n, protecci\xF3n contra sobretensiones, tierra y poder de corte"));
  return {
    checks,
    hsp,
    monthlyPOA,
    dailyLoad,
    criticalDaily,
    peakKW,
    surgeKW,
    targetDaily,
    requiredKWp,
    recommendedInverterKW: Math.max(installedKWp / v.dcAc, storage ? peakKW : 0),
    modules,
    ns,
    strings,
    distribution,
    installedKWp,
    dailyGeneration,
    monthlyGeneration: dailyGeneration * v.days,
    vocCold,
    vmpHot,
    vmpCold,
    vocHot,
    stringVoc,
    stringVmpHot,
    dcCurrent,
    mpptCurrent,
    mpptShortCircuit,
    fuseA,
    fuseNeeded,
    reverseA,
    dcIz,
    dcResistance,
    dcDropV,
    dcDropPercent,
    recommendedSection,
    rho,
    acCurrent,
    acBreakerA,
    acIz,
    acDropV,
    acDropPercent,
    batteryNeededKwh,
    batterySeries,
    batteryParallel,
    batteryUnits,
    batteryKwh,
    batteryUsableKwh,
    batteryCurrent,
    batteryFuseA,
    chargeCurrent,
    roofArea: modules * v.moduleArea
  };
}
export {
  annualMean,
  bestAnnualTilt,
  cableSections,
  calculatePV,
  newPVProject,
  parsePowerClimate,
  pvDefaults,
  pvId,
  pvLimits,
  tiltedIrradiation,
  validPVInputs,
  validPVProject
};
