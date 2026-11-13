export const limits = {
  watts: 450, vmp: 41, voc: 49.5, temperatureCoefficient: -.0035, acV: 220,
  gridEfficiency: .96, gridLimit: 3000, mpptEfficiency: .96, inverterEfficiency: .92,
  hybridEfficiency: .95, hybridGridLimit: 3000, hybridBackupLimit: 1500,
  islandLimit: 1500, batteryV: 48, batteryWh: 4800, batteryW: 1920, batteryEfficiency: .95,
  socMin: 20, socMax: 95, stepHours: 1 / 6
};

export const modules = {min: 1, max: 12, defaults: {grid: 6, island: 3, hybrid: 6}};
export const pvInputs = {
  grid: {minV: 150, maxV: 400, maxVoc: 500},
  island: {minV: 60, maxV: 145, maxVoc: 150},
  hybrid: {minV: 120, maxV: 430, maxVoc: 500}
};
export const boardWidth = 1120;

export const conductor = {
  plus: {label: 'CC +', color: '#bd4333'},
  minus: {label: 'CC −', color: '#344457'},
  series: {label: 'Série FV', color: '#785192'},
  l1: {label: 'CA · L1', color: '#a2641e'},
  l2: {label: 'CA · L2', color: '#305cb6'},
  pe: {label: 'PE', color: '#19734f'},
  invalid: {label: 'Ligação incorreta', color: '#c72c63'}
};
export const pairKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;

const terminals = (definitions) => definitions.map(([id, mark, domain, x, y, side, name]) =>
  ({id, mark, domain, x, y, side, name}));
const port = (id, mark, domain, x, y, side, name) => [id, mark, domain, x, y, side, name];

function component(id, title, asset, box, connections, description) {
  return {id, title, asset, box, connections: terminals(connections), description};
}

function solarModules(count) {
  return Array.from({length: count}, (_, index) => {
    const x = 51 + 159 * (index % 6), top = 48 + 200 * Math.floor(index / 6);
    const id = 'm' + (index + 1), bottom = top + 120;
    return component(id, 'Módulo ' + (index + 1), 'pv', [x, top, 111, 120], [
      port(id + '-', '−', 'dc', x + 31, bottom, 'bottom', 'polo negativo'),
      port(id + '+', '+', 'dc', x + 80, bottom, 'bottom', 'polo positivo')
    ], 'O módulo converte luz em eletricidade CC. Na série desta prática, as tensões dos módulos se somam e a corrente é comum.');
  });
}

export function makeCircuit(mode, count = modules.defaults[mode]) {
  const grid = mode === 'grid';
  const island = mode === 'island';
  const hybrid = mode === 'hybrid';
  const solar = solarModules(count);
  const arrayOffset = solar.at(-1).box[1] - 48;
  const compactIsland = island && count <= 3;
  const lowerOffset = arrayOffset + (island && !compactIsland ? 176 : 0);
  const y = value => value + lowerOffset;
  const height = y(hybrid ? 735 : 618);
  const frameX = compactIsland ? 537 : 1051;
  const frameY = 108 + arrayOffset;
  const inverterX = hybrid ? 342 : grid ? 322 : 510;
  const inverterW = hybrid ? 214 : grid ? 168 : 164;
  const inverterRight = inverterX + inverterW;
  const inverterBottom = hybrid ? 450 : 436;
  const inverterPe = hybrid ? 520 : inverterX + 83;
  const panelX = hybrid ? 655 : grid ? 610 : 764;
  const panelW = hybrid ? 155 : grid ? 160 : 145;
  const panelRight = panelX + panelW;
  const panelPe = hybrid ? 711 : panelX + 64;
  const earthY = hybrid ? 643 : 527;
  const earthPanel = hybrid ? 586 : grid ? 581 : 691;
  const peFrame = island ? 751 : 756;
  const loadX = hybrid ? 952 : grid ? 922 : 971;
  const loadTop = hybrid ? 499 : grid ? 408 : 290;
  const loadL1 = hybrid ? 528 : grid ? 444 : 335;
  const loadL2 = hybrid ? 560 : grid ? 475 : 369;
  const inverterL1 = hybrid ? 309 : 335;
  const inverterL2 = hybrid ? 342 : 369;
  const batteryX = hybrid ? 321 : 688;
  const batteryTop = hybrid ? y(494) : compactIsland ? 47 : y(70);
  const batteryH = hybrid ? 110 : 122;
  const batteryPortY = hybrid ? batteryTop : batteryTop + batteryH;
  const batteryPlus = hybrid ? 367 : 741;
  const batteryMinus = hybrid ? 452 : 875;
  const ac = (id, mark, x, at, side, name) => port(id, mark, 'ac', x, y(at), side, name);
  const dc = (id, mark, x, at, side, name) => port(id, mark, 'dc', x, y(at), side, name);
  const pe = (id, x, at, side, name) => port(id, 'PE', 'pe', x, y(at), side, name);
  const items = [
    ...solar,
    component('frame', 'Estrutura FV', null, [frameX - 35, frameY, 70, 47],
      [port('frame-pe', 'PE', 'pe', frameX, frameY + 47, 'bottom', 'estrutura')],
      'Representa a equipotencialização coletiva da estrutura metálica dos módulos.'),
    component('box', 'Quadro CC', 'box', [61, y(278), 164, 158], [
      dc('box-in-', '−', 93, 278, 'top', 'entrada FV −'),
      dc('box-in+', '+', 164, 278, 'top', 'entrada FV +'),
      dc('box-out+', '+', 225, 334, 'right', 'saída CC +'),
      dc('box-out-', '−', 225, 369, 'right', 'saída CC −'),
      pe('box-pe', 142, 436, 'bottom', 'carcaça')
    ], 'Neste modelo, o seccionamento CC abre os dois polos entre a string e a entrada do conversor.'),
    component('inverter', hybrid ? 'Inversor híbrido' : grid ? 'Inversor on-grid' : 'Inversor off-grid',
      hybrid ? 'hybridInv' : grid ? 'gridInv' : 'islandInv', [inverterX, y(278), inverterW, inverterBottom - 278], [
        ...(island ? [
          dc('inv-in+', '+', inverterX + 50, 278, 'top', 'entrada bateria +'),
          dc('inv-in-', '−', inverterX + 108, 278, 'top', 'entrada bateria −')
        ] : [
          dc('inv-in+', '+', inverterX, 334, 'left', 'entrada FV +'),
          dc('inv-in-', '−', inverterX, 369, 'left', 'entrada FV −')
        ]),
        ac('inv-l1', 'L1', inverterRight, inverterL1, 'right', hybrid ? 'porta CA de rede · L1' : 'saída CA · L1'),
        ac('inv-l2', 'L2', inverterRight, inverterL2, 'right', hybrid ? 'porta CA de rede · L2' : 'saída CA · L2'),
        ...(hybrid ? [
          ac('inv-eps1', 'L1', inverterRight, 391, 'right', 'saída EPS · L1'),
          ac('inv-eps2', 'L2', inverterRight, 423, 'right', 'saída EPS · L2'),
          dc('inv-bat+', '+', batteryPlus, inverterBottom, 'bottom', 'porta de bateria +'),
          dc('inv-bat-', '−', batteryMinus, inverterBottom, 'bottom', 'porta de bateria −')
        ] : []),
        pe('inv-pe', inverterPe, inverterBottom, 'bottom', 'carcaça')
      ], hybrid ? 'O inversor tem entradas FV e de bateria, porta CA de rede e saída de emergência (EPS). Durante o backup, a porta de rede fica isolada da saída EPS.'
        : grid ? 'Converte CC em CA e depende da rede simulada para injetar potência. Ao retirar a rede, a geração CA é interrompida.'
          : 'Converte a energia do barramento CC em CA para uma carga isolada. A bateria pode sustentar a carga com o campo FV desligado.'),
    component('panel', hybrid ? 'Quadro da rede' : 'Quadro CA', 'breaker',
      [panelX, y(hybrid ? 276 : 278), panelW, hybrid ? 129 : 158], [
        ac('panel-in1', 'L1', panelX, inverterL1, 'left', 'ramal do inversor · L1'),
        ac('panel-in2', 'L2', panelX, inverterL2, 'left', 'ramal do inversor · L2'),
        ...(!island ? [
          ac('panel-grid1', 'L1', panelRight, hybrid ? 296 : 309, 'right', 'rede · L1'),
          ac('panel-grid2', 'L2', panelRight, hybrid ? 331 : 340, 'right', 'rede · L2')
        ] : []),
        ac('panel-load1', 'L1', panelRight, hybrid ? 369 : grid ? 379 : 335, 'right', 'carga · L1'),
        ac('panel-load2', 'L2', panelRight, hybrid ? 402 : grid ? 410 : 369, 'right', 'carga · L2'),
        pe('panel-pe', panelPe, hybrid ? 405 : 436, 'bottom', 'barra de proteção')
      ], hybrid ? 'Alimenta a carga comum enquanto a rede está disponível. O disjuntor do inversor abre seu ramal CA sem desligar o ramal da carga comum.'
        : grid ? 'O disjuntor virtual interrompe o ramal do inversor. Com rede e ramal da carga conectados, a rede ainda pode atender a carga.'
          : 'O disjuntor virtual interrompe os dois condutores da saída do inversor para a carga.'),
    component('load', hybrid ? 'Carga crítica' : 'Carga resistiva', 'lamp',
      [loadX, y(loadTop), 120, hybrid ? 103 : grid ? 108 : 132], [
        ac('load-l1', 'L1', loadX, loadL1, 'left', 'entrada CA · L1'),
        ac('load-l2', 'L2', loadX, loadL2, 'left', 'entrada CA · L2')
      ], hybrid ? 'A carga crítica está no quadro de backup. Quando a rede cai, a alimentação depende da potência solar, do banco de baterias e dos limites da saída EPS.'
        : 'A carga de fator de potência unitário representa o consumo ajustável do ensaio. A lâmpada indica potência entregue.'),
    component('earth', 'Barramento de proteção · PE', 'earth', [72, y(earthY), 724, 76], [
      pe('earth-box', 142, earthY, 'top', 'equipotencialização do quadro CC'),
      pe('earth-inv', inverterPe, earthY, 'top', 'equipotencialização do inversor'),
      pe('earth-panel', earthPanel, earthY, 'top', 'equipotencialização do quadro CA'),
      ...(hybrid ? [pe('earth-eps', 711, earthY, 'top', 'equipotencialização do quadro de backup')] : []),
      pe('earth-frame', peFrame, earthY, 'top', 'equipotencialização da estrutura')
    ], 'O PE é avaliado por continuidade até este barramento. O ensaio não calcula resistência de aterramento ou corrente de falta.')
  ];
  if (!island) {
    items.push(component('grid', 'Medidor / rede', 'meter', [loadX, y(hybrid ? 258 : 248), 120, hybrid ? 103 : 124], [
      ac('grid-l1', 'L1', loadX, hybrid ? 296 : 309, 'left', 'rede virtual · L1'),
      ac('grid-l2', 'L2', loadX, hybrid ? 331 : 340, 'left', 'rede virtual · L2')
    ], 'O medidor representa o ponto de troca com a rede simulada. A plataforma separa potência importada e exportada.'));
  }
  if (island) {
    items.push(component('mppt', 'Controlador MPPT', 'controller', [282, y(278), 157, 158], [
      dc('mppt-pv+', '+', 282, 334, 'left', 'entrada FV +'),
      dc('mppt-pv-', '−', 282, 369, 'left', 'entrada FV −'),
      dc('mppt-bat+', '+', 319, 278, 'top', 'saída para bateria +'),
      dc('mppt-bat-', '−', 394, 278, 'top', 'saída para bateria −')
    ], 'Representa um controlador MPPT genérico no modelo. A carga da bateria depende da string, da faixa de entrada e da continuidade do ramal.'));
  }
  if (!grid) {
    const batterySide = hybrid ? 'top' : 'bottom';
    items.push(component('battery', 'Banco de baterias', 'battery', [batteryX, batteryTop, hybrid ? 184 : 258, batteryH], [
      port('bat+', '+', 'dc', batteryPlus, batteryPortY, batterySide, 'barramento positivo'),
      port('bat-', '−', 'dc', batteryMinus, batteryPortY, batterySide, 'barramento negativo')
    ], 'A foto identifica a classe do equipamento. O banco virtual é de 48 V e 4,8 kWh. O SOC varia ao avançar o tempo simulado.'));
  }
  if (hybrid) {
    items.push(
      component('normal', 'Carga comum', 'lamp', [loadX, y(382), 120, 103], [
        ac('normal-l1', 'L1', loadX, 412, 'left', 'entrada CA · L1'),
        ac('normal-l2', 'L2', loadX, 446, 'left', 'entrada CA · L2')
      ], 'Representa as cargas que ficam fora do circuito de backup. Na falta da rede, este ramal fica sem alimentação.'),
      component('eps', 'Quadro de backup · EPS', 'breaker', [655, y(473), 155, 112], [
        ac('eps-in1', 'L1', 655, 503, 'left', 'entrada EPS · L1'),
        ac('eps-in2', 'L2', 655, 536, 'left', 'entrada EPS · L2'),
        ac('eps-out1', 'L1', 810, 503, 'right', 'saída para carga crítica · L1'),
        ac('eps-out2', 'L2', 810, 536, 'right', 'saída para carga crítica · L2'),
        pe('eps-pe', 711, 585, 'bottom', 'barra de proteção')
      ], 'O quadro EPS alimenta as cargas críticas. Durante uma falta da rede, o simulador impede qualquer injeção no ramal externo.')
    );
  }

  const specs = [];
  function cable(a, b, kind, stage, points = []) {
    specs.push({a, b, kind, stage, points, key: pairKey(a, b)});
  }
  const route = (...points) => points.map(([x, at]) => [x, y(at)]);
  for (let index = 1; index < count; index++) {
    const from = solar[index - 1].connections[1];
    const to = solar[index].connections[0];
    const rail = from.y + 22;
    const points = from.y === to.y
      ? [[from.x, rail], [to.x, rail]]
      : [[from.x, rail], [1026, rail], [1026, rail + 38], [32, rail + 38], [32, to.y + 22], [to.x, to.y + 22]];
    cable(from.id, to.id, 'series', 'string', points);
  }
  const negative = !arrayOffset && !lowerOffset
    ? [[82, 235], [93, 235]]
    : [[82, 209], [18, 209], [18, y(235)], [93, y(235)]];
  cable('m1-', 'box-in-', 'minus', 'dcIn', negative);
  const lastPositive = solar.at(-1).connections[1];
  const positiveRail = lastPositive.y + 48;
  cable(lastPositive.id, 'box-in+', 'plus', 'dcIn', [[lastPositive.x, positiveRail], [164, positiveRail]]);
  cable('box-out+', island ? 'mppt-pv+' : 'inv-in+', 'plus', 'dcOut');
  cable('box-out-', island ? 'mppt-pv-' : 'inv-in-', 'minus', 'dcOut');
  if (island) {
    cable('mppt-bat+', 'bat+', 'plus', 'charge', route([319, 244], [741, 244]));
    cable('mppt-bat-', 'bat-', 'minus', 'charge', route([394, 230], [875, 230]));
    cable('bat+', 'inv-in+', 'plus', 'battery', route([741, 251], [560, 251]));
    cable('bat-', 'inv-in-', 'minus', 'battery', route([875, 261], [618, 261]));
  }
  if (hybrid) {
    cable('inv-bat+', 'bat+', 'plus', 'battery');
    cable('inv-bat-', 'bat-', 'minus', 'battery');
  }
  cable('inv-l1', 'panel-in1', 'l1', 'acIn');
  cable('inv-l2', 'panel-in2', 'l2', 'acIn');
  if (!island) {
    cable('panel-grid1', 'grid-l1', 'l1', 'grid');
    cable('panel-grid2', 'grid-l2', 'l2', 'grid');
  }
  if (hybrid) {
    cable('panel-load1', 'normal-l1', 'l1', 'normal', route([853, 369], [853, 412]));
    cable('panel-load2', 'normal-l2', 'l2', 'normal', route([896, 402], [896, 446]));
    cable('inv-eps1', 'eps-in1', 'l1', 'epsOut', route([586, 391], [586, 503]));
    cable('inv-eps2', 'eps-in2', 'l2', 'epsOut', route([618, 423], [618, 536]));
    cable('eps-out1', 'load-l1', 'l1', 'load', route([853, 503], [853, 528]));
    cable('eps-out2', 'load-l2', 'l2', 'load', route([896, 536], [896, 560]));
    cable('eps-pe', 'earth-eps', 'pe', 'pe');
  } else {
    cable('panel-load1', 'load-l1', 'l1', 'load', grid ? route([830, 379], [830, 444]) : []);
    cable('panel-load2', 'load-l2', 'l2', 'load', grid ? route([858, 410], [858, 475]) : []);
  }
  cable('box-pe', 'earth-box', 'pe', 'pe');
  cable('inv-pe', 'earth-inv', 'pe', 'pe');
  cable('panel-pe', 'earth-panel', 'pe', 'pe', hybrid
    ? route([panelPe, 445], [638, 445], [638, 616], [earthPanel, 616])
    : route([panelPe, 469], [earthPanel, 469]));
  cable('frame-pe', 'earth-frame', 'pe', 'pe', compactIsland
    ? [[frameX, 185], [612, 185], [612, 29], [1104, 29], [1104, 498], [peFrame, 498]]
    : [[frameX, frameY + 97], [1096, frameY + 97], [1096, y(earthY - 6)], [peFrame, y(earthY - 6)]]);

  const ports = Object.fromEntries(items.flatMap(item =>
    item.connections.map(connection => [connection.id, {...connection, component: item.id, componentTitle: item.title}])));
  return {mode, count, height, items, ports, specs, byKey: new Map(specs.map(spec => [spec.key, spec]))};
}

export function resizeArrayWires(previous, next, wires) {
  return wires.filter(({a, b}) => {
    if (!next.ports[a] || !next.ports[b]) return false;
    const key = pairKey(a, b);
    return !previous.byKey.has(key) || next.byKey.has(key);
  });
}

export function referenceWires(circuit) {
  return circuit.specs.map(({a, b}) => ({a, b}));
}

export function assess(circuit, wires) {
  const present = new Set(wires.map(({a, b}) => pairKey(a, b)));
  const missing = circuit.specs.filter(spec => !present.has(spec.key));
  const wrong = wires.filter(({a, b}) => !circuit.byKey.has(pairKey(a, b)));
  const missingStages = new Set(missing.map(spec => spec.stage));
  return {missing, wrong, stage: stage => !missingStages.has(stage), correct: circuit.specs.length - missing.length};
}

export function wiringError(circuit, {a, b}) {
  const p = circuit.ports[a], q = circuit.ports[b];
  if (p.domain !== q.domain) return 'Domínios diferentes · mantenha CC, CA e PE separados.';
  if (p.domain === 'pe') return 'PE fora do ponto de referência indicado para este equipamento.';
  const isBackup = terminal => terminal.id.startsWith('inv-eps') || ['eps', 'load'].includes(terminal.component);
  if (circuit.mode === 'hybrid' && p.domain === 'ac' && isBackup(p) !== isBackup(q)) {
    return 'Ramal EPS ligado ao ramal da rede. Mantenha as duas saídas separadas.';
  }
  if (p.component === q.component) return 'Bornes do mesmo equipamento · possível curto virtual.';
  if (p.domain === 'ac' && p.mark !== q.mark) return 'Condutores CA trocados neste exercício.';
  if (p.domain === 'dc' && p.mark !== q.mark) {
    return /^m\d+$/.test(p.component) && /^m\d+$/.test(q.component)
      ? 'A ligação de série não segue a sequência do exercício.'
      : 'Polaridade incompatível neste trecho.';
  }
  return 'Ligação fora do percurso da montagem de referência.';
}

export const defaultControls = () => ({irradiance: 800, temperature: 35, demand: 700, soc: 65,
  normalDemand: 500, dcClosed: true, acClosed: true, epsClosed: true, gridOnline: true});

function batteryBudget(soc) {
  const energyPerPercent = limits.batteryWh / 100;
  const availableCharge = (limits.socMax - soc) * energyPerPercent / limits.stepHours / limits.batteryEfficiency;
  const availableDischarge = (soc - limits.socMin) * energyPerPercent / limits.stepHours * limits.batteryEfficiency;
  return {
    charge: Math.min(limits.batteryW, Math.max(0, availableCharge)),
    discharge: Math.min(limits.batteryW, Math.max(0, availableDischarge))
  };
}

function afterStep(soc, chargeW, dischargeW) {
  const deltaWh = (chargeW * limits.batteryEfficiency - dischargeW / limits.batteryEfficiency) * limits.stepHours;
  return Math.min(limits.socMax, Math.max(limits.socMin, soc + deltaWh / limits.batteryWh * 100));
}

function simulateHybrid(stage, controls, paths, pvW, battery) {
  const {demand, normalDemand, epsClosed, soc} = controls;
  const {cleared, gridAtPanel, acPath, loadPath} = paths;
  const efficiency = limits.hybridEfficiency;
  const gridLinked = gridAtPanel && acPath;
  const batteryConnected = cleared && stage('battery');
  const batteryDischarge = batteryConnected ? battery.discharge : 0;
  const epsPath = cleared && epsClosed && stage('epsOut') && loadPath;
  const limitW = gridLinked ? limits.hybridGridLimit : limits.hybridBackupLimit;
  const availableAcW = Math.min(limitW, (pvW + batteryDischarge) * efficiency);
  const requested = epsPath && (gridLinked || batteryConnected);
  const limited = requested && (demand > limits.hybridBackupLimit || (!gridLinked && demand > availableAcW + 1e-6));
  const loadEnergized = requested && !limited && (gridLinked || availableAcW > 0);
  const loadW = loadEnergized ? demand : 0;
  const normalLoadW = gridAtPanel && stage('normal') ? normalDemand : 0;
  const localDemandW = loadW + (gridLinked ? normalLoadW : 0);
  const localAcW = Math.min(localDemandW, availableAcW);
  const pvForLoadW = Math.min(pvW, localAcW / efficiency);
  const dischargeW = Math.max(0, localAcW / efficiency - pvForLoadW);
  const pvSurplusW = Math.max(0, pvW - pvForLoadW);
  const chargeW = batteryConnected ? Math.min(battery.charge, pvSurplusW) : 0;
  const exportW = gridLinked ? Math.min(limits.hybridGridLimit - localAcW, (pvSurplusW - chargeW) * efficiency) : 0;
  const generationW = localAcW + exportW;

  return {
    generationW, loadW, normalLoadW, chargeW, dischargeW, limited, gridLinked, batteryConnected,
    epsPath, backupActive: !gridLinked && loadEnergized,
    gridBranchW: gridLinked ? generationW - loadW : 0,
    importW: gridAtPanel ? Math.max(0, normalLoadW + loadW - localAcW) : 0, exportW,
    pvUsedW: pvForLoadW + chargeW + exportW / efficiency,
    loadV: loadEnergized ? limits.acV : 0,
    nextSoc: afterStep(soc, chargeW, dischargeW)
  };
}

export function simulate(circuit, assessment, controls) {
  const {stage, wrong} = assessment;
  const {irradiance, temperature, demand, soc, dcClosed, acClosed, gridOnline} = controls;
  const grid = circuit.mode === 'grid';
  const hybrid = circuit.mode === 'hybrid';
  const factor = 1 + limits.temperatureCoefficient * (temperature - 25);
  const sun = irradiance > 0;
  const pvV = sun ? limits.vmp * circuit.count * factor : 0;
  const voc = sun ? limits.voc * circuit.count * factor : 0;
  const availableW = limits.watts * circuit.count * irradiance / 1000 * factor;
  const stringReady = stage('string');
  const cleared = !wrong.length && stage('pe');
  const dcPath = cleared && stringReady && stage('dcIn') && stage('dcOut') && dcClosed;
  const {minV, maxV, maxVoc} = pvInputs[circuit.mode];
  const pvStatus = !sun ? 'night' : voc > maxVoc ? 'voc-high' : pvV < minV ? 'mppt-low' : pvV > maxV ? 'mppt-high' : 'valid';
  const mpptReady = pvStatus === 'valid';
  const connectedPvW = dcPath && mpptReady ? availableW : 0;
  const gridAtPanel = (grid || hybrid) && cleared && stage('grid') && gridOnline;
  const acPath = cleared && stage('acIn') && acClosed;
  const loadPath = stage('load');
  const battery = batteryBudget(soc);
  const measurements = {availableW, pvV, voc, stringReady, dcPath, mpptReady, pvStatus, gridAtPanel, acPath, loadPath};
  if (hybrid) {
    const paths = {cleared, gridAtPanel, acPath, loadPath};
    return {...measurements, ...simulateHybrid(stage, controls, paths, connectedPvW, battery)};
  }
  let generationW = 0, loadW = 0, chargeW = 0, dischargeW = 0, pvUsedW = 0;
  let loadEnergized = false;
  let limited = false;
  if (grid) {
    generationW = gridAtPanel && acPath ? Math.min(limits.gridLimit, connectedPvW * limits.gridEfficiency) : 0;
    pvUsedW = generationW / limits.gridEfficiency;
    loadEnergized = gridAtPanel && loadPath;
    loadW = loadEnergized ? demand : 0;
  } else if (cleared) {
    const controllerW = stage('charge') ? connectedPvW * limits.mpptEfficiency : 0;
    const batteryConnected = stage('battery');
    const busW = batteryConnected ? controllerW : 0;
    const availableDischarge = batteryConnected ? battery.discharge : 0;
    const demandDc = demand / limits.inverterEfficiency;
    const requested = acPath && loadPath && batteryConnected;
    limited = requested && (demand > limits.islandLimit || demandDc > busW + availableDischarge + 1e-6);
    loadEnergized = requested && !limited && busW + availableDischarge > 0;
    loadW = loadEnergized ? demand : 0;
    generationW = loadW;
    dischargeW = Math.max(0, loadW / limits.inverterEfficiency - busW);
    chargeW = Math.min(battery.charge, Math.max(0, controllerW - loadW / limits.inverterEfficiency));
    pvUsedW = (Math.min(busW, loadW / limits.inverterEfficiency) + chargeW) / limits.mpptEfficiency;
  }
  return {
    ...measurements,
    generationW, loadW, pvUsedW, loadV: loadEnergized ? limits.acV : 0, chargeW, dischargeW, limited,
    importW: grid ? Math.max(0, loadW - generationW) : 0,
    exportW: grid ? Math.max(0, generationW - loadW) : 0,
    nextSoc: afterStep(soc, chargeW, dischargeW)
  };
}
