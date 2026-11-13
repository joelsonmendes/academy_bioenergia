import {assess, boardWidth, conductor, defaultControls, limits, makeCircuit, modules, pairKey,
  pvInputs, referenceWires, resizeArrayWires, simulate, wiringError} from './circuit.mjs';
import {photos, references} from './credits.mjs';
import {PROFILE_ID, scopedKey} from '../profiles.ts';

const images = /* APP_ASSETS */ {};
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const profile = document.documentElement.dataset.profile ?? PROFILE_ID;
const key = scopedKey('bioenergia.photo-bench.v1', profile);
const maxWires = 48;
const ranges = {irradiance: [0, 1200], temperature: [0, 80], demand: [0, 2500], normalDemand: [0, 2500],
  soc: [limits.socMin, limits.socMax]};
const pvWarnings = {
  'mppt-low': 'Vmp abaixo da faixa MPPT',
  'mppt-high': 'Vmp acima da faixa MPPT',
  'voc-high': 'Voc acima do limite'
};
const icons = {
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 6M4 11V5m0 6h6"/>',
  route: '<circle cx="5" cy="17" r="2"/><circle cx="19" cy="7" r="2"/><path d="M7 17h7a3 3 0 0 0 0-6h-4a2 2 0 0 1 0-4h7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  circle: '<circle cx="12" cy="12" r="7"/>',
  sliders: '<path d="M5 4v16m7-16v16m7-16v16M2 8h6m1 8h6m1-6h6"/>',
  inspect: '<circle cx="10" cy="10" r="5"/><path d="m14 14 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  moon: '<path d="M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  earth: '<path d="M12 3v10m-7 0h14m-11 4h8m-6 4h4"/>'
};
function icon(name) {
  return '<svg aria-hidden="true" viewBox="0 0 24 24">' + icons[name] + '</svg>';
}

function loadSession() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { saved = null; }
  const exercises = {};
  for (const [id, startingCount] of Object.entries(modules.defaults)) {
    const source = saved?.exercises?.[id];
    const storedCount = source?.count;
    const count = Number.isInteger(storedCount) && storedCount >= modules.min && storedCount <= modules.max
      ? storedCount : startingCount;
    const circuit = makeCircuit(id, count);
    const controls = defaultControls();
    for (const name of Object.keys(controls)) {
      const value = source?.controls?.[name];
      if (typeof controls[name] === 'boolean') {
        if (typeof value === 'boolean') controls[name] = value;
      } else {
        const [min, max] = ranges[name];
        if (Number.isFinite(value) && value >= min && value <= max) controls[name] = value;
      }
    }
    const seen = new Set();
    const wires = Array.isArray(source?.wires) ? source.wires.slice(0, maxWires).filter(wire => {
      if (!wire || !Object.hasOwn(circuit.ports, wire.a) || !Object.hasOwn(circuit.ports, wire.b) || wire.a === wire.b) return false;
      const id = pairKey(wire.a, wire.b);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map(({a, b}) => ({a, b})) : referenceWires(circuit);
    exercises[id] = {count, controls, wires};
  }
  const mode = Object.hasOwn(modules.defaults, saved?.mode) ? saved.mode : 'grid';
  return {mode, theme: saved?.theme === 'dark' ? 'dark' : 'light', exercises};
}

const session = loadSession();
const circuits = Object.fromEntries(Object.entries(session.exercises).map(([mode, exercise]) =>
  [mode, makeCircuit(mode, exercise.count)]));
const active = () => session.exercises[session.mode];
const circuit = () => circuits[session.mode];
const format = (value, decimals = 0) => value.toLocaleString('pt-BR', {
  maximumFractionDigits: decimals, minimumFractionDigits: decimals
});
const watts = value => format(value) + ' W';
const volts = value => format(value, 1) + ' V';
const percent = value => format(value, 1) + '%';
const board = $('board'), boardScroll = $('board-scroll'), wireLayer = $('wires');
const portLayer = $('ports'), componentLayer = $('components'), picker = $('component-picker');
const mainInstruction = 'Clique ou arraste entre dois bornes.';
let selected = null, device = 'inverter', highlighted = null, instruction = '', instructionLevel = '';
let scale = 1, automaticScale = true, drag = null, suppressClick = false, draftCable = null;

function save() {
  try { localStorage.setItem(key, JSON.stringify(session)); } catch {
    $('storage-note').textContent = 'O navegador bloqueou o armazenamento. A montagem permanece nesta aba.';
  }
}

function buildBoard() {
  const {count, height, items, mode} = circuit();
  drag = null;
  suppressClick = false;
  componentLayer.replaceChildren();
  portLayer.replaceChildren();
  picker.replaceChildren();
  board.dataset.mode = mode;
  board.style.height = height + 'px';
  wireLayer.setAttribute('viewBox', '0 0 ' + boardWidth + ' ' + height);
  $('board-caption').textContent = 'STRING FV';
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'equipment';
    button.dataset.component = item.id;
    button.dataset.kind = item.asset ?? 'structure';
    button.setAttribute('aria-label', 'Inspecionar ' + item.title);
    const [left, top, w, h] = item.box;
    Object.assign(button.style, {left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px'});
    if (item.asset) {
      const image = document.createElement('img');
      image.src = images[item.asset];
      image.alt = '';
      image.draggable = false;
      button.append(image);
    } else {
      button.insertAdjacentHTML('beforeend', icon('earth'));
    }
    const caption = document.createElement('span');
    caption.className = 'equipment-name';
    caption.textContent = item.title;
    button.append(caption);
    componentLayer.append(button);
    picker.add(new Option(item.title, item.id));
    for (const terminal of item.connections) {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'port';
      marker.dataset.port = terminal.id;
      marker.dataset.mark = terminal.mark;
      marker.textContent = terminal.mark;
      marker.style.left = terminal.x + 'px';
      marker.style.top = terminal.y + 'px';
      marker.style.setProperty('--conductor', conductor[portKind(terminal)].color);
      marker.setAttribute('aria-label', item.title + ' · ' + terminal.name);
      marker.title = item.title + ' · ' + terminal.name;
      portLayer.append(marker);
    }
  }
  $('branch-labels').replaceChildren();
  if (mode === 'hybrid') {
    const [x, top] = items.find(item => item.id === 'panel').box;
    const labels = [
      ['rede', 'RAMAL DA REDE', top - 26],
      ['eps', 'BACKUP · EPS', top + 173]
    ];
    for (const [kind, title, at] of labels) {
      const label = document.createElement('span');
      label.className = 'area-label branch-label ' + kind;
      label.style.left = x + 'px';
      label.style.top = at + 'px';
      label.textContent = title;
      $('branch-labels').append(label);
    }
  }
  $('array-count').textContent = count + (count === 1 ? ' módulo em série' : ' módulos em série');
  $('array-power').textContent = format(count * limits.watts / 1000, 2) + ' kWp instalados';
  $('module-add').disabled = count >= modules.max;
  $('module-remove').disabled = count <= modules.min;
}

function portKind(port) {
  if (port.domain === 'pe') return 'pe';
  if (port.domain === 'ac') return port.mark.toLowerCase();
  return port.mark === '+' ? 'plus' : 'minus';
}

function activePort(id) {
  return circuit().ports[id];
}

function portLabel(id) {
  const port = activePort(id);
  return port.componentTitle + ' · ' + port.name;
}

function drawPath(points) {
  const [start, ...rest] = points;
  return 'M' + start.join(',') + rest.map(point => ' L' + point.join(',')).join('');
}

function genericPath(p, q) {
  const offsets = {top: [0, -24], bottom: [0, 24], left: [-24, 0], right: [24, 0]};
  const a = offsets[p.side], b = offsets[q.side];
  return 'M' + p.x + ',' + p.y + ' C' + (p.x + a[0]) + ',' + (p.y + a[1]) +
    ' ' + (q.x + b[0]) + ',' + (q.y + b[1]) + ' ' + q.x + ',' + q.y;
}

function svgPath(d, kind, className) {
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', className);
  path.style.setProperty('--conductor', conductor[kind].color);
  return path;
}

function renderWires(assessment, reading) {
  const hybrid = session.mode === 'hybrid';
  const flow = {
    string: reading.pvUsedW > 0, dcIn: reading.pvUsedW > 0, dcOut: reading.pvUsedW > 0,
    charge: reading.pvUsedW > 0, battery: hybrid ? reading.chargeW + reading.dischargeW > 0
      : session.mode === 'island' && reading.loadW > 0,
    acIn: hybrid ? Math.abs(reading.gridBranchW) > .01 : reading.generationW > 0,
    load: reading.loadW > 0, grid: reading.importW + reading.exportW > 0,
    normal: reading.normalLoadW > 0, epsOut: reading.loadW > 0
  };
  wireLayer.replaceChildren();
  for (const {a, b} of active().wires) {
    const spec = circuit().byKey.get(pairKey(a, b));
    const p = activePort(spec?.a ?? a), q = activePort(spec?.b ?? b);
    const route = spec
      ? drawPath([[p.x, p.y], ...spec.points, [q.x, q.y]])
      : genericPath(p, q);
    const kind = spec?.kind ?? 'invalid';
    wireLayer.append(svgPath(route, kind, 'wire-under'), svgPath(route, kind, spec ? 'wire' : 'wire invalid'));
    if (spec && !assessment.wrong.length && flow[spec.stage]) {
      const reverse = (spec.stage === 'grid' && reading.importW > 0)
        || (hybrid && spec.stage === 'acIn' && reading.gridBranchW < 0)
        || (hybrid && spec.stage === 'battery' && reading.dischargeW > 0);
      wireLayer.append(svgPath(route, kind, reverse ? 'wire flow reverse' : 'wire flow'));
    }
  }
  if (highlighted && !drag?.moved) {
    const p = activePort(highlighted.a), q = activePort(highlighted.b);
    wireLayer.append(svgPath(drawPath([[p.x, p.y], ...highlighted.points, [q.x, q.y]]), highlighted.kind, 'wire preview'));
  }
  draftCable = null;
}

function switchInfo() {
  const {controls} = active();
  const hybrid = session.mode === 'hybrid';
  const island = session.mode === 'island';
  const buttons = [
    ['dc', controls.dcClosed, 'Fechado', 'Aberto'],
    ['ac', controls.acClosed, 'Fechado', 'Aberto'],
    ['eps', controls.epsClosed, 'Fechado', 'Aberto'],
    ['grid', controls.gridOnline, 'Disponível', 'Interrompida']
  ];
  for (const [id, on, yes, no] of buttons) {
    $(id).setAttribute('aria-checked', on);
    $(id).lastElementChild.textContent = on ? yes : no;
  }
  $('grid').hidden = island;
  $('battery-controls').hidden = session.mode === 'grid';
  $('eps').hidden = !hybrid;
  $('normal-demand-control').hidden = !hybrid;
  $('ac-label').textContent = hybrid ? 'Disjuntor do ramal da rede' : 'Disjuntor CA';
  $('demand-label').textContent = hybrid ? 'Demanda crítica' : 'Demanda da carga';
  $('irr').value = controls.irradiance;
  $('temp').value = controls.temperature;
  $('demand').value = controls.demand;
  $('normal-demand').value = controls.normalDemand;
  $('soc').value = controls.soc;
  $('irr-value').textContent = format(controls.irradiance) + ' W/m²';
  $('temp-value').textContent = format(controls.temperature) + ' °C';
  $('demand-value').textContent = watts(controls.demand);
  $('normal-demand-value').textContent = watts(controls.normalDemand);
  $('soc-value').textContent = percent(controls.soc);
}

function renderReadings(reading) {
  const grid = session.mode === 'grid';
  const hybrid = session.mode === 'hybrid';
  const exchange = watts(Math.max(reading.importW, reading.exportW));
  let exchangeNote = reading.importW > 0 ? 'Importando' : reading.exportW > 0 ? 'Exportando' : 'Troca zero';
  if (hybrid && !reading.gridAtPanel) {
    exchangeNote = active().controls.gridOnline ? 'Ramal da rede indisponível' : 'Rede isolada';
  }
  const batteryNote = reading.chargeW > 0 ? 'Carga · ' + watts(reading.chargeW)
    : reading.dischargeW > 0 ? 'Descarga · ' + watts(reading.dischargeW)
      : hybrid && !reading.batteryConnected ? 'Banco desconectado' : 'Em repouso';
  const {minV, maxV, maxVoc} = pvInputs[session.mode];
  const warning = pvWarnings[reading.pvStatus];
  $('array-reading').textContent = 'Vmp ' + volts(reading.pvV) + ' · Voc ' + volts(reading.voc);
  $('array-voltage').dataset.level = warning ? 'error' : '';
  $('array-limit').textContent = 'MPPT ' + minV + '–' + maxV + ' V · Voc máx. ' + maxVoc + ' V';
  $('array-warning').textContent = warning ?? '';
  $('array-warning').hidden = !warning;
  $('metrics').dataset.mode = session.mode;
  $('hybrid-exchange').hidden = !hybrid;
  $('hybrid-normal').hidden = !hybrid;
  $('metric-pv').textContent = watts(reading.availableW);
  $('metric-pv-note').textContent = reading.stringReady ? 'Potencial teórico da string' : 'String aberta · potencial teórico';
  $('metric-ca-title').textContent = grid || hybrid ? 'Geração CA' : 'Saída do inversor';
  $('metric-ca').textContent = watts(reading.generationW);
  $('metric-ca-note').textContent = hybrid ? (reading.gridLinked ? 'Conversão FV e bateria' : 'Conversão para o ramal EPS')
    : grid ? 'Potência ativa injetada no quadro CA' : 'Potência ativa no ramal isolado';
  $('metric-balance-title').textContent = grid ? 'Troca com a rede' : 'Banco de baterias';
  $('metric-balance').textContent = grid ? exchange : percent(active().controls.soc);
  $('metric-balance-note').textContent = grid ? exchangeNote : batteryNote;
  $('metric-load-title').textContent = hybrid ? 'Carga crítica · EPS' : 'Potência entregue à carga';
  $('metric-load').textContent = watts(reading.loadW);
  const loadNote = reading.loadV ? format(reading.loadV) + ' V CA · ' + format(reading.loadW / reading.loadV, 2) + ' A'
    : 'Circuito da carga sem alimentação';
  $('metric-load-note').textContent = reading.backupActive ? 'Backup ativo · ' + loadNote : loadNote;
  componentLayer.querySelector('[data-component="load"]').dataset.lit = String(reading.loadW > 0);
  if (hybrid) {
    $('metric-exchange').textContent = exchange;
    $('metric-exchange-note').textContent = exchangeNote;
    $('metric-normal').textContent = watts(reading.normalLoadW);
    $('metric-normal-note').textContent = reading.gridAtPanel ? 'Ramal comum da rede' : 'Sem alimentação da rede';
    componentLayer.querySelector('[data-component="normal"]').dataset.lit = String(reading.normalLoadW > 0);
  }
}

function diagnosis(assessment, reading) {
  const {controls} = active();
  const grid = session.mode === 'grid';
  const hybrid = session.mode === 'hybrid';
  if (assessment.wrong.length) return ['error', 'Ensaio bloqueado', wiringError(circuit(), assessment.wrong[0])];
  if (!assessment.stage('pe')) return ['waiting', 'Equipotencialização pendente', 'Complete as ligações PE para liberar este ensaio.'];
  if (assessment.missing.length) return ['waiting', 'Montagem em andamento', 'Veja os trechos pendentes abaixo ou peça a próxima ligação.'];
  if (grid && !controls.gridOnline) return ['waiting', 'Rede interrompida', 'A geração CA foi interrompida pelo anti-ilhamento simulado.'];
  if (hybrid) {
    if (!controls.epsClosed) return ['waiting', 'Disjuntor EPS aberto', 'O ramal crítico está sem alimentação.'];
    if (reading.limited) return ['waiting', 'Carga crítica acima da potência disponível',
      'Verifique o limite de 1,5 kW no EPS, a geração solar e a energia da bateria.'];
    if (!reading.gridLinked && !reading.loadV) return ['waiting', 'Backup indisponível',
      'Verifique o banco, o estado de carga e a geração FV.'];
  }
  if (controls.dcClosed && pvWarnings[reading.pvStatus]) {
    const overvoltage = reading.pvStatus === 'voc-high';
    return [overvoltage ? 'error' : 'waiting', pvWarnings[reading.pvStatus], overvoltage
      ? 'Reduza o número de módulos em série e confira a temperatura das células.'
      : 'Compare a tensão da string com a faixa de operação no painel acima da montagem.'];
  }
  if (hybrid) {
    if (reading.backupActive) return ['ready', 'Backup ativo', reading.gridAtPanel
      ? 'O ramal do inversor está aberto. O EPS está isolado e atende a carga crítica.'
      : 'A carga crítica recebe energia pelo EPS. O ramal comum está sem rede e a injeção externa está zerada.'];
    return ['ready', 'Operação conectada', 'Observe a troca com a rede e o estado da bateria. Interrompa a rede para ensaiar o backup.'];
  }
  if (!controls.acClosed) return ['waiting', 'Disjuntor CA aberto', grid ? 'A rede ainda pode alimentar a carga pelo seu próprio ramal.' : 'O ramal do inversor para a carga está interrompido.'];
  if (!controls.dcClosed) return ['waiting', 'Seccionamento CC aberto', grid ? 'A string ficou isolada do inversor.' : 'A string ficou isolada do controlador. Verifique a contribuição da bateria.'];
  if (reading.limited) return ['waiting', 'Carga acima da potência disponível', 'Confira a geração, o SOC e o limite do inversor no ensaio off-grid.'];
  if (!controls.irradiance) return ['ready', 'Ensaio sem sol', grid ? 'A rede assume a demanda quando a geração FV é zero.' : 'Observe a potência de descarga do banco de baterias.'];
  return ['ready', 'Montagem conferida', grid ? 'Observe a troca de potência com a rede e teste a interrupção.' : 'Compare carga e descarga ao variar a irradiância.'];
}

function renderDiagnosis(assessment, reading) {
  const [level, heading, detail] = diagnosis(assessment, reading);
  const message = $('diagnosis');
  const signature = heading + detail;
  if (message.dataset.signature !== signature) {
    message.dataset.signature = signature;
    message.dataset.level = level;
    const label = document.createElement('strong');
    label.textContent = heading;
    message.replaceChildren(label, detail);
  }
  const island = session.mode === 'island';
  const hybrid = session.mode === 'hybrid';
  const groups = [
    ['String FV em série', ['string']],
    ['Trajeto de potência CC', ['dcIn', 'dcOut', ...(island ? ['charge', 'battery'] : [])]],
    ...(hybrid ? [
      ['Banco de baterias', ['battery']],
      ['Ramal da rede', ['acIn', 'grid', 'normal']],
      ['Ramal crítico · EPS', ['epsOut', 'load']]
    ] : [['Trajeto de potência CA', ['acIn', 'load', ...(island ? [] : ['grid'])]]]),
    ['Continuidade do PE', ['pe']]
  ];
  $('checklist').replaceChildren(...groups.map(([name, stages]) => {
    const done = stages.every(assessment.stage);
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.innerHTML = icon(done ? 'check' : 'circle');
    label.append(name);
    const status = document.createElement('span');
    status.className = done ? 'done' : 'pending';
    status.textContent = done ? 'Completo' : 'Pendente';
    row.append(label, status);
    return row;
  }));
}

function renderSelection() {
  for (const marker of portLayer.children) {
    const id = marker.dataset.port;
    marker.setAttribute('aria-pressed', id === selected);
    marker.dataset.hint = String(id === highlighted?.a || id === highlighted?.b);
  }
  for (const item of componentLayer.children) item.setAttribute('aria-pressed', item.dataset.component === device);
  const text = instruction || (selected ? portLabel(selected) + ' selecionado. Escolha o destino.' : mainInstruction);
  if ($('instruction').textContent !== text) $('instruction').textContent = text;
  $('instruction').dataset.level = instructionLevel;
  const componentInstruction = $('component-instruction');
  componentInstruction.hidden = !selected && !instruction;
  componentInstruction.textContent = text;
  componentInstruction.dataset.level = instructionLevel;
  $('cancel').hidden = !selected && !highlighted;
}

function inspect(id) {
  const part = circuit().items.find(item => item.id === id);
  if (!part) return;
  device = id;
  picker.value = id;
  const title = document.createElement('h3'), detail = document.createElement('p');
  title.textContent = part.title;
  detail.textContent = part.description;
  $('component-info').replaceChildren(title, detail);
  $('component-ports').replaceChildren(...part.connections.map(terminal => {
    const button = document.createElement('button'), dot = document.createElement('span');
    button.type = 'button';
    button.dataset.inspectPort = terminal.id;
    button.setAttribute('aria-label', 'Conectar ' + portLabel(terminal.id));
    button.style.setProperty('--conductor', conductor[portKind(terminal)].color);
    dot.className = 'dot';
    dot.textContent = terminal.mark;
    button.append(dot, terminal.name);
    return button;
  }));
  renderSelection();
  renderInspectorPorts();
}

function renderInspectorPorts() {
  for (const button of $('component-ports').children) button.setAttribute('aria-pressed', button.dataset.inspectPort === selected);
}

function renderWireList(assessment) {
  const wires = active().wires;
  const wrong = assessment.wrong.length;
  const errors = wrong ? ' · ' + wrong + (wrong === 1 ? ' incorreta' : ' incorretas') : '';
  const count = assessment.correct + '/' + circuit().specs.length + ' ligações corretas' + errors;
  if ($('count').textContent !== count) $('count').textContent = count;
  $('wire-badge').textContent = '(' + wires.length + ')';
  if (!wires.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum cabo conectado.';
    $('wire-list').replaceChildren(empty);
    return;
  }
  $('wire-list').replaceChildren(...wires.map(({a, b}, index) => {
    const spec = circuit().byKey.get(pairKey(a, b));
    const button = document.createElement('button'), dot = document.createElement('i'), close = document.createElement('span');
    button.type = 'button';
    button.dataset.remove = index;
    button.title = portLabel(a) + ' ↔ ' + portLabel(b);
    button.setAttribute('aria-label', 'Remover cabo · ' + button.title);
    button.style.setProperty('--conductor', conductor[spec?.kind ?? 'invalid'].color);
    close.dataset.icon = 'close';
    close.innerHTML = icon('close');
    button.append(dot, button.title, close);
    return button;
  }));
}

function refresh({wiresChanged = false} = {}) {
  const {controls, wires} = active();
  const assessment = assess(circuit(), wires);
  const reading = simulate(circuit(), assessment, controls);
  switchInfo();
  renderReadings(reading);
  renderWires(assessment, reading);
  renderDiagnosis(assessment, reading);
  renderSelection();
  renderInspectorPorts();
  if (wiresChanged) renderWireList(assessment);
  $('next-hint').disabled = !assessment.missing.length && !assessment.wrong.length;
  return {assessment, reading};
}

function finishWire(a, b) {
  selected = null;
  highlighted = null;
  instruction = '';
  instructionLevel = '';
  if (a !== b) {
    const wires = active().wires;
    if (wires.some(w => pairKey(w.a, w.b) === pairKey(a, b))) {
      instruction = 'Esses bornes já estão ligados.';
    } else if (wires.length >= maxWires) {
      instruction = 'Remova um cabo antes de fazer outra ligação.';
    } else {
      wires.push({a, b});
      const spec = circuit().byKey.get(pairKey(a, b));
      instruction = spec ? 'Cabo conectado · ' + conductor[spec.kind].label : wiringError(circuit(), {a, b});
      instructionLevel = spec ? '' : 'error';
      if (!spec) $('wire-details').open = true;
      save();
    }
  }
  refresh({wiresChanged: true});
}

function choosePort(id) {
  if (selected) {
    finishWire(selected, id);
  } else {
    selected = id;
    highlighted = null;
    instruction = '';
    instructionLevel = '';
    refresh();
  }
}

function resetSelection() {
  selected = null;
  highlighted = null;
  instruction = '';
  instructionLevel = '';
}

function setWires(wires, restoreControls = false) {
  resetSelection();
  active().wires = wires;
  if (restoreControls) active().controls = defaultControls();
  refresh({wiresChanged: true});
  save();
}

function setMode(mode) {
  resetSelection();
  session.mode = mode;
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', button.dataset.mode === mode);
  buildBoard();
  inspect('inverter');
  resize(automaticScale ? automaticFit() : scale);
  refresh({wiresChanged: true});
  $('wire-details').open = false;
  boardScroll.scrollTo({left: 0, top: 0});
  save();
}

function changeModuleCount(delta) {
  const current = circuit();
  const count = current.count + delta;
  if (count < modules.min || count > modules.max) return;
  const next = makeCircuit(session.mode, count);
  const exercise = active();
  const removed = exercise.wires.length;
  exercise.wires = resizeArrayWires(current, next, exercise.wires);
  exercise.count = count;
  circuits[session.mode] = next;
  resetSelection();
  if (delta > 0) {
    instruction = 'Módulo ' + count + ' adicionado. Ligue os bornes da nova ponta da string.';
  } else {
    instruction = 'Módulo ' + current.count + ' removido.';
    if (removed > exercise.wires.length) instruction += ' Religue a ponta da string.';
  }
  buildBoard();
  inspect(next.items.some(item => item.id === device) ? device : 'inverter');
  resize(automaticScale ? automaticFit() : scale);
  refresh({wiresChanged: true});
  save();
}

function resize(next) {
  const {height} = circuit();
  scale = Math.max(.18, Math.min(1.65, next));
  board.style.transform = 'scale(' + scale + ')';
  $('board-sizer').style.width = Math.ceil(boardWidth * scale) + 'px';
  $('board-sizer').style.height = Math.ceil(height * scale) + 'px';
  const pan = boardWidth * scale > boardScroll.clientWidth + 2;
  $('scale-info').textContent = format(scale * 100) + '% · ' + (pan ? 'Deslize a prancheta na horizontal' : 'Prancheta inteira');
  $('zoom-out').disabled = scale <= .19;
  $('zoom-in').disabled = scale >= 1.64;
}

function fit() {
  return boardScroll.clientWidth / boardWidth;
}

function renderTheme() {
  document.documentElement.dataset.theme = session.theme;
  const dark = session.theme === 'dark';
  $('theme').setAttribute('aria-pressed', dark);
  $('theme-text').textContent = dark ? 'Tema claro' : 'Tema escuro';
  $('theme-icon').innerHTML = icon(dark ? 'sun' : 'moon');
}

function link(label, href) {
  const a = document.createElement('a');
  a.textContent = label;
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

for (const node of document.querySelectorAll('[data-icon]')) node.innerHTML = icon(node.dataset.icon);
$('senai-logo').src = images.logo;
$('mc4-photo').src = images.mc4;
for (const [title, author, file, license] of Object.values(photos)) {
  const row = document.createElement('li');
  row.append(link(title, 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file)),
    ' · ' + author + ' · ', link(license[0], license[1]));
  $('photo-credits').append(row);
}
for (const [label, href] of references) {
  const row = document.createElement('li');
  row.append(link(label, href));
  $('references').append(row);
}
for (const [name, {label, color}] of Object.entries(conductor)) {
  if (name === 'invalid') continue;
  const chip = document.createElement('span'), dot = document.createElement('i');
  dot.style.setProperty('--conductor', color);
  chip.append(dot, label);
  $('legend').append(chip);
}

for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
  if (session.mode !== button.dataset.mode) setMode(button.dataset.mode);
});
$('theme').addEventListener('click', () => {
  session.theme = session.theme === 'dark' ? 'light' : 'dark';
  renderTheme();
  save();
});
$('reference').addEventListener('click', () => setWires(referenceWires(circuit()), true));
$('clear').addEventListener('click', () => setWires([]));
$('module-add').addEventListener('click', () => changeModuleCount(1));
$('module-remove').addEventListener('click', () => changeModuleCount(-1));
$('cancel').addEventListener('click', () => { resetSelection(); refresh(); });
$('next-hint').addEventListener('click', () => {
  const {missing, wrong} = assess(circuit(), active().wires);
  resetSelection();
  if (wrong.length) {
    $('wire-details').open = true;
    const index = active().wires.indexOf(wrong[0]);
    $('wire-list').querySelector('[data-remove="' + index + '"]')?.focus();
    instruction = 'Remova a ligação incorreta para continuar.';
    instructionLevel = 'error';
  } else if (missing.length) {
    highlighted = missing[0];
    instruction = 'Ligue ' + portLabel(highlighted.a) + ' ↔ ' + portLabel(highlighted.b) + '.';
    portLayer.querySelector('[data-port="' + highlighted.a + '"]')?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }
  refresh();
});
$('wire-list').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const index = Number(button.dataset.remove);
  active().wires.splice(index, 1);
  resetSelection();
  instruction = 'Cabo removido.';
  refresh({wiresChanged: true});
  ($('wire-list').children[index] instanceof HTMLButtonElement ? $('wire-list').children[index] : $('wire-details').querySelector('summary')).focus();
  save();
});

componentLayer.addEventListener('click', event => {
  const item = event.target.closest('[data-component]');
  if (item) inspect(item.dataset.component);
});
picker.addEventListener('change', () => inspect(picker.value));
$('component-ports').addEventListener('click', event => {
  const button = event.target.closest('[data-inspect-port]');
  if (button) choosePort(button.dataset.inspectPort);
});
portLayer.addEventListener('click', event => {
  const button = event.target.closest('[data-port]');
  if (button && (event.detail === 0 || !suppressClick)) choosePort(button.dataset.port);
  suppressClick = false;
});
portLayer.addEventListener('pointerdown', event => {
  const button = event.target.closest('[data-port]');
  if (!button || event.button !== 0 || !event.isPrimary) return;
  suppressClick = false;
  drag = {id: event.pointerId, x: event.clientX, y: event.clientY, from: button.dataset.port, moved: false};
  button.setPointerCapture(event.pointerId);
});
portLayer.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
  const origin = activePort(drag.from);
  if (!drag.moved) {
    resetSelection();
    selected = drag.from;
    drag.moved = true;
    renderSelection();
    renderInspectorPorts();
  }
  const rect = board.getBoundingClientRect();
  const point = [Math.max(0, Math.min(boardWidth, (event.clientX - rect.left) / scale)),
    Math.max(0, Math.min(circuit().height, (event.clientY - rect.top) / scale))];
  const path = drawPath([[origin.x, origin.y], point]);
  if (draftCable) draftCable.setAttribute('d', path);
  else {
    draftCable = svgPath(path, portKind(origin), 'wire preview');
    wireLayer.append(draftCable);
  }
});
function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const {from, moved} = drag;
  drag = null;
  if (!moved) return;
  suppressClick = true;
  const button = event.type === 'pointerup' ? document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-port]') : null;
  if (button) finishWire(from, button.dataset.port);
  else refresh();
}
portLayer.addEventListener('pointerup', endDrag);
portLayer.addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (selected || highlighted)) { resetSelection(); refresh(); }
});
for (const [id, prop] of [['irr','irradiance'], ['temp','temperature'], ['demand','demand'],
  ['normal-demand','normalDemand'], ['soc','soc']]) {
  $(id).addEventListener('input', () => {
    active().controls[prop] = $(id).valueAsNumber;
    refresh();
    save();
  });
}
for (const [id, prop] of [['dc','dcClosed'], ['ac','acClosed'], ['grid','gridOnline'], ['eps','epsClosed']]) {
  $(id).addEventListener('click', () => {
    active().controls[prop] = !active().controls[prop];
    refresh();
    save();
  });
}
$('advance').addEventListener('click', () => {
  if (session.mode === 'grid') return;
  const {controls, wires} = active();
  const reading = simulate(circuit(), assess(circuit(), wires), controls);
  const before = controls.soc;
  controls.soc = reading.nextSoc;
  instruction = 'Após 10 min · SOC de ' + percent(before) + ' para ' + percent(controls.soc) + '.';
  instructionLevel = '';
  refresh();
  save();
});
function changeZoom(next) {
  automaticScale = false;
  resize(next);
}
$('zoom-in').addEventListener('click', () => changeZoom(scale * 1.22));
$('zoom-out').addEventListener('click', () => changeZoom(scale / 1.22));
$('zoom-fit').addEventListener('click', () => changeZoom(fit()));
const automaticFit = () => Math.min(1, Math.max(.72, fit()));
const observer = new ResizeObserver(() => resize(automaticScale ? automaticFit() : scale));
observer.observe(boardScroll);

renderTheme();
setMode(session.mode);

if (window.parent !== window) {
  const origin = window.origin;
  const targetOrigin = origin === 'null' ? '*' : origin;
  const reportSize = () => window.parent.postMessage({
    type: 'bioenergia-pv-size', height: document.body.offsetHeight
  }, targetOrigin);
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== origin) return;
    const message = event.data;
    if (message?.type !== 'bioenergia-pv-theme' || !['dark', 'light'].includes(message.theme)) return;
    document.documentElement.dataset.embedded = 'true';
    session.theme = message.theme;
    renderTheme();
    reportSize();
  });
  new ResizeObserver(reportSize).observe(document.body);
  window.parent.postMessage({type: 'bioenergia-pv-theme-request'}, targetOrigin);
}
