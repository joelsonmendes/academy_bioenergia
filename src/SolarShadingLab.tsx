import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {Button, Download, Heading, Icon} from './components';
import {handleLabCameraKey} from './lab-viewer';
import {format, T} from './model';
import {
  evaluateShade, evaluateShadeDay, groundShadow, moduleIds, panelPoint, shadeDefaults,
  shadeGround, shadeLimits, shadeModule, shadeStartMinute, validShadeDate
} from './solar-shading';
import type {ModuleId, Obstacle, Point2, ShadeScenario} from './solar-shading';
import {createSolarShadingViewer} from './solar-shading-viewer';
import {useApp} from './store';

type Reading = ReturnType<typeof evaluateShade>;
type Day = ReturnType<typeof evaluateShadeDay>;

const obstacleNames = {
  none: T('Sem obstáculo', 'No obstruction', 'Sin obstáculo'),
  pole: T('Poste', 'Pole', 'Poste'),
  wall: T('Muro', 'Wall', 'Muro'),
  building: T('Edificação', 'Building', 'Edificación')
};

const modelSources = [
  {label: 'NOAA · Solar position', url: 'https://gml.noaa.gov/grad/solcalc/solareqns.PDF'},
  {label: 'pvlib · Martínez-Moreno', url: 'https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.shading.direct_martinez.html'},
  {label: 'INPE/LABREN · Atlas Brasileiro', url: 'https://labren.ccst.inpe.br/atlas_2017.html'}
];

function timeLabel(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function RangeField({label, value, limits, step = 1, display, onChange}: {
  label: string; value: number; limits: readonly [number, number]; step?: number; display: string; onChange: (value: number) => void
}) {
  const id = useId();
  return <div className="shade-range">
    <div><label htmlFor={id}>{label}</label><output htmlFor={id} aria-live="off">{display}</output></div>
    <input id={id} type="range" min={limits[0]} max={limits[1]} step={step} value={value}
      aria-valuetext={display} onChange={event => onChange(event.target.valueAsNumber)}/>
  </div>;
}

function GroundPlan({reading, selected}: {reading: Reading; selected: ModuleId}) {
  const {t} = useApp();
  const points = (polygon: Point2[]) => polygon.map(([x, y]) => `${x},${y}`).join(' ');
  const {halfWidth, halfDepth} = shadeGround;
  const obstacle = reading.object;
  return <svg className="shade-fallback" viewBox={`${-halfWidth} ${-halfDepth} ${2 * halfWidth} ${2 * halfDepth}`}
    role="img" aria-label={t(T('Planta do arranjo e da sombra projetada', 'Array and cast shadow plan', 'Planta del arreglo y de la sombra proyectada'))}>
    <rect x={-halfWidth} y={-halfDepth} width={2 * halfWidth} height={2 * halfDepth} fill="#263e4d"/>
    {obstacle && <polygon points={points(groundShadow(obstacle.vertices, reading.sun.direction))} fill="#071321"/>}
    {reading.modules.map(module => {
      const corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]];
      const toPlan = ([u, v]: Point2): Point2 => {
        const [x, , z] = panelPoint(reading.frame, u, v);
        return [x, z];
      };
      const outline = corners.map(([x, y]) => toPlan([module.u + x * shadeModule.width, module.v + y * shadeModule.length]));
      return <g key={module.id}>
        <polygon points={points(outline)} fill="#2c6a98" stroke={module.id === selected ? '#8aff9f' : '#7dabbf'} strokeWidth=".03"/>
        <polygon points={points(module.polygon.map(toPlan))} fill="#091826"/>
      </g>;
    })}
    {obstacle && <polygon points={points(obstacle.vertices.slice(0, 4).map(([x, , z]) => [x, z]))} fill="#cb955f"/>}
    <path d="M-4 -1.5v-1.15m-.16 .24 .16-.24 .16.24" stroke="#a9dfea" strokeWidth=".045" fill="none"/>
    <text x="-4" y="-2.8" fontSize=".34" textAnchor="middle" fill="#d5e9f2">N</text>
  </svg>;
}

function ModuleInspection({reading, selected, onSelect}: {reading: Reading; selected: ModuleId; onSelect: (id: ModuleId) => void}) {
  const {t, lang} = useApp();
  const module = reading.modules.find(item => item.id === selected)!;
  const width = 99;
  const height = width * shadeModule.length / shadeModule.width;
  const left = 25;
  const top = 25;
  const x = (u: number) => left + width * (.5 + (u - module.u) / shadeModule.width);
  const y = (v: number) => top + height * (.5 - (v - module.v) / shadeModule.length);
  const shadow = module.polygon.map(([u, v]) => `${x(u)},${y(v)}`).join(' ');
  return <section className="lab3d-card shade-inspection" aria-labelledby="shade-inspection-title">
    <h2 id="shade-inspection-title">{t(T('Inspeção dos módulos', 'Module inspection', 'Inspección de módulos'))}</h2>
    <div className="shade-module-picker" role="group" aria-label={t(T('Módulo inspecionado', 'Inspected module', 'Módulo inspeccionado'))}>
      {moduleIds.map(id => <button key={id} type="button" aria-pressed={selected === id} onClick={() => onSelect(id)}>{id}</button>)}
    </div>
    <div className="shade-inspection-body">
      <svg viewBox="0 0 149 187" role="img" aria-label={t(T(`Módulo ${selected} com três blocos de células`, `Module ${selected} with three cell blocks`, `Módulo ${selected} con tres bloques de células`))}>
        <rect x={left - 2} y={top - 2} width={width + 4} height={height + 4} rx="3" fill="#7e98ac"/>
        <rect x={left} y={top} width={width} height={height} fill="#245176"/>
        {Array.from({length: 5}, (_, i) => <path key={`c${i}`} d={`M${left + (i + 1) * width / 6},${top}v${height}`} stroke="#5d89a9" strokeWidth=".7"/>)}
        {Array.from({length: 11}, (_, i) => <path key={`r${i}`} d={`M${left},${top + (i + 1) * height / 12}h${width}`} stroke="#5d89a9" strokeWidth=".7"/>)}
        {shadow && <polygon points={shadow} fill="#091826" fillOpacity=".9" stroke="#ffe0a5" strokeWidth=".8"/>}
        {module.blocks.map((affected, i) => <g key={i}>
          <rect x={left + i * width / 3 + .5} y={top + .5} width={width / 3 - 1} height={height - 1}
            fill="none" stroke={affected ? '#ffca70' : '#8ebad8'} strokeWidth={affected ? 1.8 : .7}/>
          <text x={left + (i + .5) * width / 3} y="17" textAnchor="middle" className={affected ? 'shade-block-hit' : ''}>B{i + 1}</text>
        </g>)}
      </svg>
      <dl>
        <div><dt>{t(T('Área sombreada', 'Shaded area', 'Área sombreada'))}</dt><dd>{format(module.shadedFraction * 100, lang, 1)}%</dd></div>
        <div><dt>{t(T('Blocos atingidos', 'Affected blocks', 'Bloques afectados'))}</dt><dd>{module.blockCount} / {shadeModule.blocks}</dd></div>
        <div><dt>{t(T('Potência CC', 'DC power', 'Potencia CC'))}</dt><dd>{format(module.powerW, lang, 0)} W</dd></div>
      </dl>
    </div>
    <p>{t(T('Cada bloco representa um grupo de células protegido por um diodo de bypass.',
      'Each block represents a cell group protected by a bypass diode.',
      'Cada bloque representa un grupo de células protegido por un diodo de bypass.'))}</p>
  </section>;
}

function DailyChart({day, reading, minute, onExport}: {day: Day; reading: Reading; minute: number; onExport: () => void}) {
  const {t, lang} = useApp();
  const left = 54, right = 600, top = 18, bottom = 167;
  const max = Math.max(500, Math.ceil(Math.max(...day.samples.map(sample => sample.clearW)) / 500) * 500);
  const x = (min: number) => left + (right - left) * min / 1440;
  const y = (power: number) => bottom - (bottom - top) * power / max;
  const line = (key: 'clearW' | 'powerW') => day.samples.map(sample => `${x(sample.minute)},${y(sample[key])}`).join(' ');
  return <section className="lab3d-card shade-chart" aria-labelledby="shade-chart-title">
    <div className="shade-chart-head">
      <h2 id="shade-chart-title">{t(T('Potência ao longo do dia', 'Power throughout the day', 'Potencia a lo largo del día'))}</h2>
      <Button icon="download" onClick={onExport}>{t(T('Exportar CSV', 'Export CSV', 'Exportar CSV'))}</Button>
    </div>
    <div className="shade-legend">
      <span><i className="shade-clear-key"/>{t(T('Referência sem obstáculo', 'Unobstructed reference', 'Referencia sin obstáculo'))}</span>
      <span><i className="shade-power-key"/>{t(T('Cenário simulado', 'Simulated case', 'Escenario simulado'))}</span>
    </div>
    <svg viewBox="0 0 626 199" role="img" aria-label={t(T('Curvas comparativas de potência CC por hora solar', 'Comparative DC power curves by solar time', 'Curvas comparativas de potencia CC por hora solar'))}>
      {[0, .25, .5, .75, 1].map(fraction => <g key={fraction}>
        <path d={`M${left},${y(fraction * max)}H${right}`} className="shade-chart-grid"/>
        <text x={left - 8} y={y(fraction * max) + 4} textAnchor="end">{format(fraction * max, lang, 0)}</text>
      </g>)}
      <text x={left} y="12">W</text>
      {[0, 360, 720, 1080, 1440].map(min => <text key={min} x={x(min)} y="190" textAnchor="middle">{timeLabel(min)}</text>)}
      <polyline points={line('clearW')} className="shade-curve-clear"/>
      <polyline points={line('powerW')} className="shade-curve-power"/>
      <path d={`M${x(minute)},${top}V${bottom}`} className="shade-chart-cursor"/>
      <circle cx={x(minute)} cy={y(reading.clearW)} r="4" className="shade-dot-clear"/>
      <circle cx={x(minute)} cy={y(reading.powerW)} r="4" className="shade-dot-power"/>
    </svg>
    <p>{t(T(`Energia CC estimada no dia · ${format(day.shadedKwh, lang, 2)} kWh no cenário e ${format(day.clearKwh, lang, 2)} kWh na referência.`,
      `Estimated daily DC energy · ${format(day.shadedKwh, lang, 2)} kWh in the scenario and ${format(day.clearKwh, lang, 2)} kWh in the reference.`,
      `Energía CC diaria estimada · ${format(day.shadedKwh, lang, 2)} kWh en el escenario y ${format(day.clearKwh, lang, 2)} kWh en la referencia.`))}</p>
  </section>;
}

function exportDay(scenario: ShadeScenario, day: Day, decimalComma: boolean) {
  const num = (value: number) => value.toFixed(3).replace('.', decimalComma ? ',' : '.');
  const header = 'data;hora_solar;latitude_graus;inclinacao_graus;azimute_graus;obstaculo;altura_m;distancia_m;posicao_graus;DNI_W_m2;DHI_W_m2;T_celula_C;altura_solar_graus;area_sombreada_pct;P_CC_referencia_W;P_CC_cenario_W;perda_pct';
  const rows = day.samples.map(sample => [scenario.date, timeLabel(sample.minute), num(scenario.latitude), scenario.tilt, scenario.azimuth,
    scenario.obstacle, num(scenario.height), num(scenario.distance), scenario.bearing, scenario.dni, scenario.dhi, scenario.cellTemperature,
    num(sample.altitude), num(sample.shadedFraction * 100), num(sample.clearW), num(sample.powerW), num(sample.lossFraction * 100)].join(';'));
  Download(`bioenergia-sombreamento-${scenario.date}.csv`, '\ufeff' + [header, ...rows].join('\r\n'), 'text/csv;charset=utf-8');
}

export default function SolarShadingLab() {
  const {t, lang} = useApp();
  const [scenario, setScenario] = useState(shadeDefaults);
  const [clock, setClock] = useState({minute: shadeStartMinute, playing: false});
  const [selected, setSelected] = useState<ModuleId>('M2');
  const [blocks, setBlocks] = useState(true);
  const [overhead, setOverhead] = useState(false);
  const [view, setView] = useState<'loading' | '3d' | 'lightweight' | 'plan'>('loading');
  const [fullscreen, setFullscreen] = useState(false);
  const viewer = useRef<ReturnType<typeof createSolarShadingViewer> | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const viewerPanel = useRef<HTMLDivElement>(null);
  const day = useMemo(() => evaluateShadeDay(scenario), [scenario]);
  const reading = useMemo(() => evaluateShade(scenario, clock.minute), [scenario, clock.minute]);
  const canOrbit = view === '3d' || view === 'lightweight';
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const n = (value: number, places = 0) => format(value, lang, places);
  const affectedModules = reading.modules.filter(module => module.blockCount > 0).length;

  useEffect(() => {
    if (!surface.current) return;
    try {
      const instance = createSolarShadingViewer(surface.current, setSelected, () => setView('plan'));
      viewer.current = instance;
      setView(instance.lightweight ? 'lightweight' : '3d');
      return () => {instance.dispose(); viewer.current = null;};
    } catch {
      setView('plan');
    }
  }, []);

  useEffect(() => {viewer.current?.update(scenario, reading, selected, blocks);}, [scenario, reading, selected, blocks]);

  useEffect(() => {
    if (!clock.playing) return;
    const timer = window.setInterval(() => setClock(previous => {
      const minute = Math.min(previous.minute + 4, day.lastMinute);
      return {minute, playing: minute < day.lastMinute};
    }), 100);
    return () => window.clearInterval(timer);
  }, [clock.playing, day.lastMinute]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === viewerPanel.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function update<Key extends keyof ShadeScenario>(key: Key, value: ShadeScenario[Key]) {
    setScenario(previous => ({...previous, [key]: value}));
  }

  function play() {
    setClock(previous => {
      if (previous.playing) return {...previous, playing: false};
      const inDay = previous.minute >= day.firstMinute && previous.minute < day.lastMinute;
      return {minute: inDay ? previous.minute : day.firstMinute, playing: true};
    });
  }

  function switchCamera(value: boolean) {
    setOverhead(value);
    viewer.current?.setOverhead(value);
  }

  function reset() {
    setScenario(shadeDefaults);
    setClock({minute: shadeStartMinute, playing: false});
    setSelected('M2');
    setBlocks(true);
    switchCamera(false);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === viewerPanel.current) await document.exitFullscreen();
      else await viewerPanel.current?.requestFullscreen();
    } catch {
      // The embedded viewer remains usable if the browser disallows fullscreen.
    }
  }

  const stats = [
    {label: q('Área sombreada', 'Shaded area', 'Área sombreada'), value: n(reading.shadedFraction * 100, 1), unit: '%',
      detail: q(`${affectedModules} de 4 módulos atingidos`, `${affectedModules} of 4 modules affected`, `${affectedModules} de 4 módulos afectados`)},
    {label: q('Potência CC estimada', 'Estimated DC power', 'Potencia CC estimada'), value: n(reading.powerW, 0), unit: 'W',
      detail: q(`${n(reading.clearW)} W sem obstáculo`, `${n(reading.clearW)} W unobstructed`, `${n(reading.clearW)} W sin obstáculo`)},
    {label: q('Perda instantânea', 'Instantaneous loss', 'Pérdida instantánea'), value: reading.clearW > 0 ? n(reading.lossFraction * 100, 1) : '—', unit: reading.clearW > 0 ? '%' : '',
      detail: q('Em relação à referência', 'Relative to reference', 'Respecto a la referencia')},
    {label: q('Energia CC no dia', 'Daily DC energy', 'Energía CC del día'), value: n(day.shadedKwh, 2), unit: 'kWh',
      detail: q(`${n(day.clearKwh, 2)} kWh sem obstáculo`, `${n(day.clearKwh, 2)} kWh unobstructed`, `${n(day.clearKwh, 2)} kWh sin obstáculo`)}
  ];

  return <section className="shade-lab">
    <Heading eyebrow={T('LABORATÓRIO 3D / FOTOVOLTAICA', '3D LAB / PHOTOVOLTAICS', 'LABORATORIO 3D / FOTOVOLTAICA')}
      title={T('Simulação e sombreamento 3D em ação', '3D shading simulation in action', 'Simulación y sombreado 3D en acción')}
      description={T('Mude o horário solar ou a posição do obstáculo. Compare a área sombreada com a perda de potência.',
        'Change the solar time or the obstruction position. Compare shaded area with power loss.',
        'Cambia la hora solar o la posición del obstáculo. Compara el área sombreada con la pérdida de potencia.')}>
      <Button icon="reset" onClick={reset}>{q('Reiniciar ensaio', 'Reset experiment', 'Reiniciar ensayo')}</Button>
    </Heading>

    <dl className="shade-metrics">
      {stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value} <small>{stat.unit}</small></dd><dd className="shade-metric-note">{stat.detail}</dd></div>)}
    </dl>

    <div className="shade-workspace">
      <div className="lab3d-viewer shade-viewer" ref={viewerPanel}>
        <div className="lab3d-toolbar">
          <div className="lab3d-modes" role="group" aria-label={q('Vista do arranjo', 'Array view', 'Vista del arreglo')}>
            <button type="button" disabled={!canOrbit} aria-pressed={!overhead && canOrbit} onClick={() => switchCamera(false)}>{q('Perspectiva', 'Perspective', 'Perspectiva')}</button>
            <button type="button" disabled={!canOrbit} aria-pressed={overhead || view === 'plan'} onClick={() => switchCamera(true)}>{q('Vista superior', 'Overhead', 'Vista superior')}</button>
          </div>
          <div className="lab3d-tools">
            <button type="button" disabled={!canOrbit} aria-label={q('Aproximar', 'Zoom in', 'Acercar')} onClick={() => viewer.current?.zoom(1.2)}>+</button>
            <button type="button" disabled={!canOrbit} aria-label={q('Afastar', 'Zoom out', 'Alejar')} onClick={() => viewer.current?.zoom(1 / 1.2)}>−</button>
            {document.fullscreenEnabled && <button type="button" aria-label={q('Tela cheia', 'Fullscreen', 'Pantalla completa')}
              aria-pressed={fullscreen} onClick={() => void toggleFullscreen()}><Icon name="zoom"/></button>}
          </div>
        </div>
        <div className="shade-time">
          <Button icon="clock" kind="primary" onClick={play}>{clock.playing ? q('Pausar', 'Pause', 'Pausar') : q('Animar o Sol', 'Animate sun', 'Animar el Sol')}</Button>
          <RangeField label={q('Hora solar', 'Solar time', 'Hora solar')} value={clock.minute} limits={[0, 1440]} step={1} display={timeLabel(clock.minute)}
            onChange={minute => setClock({minute, playing: false})}/>
        </div>
        <div className="lab3d-stage shade-stage" tabIndex={canOrbit ? 0 : undefined} role="group"
          aria-label={q('Modelo 3D do arranjo fotovoltaico', '3D photovoltaic array model', 'Modelo 3D del arreglo fotovoltaico')}
          aria-describedby="shade-camera-help" onKeyDown={event => handleLabCameraKey(event, canOrbit ? viewer.current : null)}>
          <div ref={surface} className="lab3d-surface" aria-hidden="true" hidden={view === 'plan'}/>
          {view === 'plan' && <GroundPlan reading={reading} selected={selected}/>}
          <span className="shade-scene-status"><Icon name={reading.daylight ? 'sun' : 'moon'}/>
            {reading.daylight ? `${q('Altura solar', 'Solar altitude', 'Altura solar')} ${n(reading.sun.altitude, 1)}°` : q('Sol abaixo do horizonte', 'Sun below the horizon', 'Sol bajo el horizonte')}
          </span>
          <span className="shade-scene-name">{scenario.latitude === shadeDefaults.latitude ? 'Rio Branco · AC' : `${q('Latitude', 'Latitude', 'Latitud')} ${n(scenario.latitude, 2)}°`}</span>
        </div>
        <p className="lab3d-help" id="shade-camera-help">{canOrbit
          ? q('Arraste para girar, use pinça ou +/− e toque em um módulo para inspecioná-lo. No teclado, use as setas.',
            'Drag to orbit, pinch or use +/−, and tap a module to inspect it. Use arrow keys on a keyboard.',
            'Arrastra para girar, usa el gesto de pinza o +/− y toca un módulo para inspeccionarlo. Usa las flechas del teclado.')
          : view === 'plan' ? q('Vista em planta. Os controles e os cálculos continuam disponíveis.', 'Plan view. Controls and calculations remain available.', 'Vista en planta. Los controles y cálculos siguen disponibles.')
            : q('Carregando o arranjo…', 'Loading array…', 'Cargando arreglo…')}</p>
      </div>

      <section className="lab3d-card shade-controls" aria-labelledby="shade-controls-title">
        <h2 id="shade-controls-title">{q('Parâmetros do ensaio', 'Experiment settings', 'Parámetros del ensayo')}</h2>
        <label className="shade-field">{q('Data de simulação', 'Simulation date', 'Fecha de simulación')}
          <input type="date" min="2000-01-01" max="2099-12-31" value={scenario.date}
            onChange={event => {if (validShadeDate(event.target.value)) update('date', event.target.value);}}/>
        </label>
        <label className="shade-field">{q('Obstáculo', 'Obstruction', 'Obstáculo')}
          <select value={scenario.obstacle} onChange={event => update('obstacle', event.target.value as Obstacle)}>
            {Object.entries(obstacleNames).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
          </select>
        </label>
        {scenario.obstacle !== 'none' && <div className="shade-sliders">
          <RangeField label={q('Altura do obstáculo', 'Obstruction height', 'Altura del obstáculo')} value={scenario.height} limits={shadeLimits.height} step={.1} display={`${n(scenario.height, 1)} m`} onChange={value => update('height', value)}/>
          <RangeField label={q('Distância ao centro', 'Distance to array center', 'Distancia al centro')} value={scenario.distance} limits={shadeLimits.distance} step={.1} display={`${n(scenario.distance, 1)} m`} onChange={value => update('distance', value)}/>
          <RangeField label={q('Posição do obstáculo', 'Obstruction bearing', 'Posición del obstáculo')} value={scenario.bearing} limits={shadeLimits.bearing} display={`${n(scenario.bearing)}°`} onChange={value => update('bearing', value)}/>
        </div>}
        <div className="shade-sliders">
          <RangeField label={q('Inclinação dos módulos', 'Module tilt', 'Inclinación de módulos')} value={scenario.tilt} limits={shadeLimits.tilt} display={`${n(scenario.tilt)}°`} onChange={value => update('tilt', value)}/>
          <RangeField label={q('Azimute dos módulos', 'Module azimuth', 'Azimut de módulos')} value={scenario.azimuth} limits={shadeLimits.azimuth} display={`${n(scenario.azimuth)}°`} onChange={value => update('azimuth', value)}/>
        </div>
        <p className="shade-direction">{q('Norte 0° · Leste 90° · Sul 180° · Oeste 270°', 'North 0° · East 90° · South 180° · West 270°', 'Norte 0° · Este 90° · Sur 180° · Oeste 270°')}</p>
        <label className="shade-checkbox"><input type="checkbox" checked={blocks} onChange={event => setBlocks(event.target.checked)}/>{q('Destacar blocos atingidos no 3D', 'Highlight affected blocks in 3D', 'Resaltar bloques afectados en 3D')}</label>
        <details className="shade-advanced">
          <summary>{q('Local e condições do céu', 'Location and sky conditions', 'Lugar y condiciones del cielo')}</summary>
          <RangeField label={q('Latitude', 'Latitude', 'Latitud')} value={scenario.latitude} limits={shadeLimits.latitude} step={.01} display={`${n(scenario.latitude, 2)}°`} onChange={value => update('latitude', value)}/>
          <RangeField label={q('Direta normal (DNI)', 'Direct normal (DNI)', 'Directa normal (DNI)')} value={scenario.dni} limits={shadeLimits.dni} step={10} display={`${n(scenario.dni)} W/m²`} onChange={value => update('dni', value)}/>
          <RangeField label={q('Difusa horizontal (DHI)', 'Diffuse horizontal (DHI)', 'Difusa horizontal (DHI)')} value={scenario.dhi} limits={shadeLimits.dhi} step={10} display={`${n(scenario.dhi)} W/m²`} onChange={value => update('dhi', value)}/>
          <RangeField label={q('Temperatura da célula', 'Cell temperature', 'Temperatura de célula')} value={scenario.cellTemperature} limits={shadeLimits.cellTemperature} display={`${n(scenario.cellTemperature)} °C`} onChange={value => update('cellTemperature', value)}/>
        </details>
      </section>
    </div>

    <div className="shade-results">
      <DailyChart day={day} reading={reading} minute={clock.minute} onExport={() => exportDay(scenario, day, lang !== 'en')}/>
      <ModuleInspection reading={reading} selected={selected} onSelect={setSelected}/>
    </div>

    <details className="lab3d-card shade-method">
      <summary>{q('Memória de cálculo e atividade prática', 'Calculation notes and exercise', 'Memoria de cálculo y actividad práctica')}</summary>
      <div className="shade-method-body">
        <h3>{q('Da posição solar à potência', 'From solar position to power', 'De la posición solar a la potencia')}</h3>
        <p>{q('A hora solar tem meio-dia na passagem do Sol pelo meridiano. O modelo projeta um obstáculo opaco sobre o plano inclinado dos quatro módulos de 450 Wp. A interseção com cada módulo e bloco determina a área e os blocos atingidos.',
          'Solar noon occurs when the Sun crosses the meridian. The model projects an opaque obstruction onto the tilted plane of the four 450 Wp modules. Intersection with each module and block determines the shaded area and affected blocks.',
          'El mediodía solar ocurre cuando el Sol cruza el meridiano. El modelo proyecta un obstáculo opaco sobre el plano inclinado de los cuatro módulos de 450 Wp. La intersección con cada módulo y bloque determina el área y los bloques afectados.')}</p>
        <dl className="shade-equations">
          <div><dt>{q('Direta no plano', 'Plane-of-array beam', 'Directa en el plano')}</dt><dd>G<sub>b</sub> = DNI × max(0, n · s)</dd></div>
          <div><dt>{q('Fator de feixe por módulo', 'Beam factor per module', 'Factor directo por módulo')}</dt><dd>F = (1 − A<sub>s</sub>/A) × (1 − N<sub>s</sub>/(N + 1))</dd></div>
          <div><dt>{q('Potência do módulo', 'Module power', 'Potencia del módulo')}</dt><dd>P<sub>{lang === 'en' ? 'DC' : 'CC'}</sub> = 450 × (G<sub>b</sub> F + G<sub>d</sub> + G<sub>r</sub>) / 1000 × [1 − {n(.0035, 4)} (T<sub>c</sub> − 25)]</dd></div>
        </dl>
        <p>{q('Aₛ/A é a fração sombreada, Nₛ é o número de blocos atingidos e N = 3. Gd é a difusa isotrópica e Gr é a refletida pelo solo, com albedo 0,20. A perda segue o modelo empírico de Martínez-Moreno. A curva diária integra amostras de 5 minutos com DNI, DHI e temperatura da célula constantes durante o dia. A potência é somada por módulo, com operação independente. O modelo simplifica a resposta elétrica e exclui curvas I–V e interações em string.',
          'Aₛ/A is the shaded fraction, Nₛ is the number of affected blocks, and N = 3. Gd is isotropic diffuse irradiance and Gr is ground reflected irradiance with albedo 0.20. Loss follows the Martínez-Moreno empirical model. The daily curve integrates 5-minute samples with constant daytime DNI, DHI, and cell temperature. Power is summed across independently operated modules. The model simplifies electrical response and excludes I–V curves and string interactions.',
          'Aₛ/A es la fracción sombreada, Nₛ es el número de bloques afectados y N = 3. Gd es la difusa isotrópica y Gr la reflejada por el suelo con albedo 0,20. La pérdida sigue el modelo empírico de Martínez-Moreno. La curva integra muestras de 5 minutos con DNI, DHI y temperatura de célula constantes durante el día. Se suman las potencias de módulos independientes. El modelo simplifica la respuesta eléctrica y excluye curvas I–V e interacciones de cadenas.')}</p>
        <h3>{q('Desafio em sala', 'Classroom exercise', 'Desafío en clase')}</h3>
        <p>{q('Reinicie o ensaio e anote a área sombreada e a perda às 09:00. Retire o poste no seletor de obstáculo e confira a potência de referência. Recoloque o poste e mude o horário. Em quais módulos e blocos a sombra passou a incidir?',
          'Reset and record shaded area and loss at 09:00. Remove the pole with the obstruction selector and check the reference power. Put the pole back and change the solar time. Which modules and blocks does the shadow reach now?',
          'Reinicia y registra el área sombreada y la pérdida a las 09:00. Retira el poste con el selector de obstáculos y verifica la potencia de referencia. Recoloca el poste y cambia la hora. ¿A qué módulos y bloques llega ahora la sombra?')}</p>
        <div className="reference-links">{modelSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<Icon name="external"/></a>)}</div>
      </div>
    </details>
  </section>;
}
