import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react';
import {Button, Icon} from './components';
import {useApp} from './store';
import {useLearning} from './learning-store';
import {T, format} from './model';
import {referenceWires, terminalIds, type BenchInput, type BenchResult, type Terminal, type Wire} from './amazon-engine';
import {benchPart, benchReadings, campusBenchTitle, terminalNames} from './campus-bench-content';
import {addBenchWire, benchDevices, deviceTerminals, terminalMark, wireColors, wireKind, type BenchDevice} from './campus-bench-wiring';
import {createCampusBenchViewer, type BenchCamera} from './campus-bench-viewer';
import {handleLabCameraKey} from './lab-viewer';

const portPositions: Record<Terminal, [number, number]> = {
  'source+': [70, 158], 'source-': [145, 158], 'mpptPV+': [280, 158], 'mpptPV-': [355, 158],
  'mpptBAT+': [280, 242], 'mpptBAT-': [355, 242], 'bat+': [480, 355], 'bat-': [555, 355],
  'invDC+': [680, 158], 'invDC-': [755, 158], invL: [680, 242], invN: [755, 242], loadL: [880, 355], loadN: [955, 355]
};
const cameraLabels = {
  overview: T('Visão geral', 'Overview', 'Vista general'),
  rack: T('Bancada', 'Rack', 'Banco'),
  source: T('Fonte', 'Source', 'Fuente')
};
const wireLabels = {
  positive: T('CC +', 'DC +', 'CC +'), negative: T('CC −', 'DC −', 'CC −'),
  line: T('CA · L', 'AC · L', 'CA · L'), neutral: T('CA · N', 'AC · N', 'CA · N'),
  mixed: T('Bornes diferentes', 'Unlike terminals', 'Bornes distintos')
};

function useBenchText() {
  const {lang, t} = useApp();
  return {lang, t, n: (value: number, digits = 2) => format(value, lang, digits),
    q: (pt: string, en: string, es: string) => t(T(pt, en, es))};
}

interface WiringSurfaceProps {
  input: BenchInput;
  wires: Wire[];
  result: BenchResult;
  selected: Terminal | null;
  onTerminal: (id: Terminal) => void;
}

function PortButton({id, selected, onSelect, className, style, shortName}: {
  id: Terminal; selected: Terminal | null; onSelect: (id: Terminal) => void; className: string;
  style?: CSSProperties; shortName?: string;
}) {
  const {q, t} = useBenchText();
  return <button type="button" className={className} style={{...style, '--wire-color': wireColors[wireKind([id, id])]} as CSSProperties}
    aria-label={q('Terminal', 'Terminal', 'Terminal') + ' ' + id + ' · ' + t(terminalNames[id])}
    aria-pressed={selected === id} onClick={() => onSelect(id)}>
    {shortName ? <><span>{terminalMark(id)}</span><small>{shortName}</small></> : <><span>{terminalMark(id)}</span>{t(terminalNames[id])}</>}
  </button>;
}

function Schematic({input, wires, result, selected, onTerminal}: WiringSurfaceProps) {
  const {t, q, n} = useBenchText();
  const positions = {
    source: [25, 30, 165], controller: [250, 30, 160], battery: [450, 228, 155],
    inverter: [650, 30, 170], load: [845, 228, 150]
  } as const;
  const values = {source: n(result.sourceW / 1000) + ' kW', controller: n(result.controllerW / 1000) + ' kW',
    battery: n(result.batteryV, 1) + ' V', inverter: n(result.outputW / 1000) + ' kW', load: n(result.outputA) + ' A'};
  const captions = {source: q('Modelo de fonte CC', 'DC source model', 'Modelo de fuente CC'), controller: 'PV ≤ 150 V · η 96%',
    battery: `SOC ${n(input.soc, 0)}% · ${n(input.batteryV * input.batteryAh / 1000, 1)} kWh`,
    inverter: 'CC → 220 V CA · 60 Hz', load: q('Resistiva · FP = 1', 'Resistive · PF = 1', 'Resistiva · FP = 1')};
  return <div className="am-board-scroll" tabIndex={0}
    aria-label={q('Esquema elétrico. Deslize para ver os componentes.', 'Wiring schematic. Scroll to see all components.', 'Esquema eléctrico. Desliza para ver todos los componentes.')}>
    <div className="am-board">
      <svg className="am-wires" viewBox="0 0 1020 410" aria-hidden="true">
        <defs><pattern id="am-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".14"/></pattern></defs>
        <rect width="1020" height="410" fill="url(#am-grid)"/>
        {wires.map((wire, index) => {
          const [a, b] = wire;
          const [x1, y1] = portPositions[a], [x2, y2] = portPositions[b];
          return <path key={index} d={`M${x1},${y1} C${x1},${y1 + 60} ${x2},${y2 + 60} ${x2},${y2}`}
            stroke={wireColors[wireKind(wire)]} strokeWidth="3" fill="none"/>;
        })}
      </svg>
      {(Object.keys(positions) as (keyof typeof positions)[]).map(id => {
        const [left, top, width] = positions[id];
        const part = benchPart(id, input.source);
        return <div className="am-device" key={id} style={{left, top, width}}>
          <Icon name={part.icon}/><strong>{t(part.name)}</strong><b>{values[id]}</b><small>{captions[id]}</small>
        </div>;
      })}
      {terminalIds.map(id => {
        const [x, y] = portPositions[id];
        return <PortButton key={id} id={id} selected={selected} onSelect={onTerminal}
          className={`am-port ${selected === id ? 'selected' : ''}`} style={{left: x - 18, top: y - 18}}
          shortName={id.replace('source', input.source === 'solar' ? 'FV' : 'EOL')}/>;
      })}
    </div>
  </div>;
}

function BenchScene({input, wires, result, selected, onTerminal, onFallback}: WiringSurfaceProps & {onFallback: () => void}) {
  const {t, q, lang} = useBenchText();
  const {theme} = useApp();
  const [device, setDevice] = useState<BenchDevice>('source');
  const [camera, setCamera] = useState<BenchCamera>('overview');
  const [view, setView] = useState<'loading' | '3d' | 'lightweight'>('loading');
  const [showPorts, setShowPorts] = useState(true);
  const surface = useRef<HTMLDivElement>(null);
  const viewer = useRef<ReturnType<typeof createCampusBenchViewer> | null>(null);
  const projections = useRef<Partial<Record<Terminal, HTMLDivElement | null>>>({});
  const part = benchPart(device, input.source);
  const activePorts: readonly Terminal[] = deviceTerminals[device];

  useEffect(() => {
    if (!surface.current) return;
    try {
      const instance = createCampusBenchViewer(surface.current, setDevice, onFallback, (id, x, y, inFrame) => {
        const marker = projections.current[id];
        if (!marker) return;
        marker.hidden = !inFrame;
        if (inFrame) marker.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      });
      viewer.current = instance;
      setView(instance.lightweight ? 'lightweight' : '3d');
      return () => {
        instance.dispose();
        viewer.current = null;
      };
    } catch {
      onFallback();
    }
  }, [onFallback]);

  useEffect(() => {
    viewer.current?.update(input, wires, result, device, theme === 'light');
  }, [input, wires, result, device, theme]);

  const focus = (next: BenchCamera) => {
    setCamera(next);
    viewer.current?.focus(next);
  };

  return <div className="campus-bench-studio">
    <div className="campus-bench-camera">
      <div role="group" aria-label={q('Câmeras da bancada', 'Bench cameras', 'Cámaras del banco')}>
        {(Object.keys(cameraLabels) as BenchCamera[]).map(id => <button type="button" key={id}
          aria-pressed={camera === id} onClick={() => focus(id)}>{t(cameraLabels[id])}</button>)}
      </div>
      <div role="group" aria-label={q('Controles da câmera', 'Camera controls', 'Controles de cámara')}>
        <button type="button" aria-pressed={showPorts} onClick={() => setShowPorts(value => !value)}>
          <Icon name="network"/>{q('Bornes', 'Terminals', 'Bornes')}
        </button>
        <button type="button" className="campus-bench-camera-icon" title={q('Girar à esquerda', 'Orbit left', 'Girar a la izquierda')}
          aria-label={q('Girar à esquerda', 'Orbit left', 'Girar a la izquierda')} onClick={() => viewer.current?.rotate(-.25, 0)}>↶</button>
        <button type="button" className="campus-bench-camera-icon" title={q('Girar à direita', 'Orbit right', 'Girar a la derecha')}
          aria-label={q('Girar à direita', 'Orbit right', 'Girar a la derecha')} onClick={() => viewer.current?.rotate(.25, 0)}>↷</button>
        <button type="button" className="campus-bench-camera-icon" title={q('Aproximar', 'Zoom in', 'Acercar')}
          aria-label={q('Aproximar', 'Zoom in', 'Acercar')} onClick={() => viewer.current?.zoom(1.22)}><Icon name="plus"/></button>
        <button type="button" className="campus-bench-camera-icon" title={q('Afastar', 'Zoom out', 'Alejar')}
          aria-label={q('Afastar', 'Zoom out', 'Alejar')} onClick={() => viewer.current?.zoom(1 / 1.22)}>−</button>
        <button type="button" className="campus-bench-camera-icon" title={q('Restaurar câmera', 'Reset camera', 'Restablecer cámara')}
          aria-label={q('Restaurar câmera', 'Reset camera', 'Restablecer cámara')} onClick={() => viewer.current?.reset()}><Icon name="reset"/></button>
      </div>
    </div>
    <div className="campus-bench-workspace">
      <div className="campus-bench-scene">
        <div className="campus-bench-scene-surface" ref={surface} tabIndex={0} role="group"
          aria-label={q('Vista 3D interativa da montagem', 'Interactive 3D wiring view', 'Vista 3D interactiva del montaje')}
          onKeyDown={event => handleLabCameraKey(event, viewer.current)}/>
        <div className="campus-bench-projections" hidden={!showPorts}>
          {terminalIds.map(id => <div className="campus-bench-projection" key={id} data-inspected={activePorts.includes(id)}
            ref={element => {projections.current[id] = element;}} hidden>
            <button type="button" className="campus-bench-anchor" tabIndex={-1}
              aria-label={q('Borne 3D', '3D terminal', 'Borne 3D') + ' ' + id}
              title={id + ' · ' + t(terminalNames[id])} aria-pressed={selected === id}
              style={{'--wire-color': wireColors[wireKind([id, id])]} as CSSProperties}
              onClick={() => onTerminal(id)}>{terminalMark(id)}</button>
          </div>)}
        </div>
        {view === 'loading' && <p className="campus-bench-loading" role="status">{q('Abrindo montagem 3D…', 'Opening 3D assembly…', 'Abriendo montaje 3D…')}</p>}
        <div className="campus-bench-scene-caption">
          <span>{view === 'lightweight' ? q('Renderização leve', 'Lightweight rendering', 'Renderizado ligero')
            : q('Modelo didático', 'Training model', 'Modelo didáctico')}</span>
          <span>{q('Arraste para girar · Toque nos bornes', 'Drag to orbit · Tap terminals', 'Arrastra para girar · Toca los bornes')}</span>
        </div>
      </div>
      <aside className="campus-bench-inspector" aria-label={q('Inspeção de componentes', 'Component inspection', 'Inspección de componentes')}>
        <div className="campus-bench-devices" role="group" aria-label={q('Componentes', 'Components', 'Componentes')}>
          {benchDevices.map(id => {
            const item = benchPart(id, input.source);
            return <button type="button" key={id} title={t(item.name)} aria-label={t(item.name)} aria-pressed={id === device}
              onClick={() => setDevice(id)}><Icon name={item.icon}/></button>;
          })}
        </div>
        <h3>{t(part.name)}</h3>
        <p>{t(part.description)}</p>
        <dl>{benchReadings(device, input, result, lang).map(([label, value]) =>
          <div key={t(label)}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl>
        {activePorts.length > 0 && <div className="campus-bench-inspector-ports">
          {activePorts.map(id => <PortButton key={id} id={id} selected={selected} onSelect={onTerminal} className="campus-bench-inspector-port"/>)}
        </div>}
        {device === 'protection' && <button type="button" className="campus-bench-fault-link"
          onClick={() => document.getElementById('campus-bench-fault')?.focus()}>
          {q('Ir para falha simulada', 'Go to simulated fault', 'Ir al fallo simulado')}
        </button>}
      </aside>
    </div>
  </div>;
}

export default function CampusBenchWiring({result}: {result: BenchResult}) {
  const {q, t} = useBenchText();
  const {navigate, L} = useApp();
  const {record, patch} = useLearning();
  const {bench, wires} = record;
  const [view, setView] = useState<'3d' | 'diagram'>('3d');
  const [selected, setSelected] = useState<Terminal | null>(null);
  const [warning, setWarning] = useState<'duplicate' | 'full' | null>(null);
  const [rendererFailed, setRendererFailed] = useState(false);
  const fallback = useCallback(() => {
    setRendererFailed(true);
    setView('diagram');
  }, []);

  function connect(id: Terminal) {
    setWarning(null);
    if (!selected) {
      setSelected(id);
      return;
    }
    const next = addBenchWire(wires, [selected, id]);
    if (next.status === 'added') patch({wires: next.wires});
    if (next.status === 'duplicate' || next.status === 'full') setWarning(next.status);
    setSelected(null);
  }

  const surfaceProps = {input: bench, wires, result, selected, onTerminal: connect};
  const instruction = selected ? q(`Origem ${selected} selecionada. Escolha o destino.`,
    `Start terminal ${selected} selected. Choose the destination.`, `Origen ${selected} seleccionado. Elige el destino.`)
    : warning === 'duplicate' ? q('Esses bornes já estão ligados.', 'Those terminals are already connected.', 'Esos bornes ya están conectados.')
    : warning === 'full' ? q('Limite de 24 cabos. Remova um cabo para continuar.', '24-cable limit. Remove a cable to continue.', 'Límite de 24 cables. Elimina un cable para continuar.')
    : q('Selecione dois bornes para conectar um cabo.', 'Select two terminals to connect a cable.', 'Selecciona dos bornes para conectar un cable.');
  return <div className="campus-bench">
    <header className="campus-bench-header">
      <div>
        <h2>{t(campusBenchTitle)}</h2>
        <p role="status">{instruction}</p>
      </div>
      <div className="campus-bench-header-actions">
        <Button icon="sun" onClick={() => navigate('pvbench', 'solar')}>{L('pvbench')}</Button>
        <Button icon="layers" onClick={() => {
          patch({wires: referenceWires.map(([a, b]) => [a, b]), fault: 'none'});
          setSelected(null);
          setWarning(null);
        }}>{q('Montagem de referência', 'Reference wiring', 'Montaje de referencia')}</Button>
        <Button icon="reset" onClick={() => {
          patch({wires: []});
          setSelected(null);
          setWarning(null);
        }}>{q('Limpar fios', 'Clear wires', 'Borrar cables')}</Button>
      </div>
    </header>
    <div className="campus-bench-modes" role="group" aria-label={q('Vista da montagem', 'Wiring view', 'Vista del montaje')}>
      <button type="button" aria-pressed={view === '3d'} onClick={() => {setRendererFailed(false); setView('3d');}}>
        <Icon name="layers"/>{q('Montagem 3D', '3D assembly', 'Montaje 3D')}
      </button>
      <button type="button" aria-pressed={view === 'diagram'} onClick={() => setView('diagram')}>
        <Icon name="network"/>{q('Esquema elétrico', 'Wiring schematic', 'Esquema eléctrico')}
      </button>
    </div>
    {rendererFailed && <p className="campus-bench-fallback" role="status">{q(
      'A vista 3D ficou indisponível neste dispositivo. O esquema continua interativo.',
      'The 3D view is unavailable on this device. The schematic remains interactive.',
      'La vista 3D no está disponible en este dispositivo. El esquema sigue siendo interactivo.')}</p>}
    {view === '3d' ? <BenchScene {...surfaceProps} onFallback={fallback}/> : <Schematic {...surfaceProps}/>}
    <div className="campus-bench-connection-bar">
      <p>{wires.length === 1 ? q('1 cabo conectado', '1 connected cable', '1 cable conectado')
        : q(`${wires.length} cabos conectados`, `${wires.length} connected cables`, `${wires.length} cables conectados`)}</p>
      {selected && <button type="button" className="reset-button" onClick={() => setSelected(null)}>
        {q('Cancelar seleção', 'Cancel selection', 'Cancelar selección')}
      </button>}
      <ul className="campus-bench-legend" aria-label={q('Cores didáticas dos cabos', 'Teaching cable colors', 'Colores didácticos de cables')}>
        {(Object.keys(wireLabels) as (keyof typeof wireLabels)[]).map(kind => <li key={kind}>
          <i style={{background: wireColors[kind]}}/>{t(wireLabels[kind])}
        </li>)}
      </ul>
    </div>
    <div className="am-wire-list campus-bench-wire-list">
      {wires.map(([a, b], index) => <button type="button" key={index}
        onClick={() => {
          patch({wires: wires.filter((_, i) => i !== index)});
          setWarning(null);
        }}
        aria-label={q('Remover fio', 'Remove wire', 'Eliminar cable') + ' ' + a + ' → ' + b}>
        <i style={{background: wireColors[wireKind([a, b])]}}/><span>{a} ↔ {b}</span><Icon name="close"/>
      </button>)}
      {!wires.length && <p>{q('Comece pela fonte e pelo controlador.', 'Start with the source and the controller.', 'Empieza por la fuente y el controlador.')}</p>}
    </div>
  </div>;
}
