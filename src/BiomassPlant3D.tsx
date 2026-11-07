import React, {useEffect, useRef, useState} from 'react';
import {Button, Heading, Icon} from './components';
import {LabParameterField} from './LabParameterField';
import {calculate} from './energy';
import {format, T} from './model';
import {useApp} from './store';
import {handleLabCameraKey} from './lab-viewer';
import {createBiomassPlantViewer, flowFilters, plantFlows, plantParts, plantViews} from './biomass-plant-viewer';
import type {FlowFilter, PlantPart, PlantView} from './biomass-plant-viewer';
import {filterLabels, flowLabels, plantLessons, plantReferences, plantViewLabels} from './biomass-plant-content';

type RenderMode = 'loading' | '3d' | 'lightweight' | 'diagram';
const exercise = {mass: 60, moisture: 25, lhv: 18.5, etaBio: 25, aux: 8, hours: 10};

const diagramPoints: Record<PlantPart, [number, number]> = {
  yard: [35, 92], feeder: [105, 92], boiler: [179, 92], turbine: [271, 92],
  generator: [353, 92], transformer: [441, 92], condenser: [271, 159], pump: [179, 159],
  cooling: [369, 159], filter: [252, 35], stack: [343, 35], ash: [112, 204]
};
const diagramRoutes: {id: keyof typeof plantFlows; paths: string[]}[] = [
  {id: 'fuel', paths: ['M50 92H88', 'M120 92H162']},
  {id: 'steam', paths: ['M194 92H254']},
  {id: 'exhaust', paths: ['M271 107V142']},
  {id: 'water', paths: ['M256 159H196', 'M179 144V109']},
  {id: 'cooling', paths: ['M286 155H352', 'M354 165H288']},
  {id: 'gas', paths: ['M179 77V35H235', 'M267 35H326']},
  {id: 'ash', paths: ['M164 100H146V204H129', 'M252 50V63H86V204H95']},
  {id: 'electric', paths: ['M368 92H424', 'M456 92H484']}
];

function PlantDiagram({part, flow}: {part: PlantPart; flow: FlowFilter}) {
  return (
    <svg className="lab3d-diagram" viewBox="0 0 505 231" aria-hidden="true">
      <defs>
        {Object.entries(plantFlows).map(([id, {color}]) => (
          <marker key={id} id={'plant-arrow-' + id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0 0L6 3L0 6Z" fill={color}/>
          </marker>
        ))}
      </defs>
      {diagramRoutes.flatMap(({id, paths}) => paths.map(segment => (
        <path key={segment} d={segment} fill="none" stroke={plantFlows[id].color} strokeWidth="2.2"
          opacity={flow === 'all' || flow === plantFlows[id].filter ? 1 : .22}
          markerEnd={'url(#plant-arrow-' + id + ')'}/>
      )))}
      <path d="M286 92H338" stroke="#b9cdd8" strokeWidth="4"/>
      {plantParts.map((id, index) => {
        const [x, y] = diagramPoints[id];
        return (
          <g key={id} transform={'translate(' + x + ',' + y + ')'}>
            <circle r="15" fill={id === part ? '#204a33' : '#14293c'} stroke={id === part ? '#89fa95' : '#46647e'}/>
            <text y="4.5" textAnchor="middle" fill="#e1f3ff" fontSize="12" fontWeight="700">{index + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function BiomassPlant3D({onTurbineDetail}: {onTurbineDetail: () => void}) {
  const {t, lang, navigate, values, updateValues, notify} = useApp();
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const host = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const balance = useRef<HTMLHeadingElement>(null);
  const viewer = useRef<ReturnType<typeof createBiomassPlantViewer>>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('loading');
  const [part, setPart] = useState<PlantPart>('boiler');
  const [view, setView] = useState<PlantView>('overview');
  const [flow, setFlow] = useState<FlowFilter>('all');
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const input = values.biomass;
  const result = calculate('biomass', input);
  const firing = result.resource > 0;
  const generating = result.power > 0;
  const canOrbit = renderMode === '3d' || renderMode === 'lightweight';

  useEffect(() => {
    if (!host.current) return;
    try {
      const instance = createBiomassPlantViewer(host.current, setPart, () => {
        setPlaying(false);
        setRenderMode('diagram');
      });
      viewer.current = instance;
      setRenderMode(instance.lightweight ? 'lightweight' : '3d');
      return () => {
        instance.dispose();
        viewer.current = null;
      };
    } catch {
      setRenderMode('diagram');
    }
  }, []);

  useEffect(() => {
    if (!firing) setPlaying(false);
    viewer.current?.setState({part, view, flow, firing, generating, playing: playing && firing});
  }, [part, view, flow, firing, generating, playing]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === panel.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === panel.current) await document.exitFullscreen();
      else await panel.current?.requestFullscreen();
    } catch {
      notify(q('Tela cheia indisponível neste navegador.', 'Fullscreen is unavailable in this browser.', 'Pantalla completa no disponible en este navegador.'));
    }
  }

  const modeLabel = {
    loading: T('CARREGANDO MODELO', 'LOADING MODEL', 'CARGANDO MODELO'),
    '3d': T('MODELO 3D DIDÁTICO', 'EDUCATIONAL 3D MODEL', 'MODELO 3D DIDÁCTICO'),
    lightweight: T('MODELO 3D LEVE', 'LIGHTWEIGHT 3D MODEL', 'MODELO 3D LIGERO'),
    diagram: T('ESQUEMA DIDÁTICO', 'EDUCATIONAL DIAGRAM', 'ESQUEMA DIDÁCTICO')
  };
  const status = firing
    ? q('Em geração simulada', 'Simulated generation', 'Generación simulada')
    : q('Sem alimentação de combustível', 'No fuel feed', 'Sin alimentación de combustible');
  const n = (value: number | null, digits = 1) => format(value, lang, digits);
  const setParameter = (id: string, value: number) => updateValues('biomass', {...input, [id]: value});
  const metrics = [
    {label: T('Potência térmica do combustível', 'Fuel thermal power', 'Potencia térmica del combustible'), value: result.resource, unit: 'kWₜ'},
    {label: T('Potência elétrica bruta', 'Gross electrical power', 'Potencia eléctrica bruta'), value: result.gross, unit: 'kWₑ'},
    {label: T('Consumo auxiliar', 'Auxiliary use', 'Consumo auxiliar'), value: result.details.auxPower, unit: 'kWₑ'},
    {label: T('Potência elétrica líquida', 'Net electrical power', 'Potencia eléctrica neta'), value: result.power, unit: 'kWₑ'}
  ];
  const lesson = plantLessons[part];
  const pci = lang === 'en' ? 'LHV' : 'PCI';

  return (
    <section className="lab3d bioplant">
      <Heading eyebrow={T('LABORATÓRIO 3D  /  BIOMASSA', '3D LAB  /  BIOMASS', 'LABORATORIO 3D  /  BIOMASA')}
        title={T('Usina de biomassa 3D', 'Biomass power plant 3D', 'Central de biomasa 3D')}
        description={T('Explore a usina por dentro e acompanhe a geração elétrica a partir de biomassa sólida em um ciclo a vapor com condensação.',
          'Explore the plant and follow power generation from solid biomass in a condensing steam cycle.',
          'Explora la planta y sigue la generación eléctrica a partir de biomasa sólida en un ciclo de vapor con condensación.')}>
        <Button icon="layers" onClick={onTurbineDetail}>
          {q('Detalhar turbina e gerador', 'Inspect turbine and generator', 'Detallar turbina y generador')}
        </Button>
      </Heading>

      <div className="lab3d-viewer bioplant-viewer" ref={panel}>
        <div className="lab3d-toolbar">
          {renderMode !== 'diagram' && (
            <div className="lab3d-modes" role="group" aria-label={q('Vistas da usina', 'Plant views', 'Vistas de la planta')}>
              {plantViews.map(id => (
                <button type="button" key={id} aria-pressed={view === id} onClick={() => {
                  setView(id);
                  if (id === 'boiler') setPart('boiler');
                  if (id === 'generation') setPart('turbine');
                  if (id === 'exhaust') setPart('filter');
                }}>{t(plantViewLabels[id])}</button>
              ))}
            </div>
          )}
          <div className="lab3d-tools">
            {canOrbit && <>
              <button type="button" aria-label={q('Aproximar', 'Zoom in', 'Acercar')} onClick={() => viewer.current?.zoom(1.2)}>+</button>
              <button type="button" aria-label={q('Afastar', 'Zoom out', 'Alejar')} onClick={() => viewer.current?.zoom(1 / 1.2)}>−</button>
              <button type="button" aria-label={q('Restaurar câmera', 'Reset camera', 'Restablecer cámara')}
                onClick={() => viewer.current?.reset()}><Icon name="reset"/></button>
            </>}
            {document.fullscreenEnabled && (
              <button type="button" aria-pressed={fullscreen} aria-label={q('Tela cheia', 'Fullscreen', 'Pantalla completa')}
                onClick={() => void toggleFullscreen()}><Icon name="zoom"/></button>
            )}
          </div>
        </div>

        <div className="lab3d-stage bioplant-stage" role="group"
          aria-label={q('Modelo interativo da usina', 'Interactive plant model', 'Modelo interactivo de la planta')}
          aria-describedby="bioplant-help" tabIndex={canOrbit ? 0 : undefined}
          onKeyDown={event => handleLabCameraKey(event, canOrbit ? viewer.current : null)}>
          <div ref={host} className="lab3d-surface" hidden={renderMode === 'diagram'} aria-hidden="true"/>
          {renderMode === 'diagram' && <PlantDiagram part={part} flow={flow}/>}
          <span className="lab3d-stage-label"><span className="lab3d-indicator"/>{t(modeLabel[renderMode])}</span>
          <span className="bioplant-selection"><span>{String(plantParts.indexOf(part) + 1).padStart(2, '0')}</span>{t(lesson.title)}</span>
        </div>

        <div className="bioplant-process">
          <div className="bioplant-process-row">
            <div className="lab3d-modes bioplant-filter" role="group"
              aria-label={q('Realçar circuito', 'Highlight circuit', 'Resaltar circuito')}>
              {flowFilters.map(id => (
                <button type="button" key={id} aria-pressed={id === flow} onClick={() => setFlow(id)}>{t(filterLabels[id])}</button>
              ))}
            </div>
            {canOrbit && (
              <button type="button" className="bioplant-play" aria-pressed={playing} disabled={!firing}
                onClick={() => setPlaying(active => !active)}>
                <span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span>
                {playing ? q('Pausar operação', 'Pause operation', 'Pausar operación') : q('Animar operação', 'Animate operation', 'Animar operación')}
              </button>
            )}
          </div>
          <ul className="bioplant-legend" aria-label={q('Legenda dos circuitos', 'Circuit legend', 'Leyenda de circuitos')}>
            {(Object.keys(plantFlows) as (keyof typeof plantFlows)[]).map(id => (
              <li key={id} data-muted={flow !== 'all' && flow !== plantFlows[id].filter}>
                <span style={{backgroundColor: plantFlows[id].color}}/>{t(flowLabels[id])}
              </li>
            ))}
          </ul>
        </div>
        <p className="lab3d-help" id="bioplant-help">{canOrbit
          ? q('Arraste para girar. Use roda ou pinça para ampliar. Selecione um equipamento no modelo ou na lista. No teclado, use setas e +/−.',
            'Drag to rotate. Scroll or pinch to zoom. Select equipment in the model or list. Use arrows and +/− on a keyboard.',
            'Arrastra para girar. Usa la rueda o pellizca para ampliar. Selecciona un equipo en el modelo o en la lista. En el teclado, usa flechas y +/−.')
          : q('Explore os circuitos no esquema e use a lista para inspecionar os equipamentos.',
            'Explore circuits in the diagram and use the list to inspect equipment.',
            'Explora los circuitos en el esquema y usa la lista para inspeccionar los equipos.')}</p>
      </div>

      <div className="bioplant-layout">
        <section className="lab3d-card" aria-labelledby="bioplant-equipment">
          <span className="lab3d-kicker">{q('01 / INSPEÇÃO', '01 / INSPECTION', '01 / INSPECCIÓN')}</span>
          <h2 id="bioplant-equipment">{q('Equipamentos da usina', 'Plant equipment', 'Equipos de la planta')}</h2>
          <div className="lab3d-parts bioplant-parts">
            {plantParts.map((id, i) => (
              <button type="button" key={id} aria-pressed={id === part} aria-controls="bioplant-part-detail" onClick={() => setPart(id)}>
                <span>{String(i + 1).padStart(2, '0')}</span>{t(plantLessons[id].title)}
              </button>
            ))}
          </div>
          <div className="lab3d-part-detail" id="bioplant-part-detail" aria-live="polite">
            <strong>{t(lesson.title)}</strong><p>{t(lesson.description)}</p>
          </div>
        </section>

        <section className="lab3d-card bioplant-balance" aria-labelledby="bioplant-energy">
          <span className="lab3d-kicker">{q('02 / SIMULAÇÃO', '02 / SIMULATION', '02 / SIMULACIÓN')}</span>
          <h2 ref={balance} id="bioplant-energy" tabIndex={-1}>{q('Balanço de potência', 'Power balance', 'Balance de potencia')}</h2>
          <p className="bioplant-status" data-firing={firing} role="status"><span/>{status}</p>
          <div className="lab3d-inputs bioplant-inputs">
            <LabParameterField id="mass" value={input.mass} onValue={value => setParameter('mass', value)}/>
            <LabParameterField id="moisture" value={input.moisture} onValue={value => setParameter('moisture', value)}/>
          </div>
          <div className="bioplant-actions bioplant-presets" role="group"
            aria-label={q('Umidade dos lotes do ensaio', 'Exercise batch moisture', 'Humedad de los lotes del ensayo')}>
            <Button onClick={() => setParameter('moisture', 25)}>25% {q('de umidade', 'moisture', 'de humedad')}</Button>
            <Button onClick={() => setParameter('moisture', 50)}>50% {q('de umidade', 'moisture', 'de humedad')}</Button>
          </div>
          <details className="bioplant-details">
            <summary>{q('Premissas do ensaio', 'Exercise assumptions', 'Supuestos del ensayo')}</summary>
            <div className="lab3d-inputs bioplant-inputs">
              {(['lhv', 'etaBio', 'aux', 'hours'] as const).map(id => (
                <LabParameterField key={id} id={id} slider={false} value={input[id]} onValue={value => setParameter(id, value)}/>
              ))}
            </div>
          </details>

          <dl className="lab3d-metrics bioplant-metrics">
            {metrics.map(({label, value, unit}) => (
              <div key={label.pt}><dt>{t(label)}</dt><dd>{n(value)} <small>{unit}</small></dd></div>
            ))}
          </dl>
          <dl className="bioplant-totals">
            <div><dt>{q('PCI recebido', 'As-received LHV', 'PCI recibido')}</dt><dd>{n(result.details.lhv, 2)} MJ/kg</dd></div>
            <div><dt>{q('Energia líquida no período', 'Net energy over period', 'Energía neta del período')}</dt><dd>{n(result.energy)} kWh</dd></div>
          </dl>
          <details className="bioplant-details bioplant-formulas">
            <summary>{q('Memória de cálculo', 'Calculation steps', 'Memoria de cálculo')}</summary>
            <ol>
              <li><code>{pci}<sub>r</sub> = max(0, {pci}<sub>s</sub> × (1 − U) − {n(2.443, 3)} × U)</code></li>
              <li><code>P<sub>comb</sub> = ṁ × {pci}<sub>r</sub> / {n(3.6)}</code></li>
              <li><code>P<sub>br</sub> = P<sub>comb</sub> × η<sub>br</sub></code></li>
              <li><code>P<sub>líq</sub> = P<sub>br</sub> × (1 − f<sub>aux</sub>)</code></li>
              <li><code>E<sub>líq</sub> = P<sub>líq</sub> × t</code></li>
            </ol>
            <p>{q('Use PCI em MJ/kg, alimentação ṁ em kg/h e duração t em horas. Umidade U, rendimento bruto η e fração auxiliar f entram como frações entre 0 e 1.',
              'Use LHV in MJ/kg, feed ṁ in kg/h and duration t in hours. Moisture U, gross efficiency η and auxiliary fraction f are fractions from 0 to 1.',
              'Usa PCI en MJ/kg, alimentación ṁ en kg/h y duración t en horas. La humedad U, el rendimiento bruto η y la fracción auxiliar f son fracciones de 0 a 1.')}</p>
          </details>
          <p>{q('Balanço simplificado em regime permanente com rendimento elétrico bruto assumido. Geometria e movimento ilustrativos.',
            'Simplified steady-state balance with assumed gross electrical efficiency. Illustrative geometry and motion.',
            'Balance simplificado en régimen permanente con rendimiento eléctrico bruto supuesto. Geometría y movimiento ilustrativos.')}</p>
          <div className="bioplant-actions">
            <Button icon="flask" onClick={() => navigate('sim', 'biomass')}>
              {q('Abrir simulador de biomassa', 'Open biomass simulator', 'Abrir simulador de biomasa')}
            </Button>
            <Button disabled={!input.mass} onClick={() => setParameter('mass', 0)}>
              {q('Zerar alimentação', 'Set fuel feed to zero', 'Poner alimentación a cero')}
            </Button>
          </div>
        </section>

        <section className="lab3d-card bioplant-activity" aria-labelledby="bioplant-practice">
          <span className="lab3d-kicker">{q('03 / PRÁTICA NO ACRE', '03 / ACRE CASE STUDY', '03 / PRÁCTICA EN ACRE')}</span>
          <h2 id="bioplant-practice">{q('Dois lotes de cavacos', 'Two batches of wood chips', 'Dos lotes de astillas')}</h2>
          <p>{q('Uma serraria fictícia no Acre recebe dois lotes de cavacos, um com 25% e outro com 50% de umidade. Carregue o ensaio para fixar a alimentação em 60 kg/h. Compare o PCI recebido e a potência líquida, mantendo os demais ajustes.',
            'A fictional sawmill in Acre receives two batches of wood chips, at 25% and 50% moisture. Load the exercise to set the feed rate to 60 kg/h. Compare as-received LHV and net power with other settings fixed.',
            'Un aserradero ficticio de Acre recibe dos lotes de astillas, con 25% y 50% de humedad. Carga el ensayo para fijar la alimentación en 60 kg/h. Compara el PCI recibido y la potencia neta manteniendo los demás ajustes.')}</p>
          <p>{q('Identifique onde o vapor volta a ser líquido. Explique por que a água de resfriamento e a água da caldeira circulam em linhas separadas.',
            'Identify where steam becomes liquid again. Explain why cooling water and boiler water circulate in separate lines.',
            'Identifica dónde el vapor vuelve al estado líquido. Explica por qué el agua de refrigeración y la de caldera circulan por líneas separadas.')}</p>
          <div className="bioplant-actions">
            <Button icon="flask" onClick={() => {
              updateValues('biomass', {...exercise});
              balance.current?.focus({preventScroll: true});
              balance.current?.scrollIntoView({block: 'nearest', behavior: 'instant'});
            }}>
              {q('Carregar ensaio', 'Load exercise', 'Cargar ensayo')}
            </Button>
          </div>
          <div className="bioplant-references">
            {plantReferences.map(({label, url}) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">{t(label)}<Icon name="external"/></a>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
