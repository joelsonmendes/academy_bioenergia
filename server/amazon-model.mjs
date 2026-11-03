// src/amazon-engine.ts
var benchDefaults = { source: "solar", series: 2, parallel: 2, irradiance: 800, cellTemp: 45, windSpeed: 7, rotorDiameter: 3, length: 12, section: 6, cableTemp: 40, batteryV: 48, batteryAh: 200, soc: 70, loadW: 1200, inverterW: 3e3, controllerA: 40 };
var benchRanges = { series: [1, 6], parallel: [1, 4], irradiance: [0, 1200], cellTemp: [0, 85], windSpeed: [0, 20], rotorDiameter: [1, 8], length: [1, 100], section: [1.5, 50], cableTemp: [20, 90], batteryV: [24, 48], batteryAh: [20, 1e3], soc: [20, 95], loadW: [0, 1e4], inverterW: [500, 1e4], controllerA: [5, 150] };
var terminalIds = ["source+", "source-", "mpptPV+", "mpptPV-", "mpptBAT+", "mpptBAT-", "bat+", "bat-", "invDC+", "invDC-", "invL", "invN", "loadL", "loadN"];
var referenceWires = [["source+", "mpptPV+"], ["source-", "mpptPV-"], ["mpptBAT+", "bat+"], ["mpptBAT-", "bat-"], ["bat+", "invDC+"], ["bat-", "invDC-"], ["invL", "loadL"], ["invN", "loadN"]];
function validBenchInput(p) {
  return !!p && ["solar", "wind"].includes(p.source) && Object.entries(benchRanges).every(([k, [min, max]]) => Number.isFinite(p[k]) && Number(p[k]) >= min && Number(p[k]) <= max) && Number.isInteger(p.series) && Number.isInteger(p.parallel) && [24, 48].includes(p.batteryV);
}
function evaluateBench(p, wires, fault = "none") {
  if (!validBenchInput(p) || !Array.isArray(wires) || wires.length > 24 || wires.some((w) => !Array.isArray(w) || w.length !== 2 || w[0] === w[1] || w.some((t) => !terminalIds.includes(t)))) throw new RangeError("Invalid bench parameters or connections");
  const groups = new Map(terminalIds.map((id) => [id, id]));
  const find = (x) => groups.get(x) === x ? x : find(groups.get(x));
  for (const [a, b] of wires) groups.set(find(a), find(b));
  const linked = (a, b) => find(a) === find(b);
  const short = fault === "short" || linked("source+", "source-") || linked("bat+", "bat-") || linked("invL", "invN");
  const reverse = fault === "reverse" || linked("source+", "mpptPV-") || linked("source-", "mpptPV+") || linked("bat+", "mpptBAT-") || linked("bat-", "mpptBAT+");
  const circuitGroups = [["source+", "mpptPV+"], ["source-", "mpptPV-"], ["mpptBAT+", "bat+", "invDC+"], ["mpptBAT-", "bat-", "invDC-"], ["invL", "loadL"], ["invN", "loadN"]];
  const unexpected = wires.some(([a, b]) => !circuitGroups.some((group) => group.includes(a) && group.includes(b)));
  const unsafe = short || reverse || unexpected;
  const sourceConnected = linked("source+", "mpptPV+") && linked("source-", "mpptPV-") && fault !== "open" && !unsafe;
  const controllerConnected = linked("bat+", "mpptBAT+") && linked("bat-", "mpptBAT-") && !unsafe;
  const inverterConnected = linked("bat+", "invDC+") && linked("bat-", "invDC-") && !unsafe;
  const loadConnected = linked("invL", "loadL") && linked("invN", "loadN") && fault !== "fuse" && !unsafe;
  const connected = sourceConnected && controllerConnected && inverterConnected && loadConnected;
  const tempFactor = 1 - 35e-4 * (p.cellTemp - 25), irr = p.irradiance / 1e3;
  const solarVmp = 41 * tempFactor * p.series, solarVoc = 49.5 * tempFactor * p.series;
  const solarImp = 550 / 41 * irr * p.parallel, solarIsc = 14.3 * irr * p.parallel;
  const windW = p.windSpeed < 3 || p.windSpeed >= 20 ? 0 : 0.5 * 1.225 * Math.PI * (p.rotorDiameter / 2) ** 2 * p.windSpeed ** 3 * 0.35 * 0.9;
  const sourceV = p.source === "solar" ? irr > 0 ? solarVmp : 0 : windW > 0 ? p.windSpeed * 12 : 0, sourceVoc = p.source === "solar" ? irr > 0 ? solarVoc : 0 : sourceV * 1.15;
  const sourceI = p.source === "solar" ? solarImp : sourceV > 0 ? windW / sourceV : 0, sourceIsc = p.source === "solar" ? solarIsc : sourceI * 1.2;
  const sourceW = sourceV * sourceI, resistance = 2 * 0.0175 * (1 + 393e-5 * (p.cableTemp - 20)) * p.length / p.section;
  const dropV = sourceI * resistance, dropPct = sourceV > 0 ? 100 * dropV / sourceV : 0, cableLossW = sourceI ** 2 * resistance;
  const mpptV = Math.max(0, sourceV - dropV), batteryV = p.batteryV * (0.94 + 0.12 * p.soc / 100);
  const pvOver = sourceVoc > 150, pvLow = sourceI > 0 && mpptV < batteryV + 5;
  const demand = p.loadW * (fault === "overload" ? 4 : 1), overload = demand > p.inverterW;
  let controllerW = !sourceConnected || !controllerConnected || pvOver || pvLow ? 0 : Math.min(Math.max(0, sourceW - cableLossW) * 0.96, p.controllerA * batteryV);
  const inverterOn = inverterConnected && !overload && (p.soc > 20 || controllerW > 0);
  const outputW = !inverterOn || !loadConnected ? 0 : p.soc <= 20 ? Math.min(demand, controllerW * 0.92) : demand;
  if (p.soc >= 95) controllerW = Math.min(controllerW, outputW / 0.92);
  const outputV = inverterOn ? 220 : 0, batteryW = controllerW - outputW / 0.92;
  const chargeW = p.soc >= 95 ? 0 : Math.max(0, batteryW), dischargeW = Math.max(0, -batteryW);
  const codes = [];
  if (short) codes.push("short");
  else if (reverse) codes.push("reverse");
  else if (unexpected) codes.push("wiring");
  else if (!connected && fault !== "fuse") codes.push("open");
  if (fault === "fuse") codes.push("fuse");
  if (pvOver) codes.push("pvVoltage");
  if (pvLow) codes.push("pvLow");
  if (overload) codes.push("overload");
  if (dropPct > 3) codes.push("drop");
  if (controllerW >= p.controllerA * batteryV - 1 && sourceW > 0) codes.push("controllerLimit");
  if (p.soc <= 20) codes.push("socLow");
  if (!codes.length) codes.push("ready");
  const curve = Array.from({ length: 81 }, (_, k) => {
    const v = sourceVoc * k / 80;
    let i = 0;
    if (sourceVoc > 0 && sourceV > 0) i = v <= sourceV ? sourceIsc - (sourceIsc - sourceI) * v / sourceV : sourceI * (sourceVoc - v) / (sourceVoc - sourceV);
    return { v, i: Math.max(0, i), p: v * Math.max(0, i) };
  });
  const slope = sourceI > 0 ? (sourceVoc - sourceV) / sourceI : 0, coefficient = slope + resistance;
  const drawI = controllerW > 0 && coefficient > 0 ? (sourceVoc - Math.sqrt(Math.max(0, sourceVoc ** 2 - 4 * coefficient * controllerW / 0.96))) / (2 * coefficient) : 0;
  const sourceOperatingV = Math.max(0, sourceVoc - slope * drawI);
  return { sourceV, sourceVoc, sourceI, sourceIsc, sourceW, sourceOperatingV, drawI, mpptV: Math.max(0, sourceOperatingV - drawI * resistance), controllerW, resistance, dropV, dropPct, cableLossW: drawI ** 2 * resistance, batteryV, batteryW, chargeW, dischargeW, outputV, outputW, outputA: outputV ? outputW / outputV : 0, outputVA: outputW, connected, sourceConnected, controllerConnected, inverterConnected, loadConnected, tripped: unsafe || overload || fault === "fuse", codes, curve, socAfter10min: Math.max(20, Math.min(95, p.soc + 100 * (chargeW * 0.95 - dischargeW / 0.95) / 6 / (p.batteryV * p.batteryAh))) };
}
function measureVoltage(r, a, b, mode) {
  const ac = /* @__PURE__ */ new Set(["invL", "invN", "loadL", "loadN"]);
  if (mode === "ac") {
    if (!ac.has(a) || !ac.has(b)) return { value: null, reason: "domain" };
    if (!r.loadConnected && (a.startsWith("load") || b.startsWith("load"))) return { value: null, reason: "floating" };
    const aL = a.endsWith("L"), bL = b.endsWith("L");
    return { value: a === b || aL === bL ? 0 : r.outputV, reason: "ok" };
  }
  if (ac.has(a) || ac.has(b)) return { value: null, reason: "domain" };
  if (r.codes.includes("short") || r.codes.includes("reverse") || r.codes.includes("wiring")) return { value: null, reason: "floating" };
  const battery = /* @__PURE__ */ new Set(["bat+", "bat-", "mpptBAT+", "mpptBAT-", "invDC+", "invDC-"]);
  const source = /* @__PURE__ */ new Set(["source+", "source-", "mpptPV+", "mpptPV-"]);
  if (battery.has(a) && battery.has(b)) {
    if ((a.startsWith("inv") || b.startsWith("inv")) && !r.inverterConnected || (a.startsWith("mppt") || b.startsWith("mppt")) && !r.controllerConnected) return { value: null, reason: "floating" };
    return { value: (a.endsWith("+") ? 1 : 0) * r.batteryV - (b.endsWith("+") ? 1 : 0) * r.batteryV, reason: "ok" };
  }
  if (source.has(a) && source.has(b)) {
    if (!r.sourceConnected && (!a.startsWith("source") || !b.startsWith("source"))) return { value: null, reason: "floating" };
    return { value: ((a.endsWith("+") ? 1 : 0) - (b.endsWith("+") ? 1 : 0)) * r.sourceOperatingV, reason: "ok" };
  }
  return { value: null, reason: "floating" };
}
var hybridDefaults = { pvKWp: 3, sunHours: 4, performance: 0.78, batteryKWh: 8, batteryKW: 3, socStart: 60, socMin: 20, socMax: 95, etaCharge: 0.95, etaDischarge: 0.95, inverterKW: 3, generatorKW: 3, generatorMin: 0.3, fuelLiters: 12, fuelIdle: 0.25, fuelSlope: 0.28, reserveSOC: 40, strategy: "battery-first" };
var schoolLoads = [{ id: "light", label: "Ilumina\xE7\xE3o LED", watts: 9, quantity: 12, start: 6, end: 18, duty: 1 }, { id: "fans", label: "Ventiladores", watts: 60, quantity: 4, start: 8, end: 17, duty: 1 }, { id: "notebooks", label: "Notebooks", watts: 45, quantity: 10, start: 8, end: 14, duty: 1 }, { id: "cold", label: "Refrigerador (ciclo m\xE9dio)", watts: 120, quantity: 1, start: 0, end: 24, duty: 0.35 }, { id: "router", label: "Roteador", watts: 12, quantity: 1, start: 0, end: 24, duty: 1 }, { id: "pump", label: "Bomba (pot\xEAncia ativa suposta)", watts: 500, quantity: 1, start: 10, end: 11, duty: 1 }];
var communityLoads = [{ id: "light", label: "Ilumina\xE7\xE3o comunit\xE1ria", watts: 12, quantity: 20, start: 18, end: 6, duty: 1 }, { id: "cold", label: "Refrigera\xE7\xE3o (ciclo m\xE9dio)", watts: 180, quantity: 3, start: 0, end: 24, duty: 0.4 }, { id: "water", label: "Bomba de \xE1gua", watts: 1100, quantity: 1, start: 9, end: 12, duty: 1 }, { id: "comms", label: "Comunica\xE7\xE3o", watts: 50, quantity: 1, start: 0, end: 24, duty: 1 }, { id: "work", label: "Oficina / cargas diversas", watts: 300, quantity: 2, start: 8, end: 17, duty: 0.6 }];
var hybridRanges = { pvKWp: [0, 50], sunHours: [0, 8], performance: [0.4, 1], batteryKWh: [1, 200], batteryKW: [0.2, 50], socStart: [10, 100], socMin: [10, 50], socMax: [60, 100], etaCharge: [0.7, 1], etaDischarge: [0.7, 1], inverterKW: [0.5, 50], generatorKW: [0, 50], generatorMin: [0.1, 0.6], fuelLiters: [0, 500], fuelIdle: [0.05, 5], fuelSlope: [0.1, 1], reserveSOC: [20, 80] };
function validLoad(row) {
  return row && typeof row.id === "string" && row.id.length < 80 && typeof row.label === "string" && row.label.length <= 100 && Number.isFinite(row.watts) && row.watts >= 0 && row.watts <= 2e4 && Number.isInteger(row.quantity) && row.quantity >= 1 && row.quantity <= 100 && Number.isInteger(row.start) && row.start >= 0 && row.start <= 23 && Number.isInteger(row.end) && row.end >= 0 && row.end <= 24 && Number.isFinite(row.duty) && row.duty >= 0 && row.duty <= 1;
}
function validHybridInput(p) {
  return !!p && ["battery-first", "reserve"].includes(p.strategy) && Object.entries(hybridRanges).every(([k, [min, max]]) => Number.isFinite(p[k]) && Number(p[k]) >= min && Number(p[k]) <= max) && p.socStart >= p.socMin && p.socStart <= p.socMax && p.reserveSOC >= p.socMin && p.reserveSOC <= p.socMax;
}
function hourlyLoads(loads) {
  if (!Array.isArray(loads) || loads.length > 30 || loads.some((row) => !validLoad(row))) throw new RangeError("Invalid loads");
  return Array.from({ length: 24 }, (_, h) => loads.reduce((sum, row) => sum + ((row.start === row.end ? false : row.start < row.end ? h >= row.start && h < row.end : h >= row.start || h < row.end) ? row.watts * row.quantity * row.duty / 1e3 : 0), 0));
}
function dispatchHybrid(p, loads) {
  if (!validHybridInput(p)) throw new RangeError("Invalid hybrid parameters");
  const demand = hourlyLoads(loads), shape = Array.from({ length: 24 }, (_, h) => Math.max(0, Math.sin(Math.PI * (h + 0.5 - 6) / 12)) * (h >= 6 && h < 18 ? 1 : 0)), shapeSum = shape.reduce((a, b) => a + b, 0);
  let stored = p.batteryKWh * p.socStart / 100, fuel = p.fuelLiters, runningHours = 0;
  const min = p.batteryKWh * p.socMin / 100, max = p.batteryKWh * p.socMax / 100;
  const rows = [];
  for (let h = 0; h < 24; h++) {
    const pv = p.pvKWp * p.sunHours * p.performance * shape[h] / shapeSum;
    const inverterPV = Math.min(pv, p.inverterKW), pvDirect = Math.min(demand[h], inverterPV);
    const floor = p.strategy === "reserve" ? Math.max(min, p.batteryKWh * p.reserveSOC / 100) : min;
    const batteryOut = Math.min(Math.max(0, demand[h] - pvDirect), Math.max(0, stored - floor) * p.etaDischarge, p.batteryKW, Math.max(0, p.inverterKW - pvDirect));
    stored -= batteryOut / p.etaDischarge;
    let surplusPV = inverterPV - pvDirect;
    const pvCharge = Math.min(surplusPV, p.batteryKW, Math.max(0, max - stored) / p.etaCharge);
    stored += pvCharge * p.etaCharge;
    const deficit = Math.max(0, demand[h] - pvDirect - batteryOut);
    const reserveNeed = p.strategy === "reserve" ? Math.max(0, p.batteryKWh * p.reserveSOC / 100 - stored) / p.etaCharge : 0;
    const shouldRun = (deficit > 1e-9 || reserveNeed > 1e-9) && p.generatorKW > 0 && fuel > 0;
    const setpoint = shouldRun ? Math.min(p.generatorKW, Math.max(deficit + Math.min(reserveNeed, p.batteryKW - pvCharge), p.generatorKW * p.generatorMin)) : 0;
    const fullFuel = setpoint > 0 ? p.fuelIdle + p.fuelSlope * setpoint : 0;
    const runtime = fullFuel > 0 ? Math.min(1, fuel / fullFuel) : 0, usedFuel = runtime * fullFuel, diesel = setpoint * runtime;
    fuel = Math.max(0, fuel - usedFuel);
    runningHours += runtime;
    const dieselDirect = Math.min(deficit, diesel), genSurplus = diesel - dieselDirect;
    const dieselCharge = Math.min(genSurplus, Math.max(0, p.batteryKW - pvCharge), Math.max(0, max - stored) / p.etaCharge);
    stored += dieselCharge * p.etaCharge;
    stored = Math.max(min, Math.min(max, stored));
    const charge = pvCharge + dieselCharge, unserved = Math.max(0, deficit - dieselDirect), curtailed = pv - pvDirect - pvCharge, dumped = genSurplus - dieselCharge;
    const balanceError = pv + diesel + batteryOut - (demand[h] - unserved + charge + curtailed + dumped);
    rows.push({ hour: h, load: demand[h], pv, pvDirect, diesel, dieselDirect, batteryOut, charge, soc: 100 * stored / p.batteryKWh, fuel: usedFuel, unserved, curtailed, dumped, balanceError });
  }
  const sum = (k) => rows.reduce((n, row) => n + row[k], 0);
  const baseline = demand.reduce((n, kw) => {
    if (kw <= 0 || p.generatorKW <= 0) return n;
    const output = Math.min(p.generatorKW, Math.max(kw, p.generatorKW * p.generatorMin));
    return n + p.fuelIdle + p.fuelSlope * output;
  }, 0);
  return { rows, loadKWh: sum("load"), servedKWh: sum("load") - sum("unserved"), unservedKWh: sum("unserved"), pvKWh: sum("pv"), solarUsedKWh: sum("pvDirect") + rows.reduce((n, row) => n + (row.pv - row.pvDirect - row.curtailed), 0), dieselKWh: sum("diesel"), dieselLiters: sum("fuel"), fuelRemaining: fuel, generatorHours: runningHours, curtailedKWh: sum("curtailed"), chargeKWh: sum("charge"), dischargeKWh: sum("batteryOut"), socFinal: 100 * stored / p.batteryKWh, socInitial: p.socStart, storageChangeKWh: stored - p.batteryKWh * p.socStart / 100, storageLossKWh: sum("charge") * (1 - p.etaCharge) + sum("batteryOut") * (1 / p.etaDischarge - 1), maxLoadKW: Math.max(0, ...demand), maxBalanceError: Math.max(...rows.map((row) => Math.abs(row.balanceError))), baselineDieselLiters: baseline };
}
var casePresets = { school: { input: { ...hybridDefaults }, loads: schoolLoads }, community: { input: { ...hybridDefaults, pvKWp: 8, batteryKWh: 24, inverterKW: 5, generatorKW: 5, batteryKW: 5 }, loads: communityLoads }, rain: { input: { ...hybridDefaults, sunHours: 1.5, fuelLiters: 2 }, loads: schoolLoads } };
export {
  benchDefaults,
  benchRanges,
  casePresets,
  communityLoads,
  dispatchHybrid,
  evaluateBench,
  hourlyLoads,
  hybridDefaults,
  hybridRanges,
  measureVoltage,
  referenceWires,
  schoolLoads,
  terminalIds,
  validBenchInput,
  validHybridInput,
  validLoad
};
