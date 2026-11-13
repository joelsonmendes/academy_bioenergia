import {useId, useMemo, useRef, useState} from 'react';
import {Button, Icon} from './components';
import {T} from './model';
import {useApp} from './store';
import {calculateSin, sinMaxPower, sinScenarios} from './sin-engine';
import type {SinCorridor, SinInput, SinRegion, SinResult, SinScenario} from './sin-engine';
import {sinReferences, sinRegionText, sinScenarioText} from './sin-content';
import {SinNetworkMap} from './SinNetworkMap';
import type {SinMapSelection} from './SinNetworkMap';

const scenarioKeys = Object.keys(sinScenarios) as SinScenario[];
type ScenarioSelection = SinScenario | 'custom';

function useSinText() {
  const {lang, t, navigate} = useApp();
  const locale = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale, {maximumFractionDigits: 1}), [locale]);
  return {t, navigate, q: (pt: string, en: string, es: string) => t(T(pt, en, es)), n: (value: number) => formatter.format(value)};
}

function SinSources({ids}: {ids: (keyof typeof sinReferences)[]}) {
  return <div className="reference-links sin-sources">
    {ids.map(id => <a key={id} href={sinReferences[id].url} target="_blank" rel="noopener noreferrer">
      {sinReferences[id].name}<Icon name="external"/>
    </a>)}
  </div>;
}

function PowerSlider({label, value, onChange}: {label: string; value: number; onChange: (value: number) => void}) {
  const id = useId();
  const {n} = useSinText();
  return <div className="sin-slider">
    <div><label htmlFor={id}>{label}</label><span>{n(value)} MW</span></div>
    <input id={id} type="range" min={0} max={sinMaxPower} step={500} value={value}
      aria-valuetext={`${n(value)} MW`} onChange={event => onChange(event.target.valueAsNumber)}/>
  </div>;
}

function OverviewMetrics({total}: {total: SinResult['total']}) {
  const {q, n} = useSinText();
  const items = [
    {label: q('Geração disponível', 'Available generation', 'Generación disponible'), value: total.available, icon: 'plant'},
    {label: q('Demanda do SIN', 'SIN demand', 'Demanda del SIN'), value: total.demand, icon: 'bolt'},
    {label: q('Carga atendida', 'Load served', 'Carga atendida'), value: total.served, icon: 'check'},
    {label: q('Déficit de potência', 'Power shortfall', 'Déficit de potencia'), value: total.deficit, icon: 'info', alert: total.deficit > 0}
  ];
  return <dl className="sin-metrics" aria-live="polite">
    {items.map(item => <div key={item.icon} className={`sin-panel sin-metric ${item.alert ? 'sin-metric-alert' : ''}`}>
      <dt><Icon name={item.icon}/>{item.label}</dt><dd>{n(item.value)} <small>MW</small></dd>
    </div>)}
  </dl>;
}

function Acre() {
  const {q, navigate} = useSinText();
  return <>
    <h3>Rio Branco, Acre</h3>
    <p>{q('Rio Branco tem conexão com o SIN pela área Acre–Rondônia. No planejamento energético do ONS, as usinas dessa área são representadas no Sudeste/Centro-Oeste. Os subsistemas elétricos seguem a organização da rede.',
      'Rio Branco connects to the SIN through the Acre–Rondônia area. In ONS energy planning, plants in this area are represented in the Southeast/Central-West. Power subsystems follow how the grid is organized.',
      'Rio Branco está conectado al SIN por el área Acre–Rondônia. En la planificación energética del ONS, sus centrales se representan en el Sudeste/Centro-Oeste. Los subsistemas eléctricos siguen la organización de la red.')}</p>
    <p>{q('Algumas localidades do Acre operam em sistemas isolados e dependem de geração local. Compare esses dois arranjos no Campus Amazônia.',
      'Some localities in Acre operate as isolated systems and depend on local generation. Compare the two arrangements in Amazon Campus.',
      'Algunas localidades de Acre funcionan en sistemas aislados y dependen de la generación local. Compara los dos esquemas en Campus Amazonía.')}</p>
    <SinSources ids={['acre', 'isolated']}/>
    <Button kind="quiet" icon="arrow" onClick={() => navigate('amazon')}>
      {q('Abrir Campus Amazônia', 'Open Amazon Campus', 'Abrir Campus Amazonía')}
    </Button>
  </>;
}

function RegionControls({region, data, onAdjust}: {
  region: SinRegion;
  data: SinResult['regions'][SinRegion];
  onAdjust: (field: 'available' | 'demand', value: number) => void;
}) {
  const {t, q, n} = useSinText();
  const metrics = [
    [q('Geração despachada', 'Dispatched generation', 'Generación despachada'), data.generated],
    [q('Importação', 'Import', 'Importación'), data.imported],
    [q('Exportação', 'Export', 'Exportación'), data.exported],
    [q('Geração disponível sem uso', 'Unused available generation', 'Generación disponible sin uso'), data.unused],
    [q('Carga atendida', 'Load served', 'Carga atendida'), data.served],
    [q('Déficit de potência', 'Power shortfall', 'Déficit de potencia'), data.deficit]
  ] as const;

  return <>
    <h3>{t(sinRegionText[region].name)}</h3>
    <p>{t(sinRegionText[region].detail)}</p>
    <PowerSlider label={q('Geração disponível', 'Available generation', 'Generación disponible')}
      value={data.available} onChange={value => onAdjust('available', value)}/>
    <PowerSlider label={q('Demanda', 'Demand', 'Demanda')} value={data.demand} onChange={value => onAdjust('demand', value)}/>
    <dl className="sin-region-readings" aria-live="polite">
      {metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{n(value)} MW</dd></div>)}
    </dl>
    <p className="sin-balance-eq">
      {n(data.generated)} + {n(data.imported)} − {n(data.exported)} = {n(data.served)} MW
      <small>{q('Geração despachada + importação − exportação = carga atendida',
        'Dispatched generation + import − export = load served', 'Generación despachada + importación − exportación = carga atendida')}</small>
    </p>
  </>;
}

function CorridorControls({corridors, onToggle}: {corridors: SinResult['corridors']; onToggle: (id: SinCorridor) => void}) {
  const {q, t, n} = useSinText();
  return <section className="sin-panel sin-corridors">
    <h2>{q('Intercâmbios entre subsistemas', 'Exchanges between subsystems', 'Intercambios entre subsistemas')}</h2>
    <p>{q('Altere a disponibilidade dos corredores. A direção e a potência transferida são recalculadas no mapa.',
      'Change corridor availability. Transfer direction and power are recalculated on the map.',
      'Cambia la disponibilidad de los corredores. La dirección y la potencia transferida se recalculan en el mapa.')}</p>
    <div className="sin-corridor-grid">
      {corridors.map(link => {
        const from = t(sinRegionText[link.from].short);
        const to = t(sinRegionText[link.to].short);
        const direction = link.flow < 0 ? `${to} → ${from}` : `${from} → ${to}`;
        const capacity = Math.abs(link.flow);
        const saturated = link.enabled && capacity === link.limit;
        return <div className="sin-corridor" key={link.id} data-state={!link.enabled ? 'off' : saturated ? 'limit' : 'normal'}>
          <div><h3>{from} ↔ {to}</h3>
            <label className="sin-corridor-toggle">
              <input type="checkbox" checked={link.enabled} onChange={() => onToggle(link.id)}
                aria-label={`${q('Disponibilidade do corredor', 'Corridor availability', 'Disponibilidad del corredor')} ${from} ↔ ${to}`}/>
              <span>{link.enabled ? q('Disponível', 'Available', 'Disponible') : q('Indisponível', 'Unavailable', 'No disponible')}</span>
            </label>
          </div>
          <p aria-live="polite"><strong>{n(capacity)} / {n(link.enabled ? link.limit : 0)} MW</strong>
            <span>{saturated
              ? `${direction} · ${q('No limite', 'At limit', 'Al límite')}`
              : capacity ? direction : q('Sem transferência', 'No transfer', 'Sin transferencia')}</span>
          </p>
          <div className="sin-capacity" aria-hidden="true"><span style={{width: `${100 * capacity / link.limit}%`}}/></div>
        </div>;
      })}
    </div>
  </section>;
}

function SinLesson({onChallenge}: {onChallenge: () => void}) {
  const {q} = useSinText();
  const [answer, setAnswer] = useState<number | null>(null);
  const name = useId();
  const options = [
    q('Falta geração disponível no conjunto do SIN.', 'There is insufficient available generation across the SIN.', 'Falta generación disponible en el conjunto del SIN.'),
    q('O corredor com o Sul atingiu seu limite de transferência.', 'The corridor to the South has reached its transfer limit.', 'El corredor con el Sur alcanzó su límite de transferencia.'),
    q('O corredor com o Sul está indisponível.', 'The corridor to the South is unavailable.', 'El corredor con el Sur no está disponible.')
  ];
  return <div className="sin-learning">
    <section className="sin-panel sin-lesson">
      <h2>{q('O que o mapa representa', 'What the map represents', 'Qué representa el mapa')}</h2>
      <p>{q('O SIN integra a geração e a transmissão de grande parte do Brasil. O ONS coordena a operação para equilibrar geração e consumo e aproveitar a diversidade de recursos entre quatro subsistemas.',
        'The SIN integrates generation and transmission across most of Brazil. ONS coordinates operation to balance generation and consumption and make use of diverse resources across four subsystems.',
        'El SIN integra la generación y la transmisión de gran parte de Brasil. El ONS coordina la operación para equilibrar generación y consumo y aprovechar los recursos de cuatro subsistemas.')}</p>
      <details>
        <summary>{q('Premissas do simulador', 'Simulation assumptions', 'Supuestos del simulador')}</summary>
        <p>{q('O modelo atende primeiro a demanda com a geração local e encaminha excedentes para maximizar a carga atendida. Cada corredor representa uma capacidade agregada, em MW. O balanço é instantâneo e considera perdas nulas. Mantidos 1.000 MW por duas horas, transferem-se 2.000 MWh.',
          'The model first serves demand with local generation and routes surplus to maximize load served. Each corridor represents aggregate capacity in MW. The balance is instantaneous and assumes zero losses. Holding 1,000 MW for two hours transfers 2,000 MWh.',
          'El modelo atiende primero la demanda con generación local y encamina excedentes para maximizar la carga atendida. Cada corredor representa una capacidad agregada en MW. El balance es instantáneo y considera pérdidas nulas. Mantener 1.000 MW durante dos horas transfiere 2.000 MWh.')}</p>
        <p>{q('Os traçados e limites são didáticos. Em estudos operacionais, a potência depende das características elétricas da rede e dos critérios de segurança, como tensão, frequência e resposta a contingências.',
          'Routes and limits are educational. In operational studies, flows depend on grid electrical properties and security criteria such as voltage, frequency and contingency response.',
          'Los trazados y límites son didácticos. En estudios operativos, los flujos dependen de las características eléctricas de la red y de criterios de seguridad como tensión, frecuencia y respuesta ante contingencias.')}</p>
      </details>
      <SinSources ids={['overview', 'balances', 'exchanges']}/>
    </section>
    <section className="sin-panel sin-lesson">
      <h2>{q('Desafio do operador', 'Operator challenge', 'Desafío del operador')}</h2>
      <p>{q('Carregue o cenário e compare o balanço do Sul com o limite do corredor.', 'Load the case and compare the South balance with the corridor limit.', 'Carga el escenario y compara el balance del Sur con el límite del corredor.')}</p>
      <Button kind="secondary" icon="target" onClick={onChallenge}>{q('Carregar cenário do desafio', 'Load challenge scenario', 'Cargar escenario del desafío')}</Button>
      <fieldset className="sin-quiz">
        <legend>{q('Por que faltam 1.000 MW no Sul?', 'Why is the South short 1,000 MW?', '¿Por qué faltan 1.000 MW en el Sur?')}</legend>
        {options.map((option, index) => <label key={index}>
          <input type="radio" name={name} checked={answer === index} onChange={() => setAnswer(index)}/>{option}
        </label>)}
        <div aria-live="polite">{answer !== null && <p className="sin-quiz-feedback" data-correct={answer === 1}>
          <strong>{answer === 1 ? q('Correto.', 'Correct.', 'Correcto.') : q('Confira o limite do corredor.', 'Check the corridor limit.', 'Comprueba el límite del corredor.')}</strong>{' '}
          {q('No cenário, 9.500 MW locais + 5.000 MW importados atendem 14.500 MW dos 15.500 MW demandados.',
            'In this case, 9,500 MW local + 5,000 MW imported serve 14,500 MW of the 15,500 MW demanded.',
            'En el escenario, 9.500 MW locales + 5.000 MW importados atienden 14.500 MW de los 15.500 MW demandados.')}
        </p>}</div>
      </fieldset>
    </section>
  </div>;
}

export default function Sin() {
  const {q, t} = useSinText();
  const [model, setModel] = useState<{scenario: ScenarioSelection; input: SinInput}>({scenario: 'reference', input: sinScenarios.reference});
  const [selected, setSelected] = useState<SinMapSelection>('central');
  const [playing, setPlaying] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const scenarioSelect = useRef<HTMLSelectElement>(null);
  const result = useMemo(() => calculateSin(model.input), [model.input]);
  const applyScenario = (scenario: SinScenario) => {
    setModel({scenario, input: sinScenarios[scenario]});
    if (scenario === 'wind') setSelected('northeast');
    else if (scenario === 'outage' || scenario === 'bottleneck') setSelected('south');
    else setSelected('central');
  };
  const adjust = (region: SinRegion, field: 'available' | 'demand', value: number) => {
    setModel(({input}) => ({scenario: 'custom', input: {...input, [field]: {...input[field], [region]: value}}}));
  };
  const toggle = (id: SinCorridor) => {
    setModel(({input}) => ({
      scenario: 'custom',
      input: {...input, disabled: input.disabled.includes(id) ? input.disabled.filter(item => item !== id) : [...input.disabled, id]}
    }));
  };
  return <div className="sin">
    <header className="sin-heading">
      <h1>{q('Sistema Interligado Nacional', 'Brazil’s National Interconnected System', 'Sistema Interconectado Nacional')} <span>SIN</span></h1>
      <p>{q('Explore os quatro subsistemas e simule como o intercâmbio de potência ajuda a atender a demanda.',
        'Explore all four subsystems and simulate how exchanging power helps serve demand.',
        'Explora los cuatro subsistemas y simula cómo el intercambio de potencia ayuda a atender la demanda.')}</p>
    </header>
    <OverviewMetrics total={result.total}/>
    <div className="sin-workspace">
      <section className="sin-panel sin-map-panel">
        <div className="sin-map-heading">
          <div><h2>{q('Mapa vivo do SIN', 'Live SIN map', 'Mapa dinámico del SIN')}</h2>
            <p>{q('Mapa esquemático · valores simulados', 'Schematic map · simulated values', 'Mapa esquemático · valores simulados')}</p>
          </div>
          <Button icon={playing ? 'pause' : 'play'} onClick={() => setPlaying(current => !current)}>
            {playing ? q('Pausar animação', 'Pause animation', 'Pausar animación') : q('Animar fluxos', 'Animate flows', 'Animar flujos')}
          </Button>
        </div>
        <SinNetworkMap result={result} selected={selected} onSelect={setSelected} playing={playing}/>
        <div className="sin-map-legend">
          <span><i className="sin-legend-flow"/>{q('Fluxo ativo', 'Active flow', 'Flujo activo')}</span>
          <span><i className="sin-legend-limit"/>{q('Corredor no limite', 'Corridor at limit', 'Corredor al límite')}</span>
          <span><i className="sin-legend-off"/>{q('Corredor indisponível', 'Corridor unavailable', 'Corredor no disponible')}</span>
        </div>
        <p className="sin-map-caption">{q('As setas mostram o sentido do intercâmbio. Selecione um subsistema ou Rio Branco para ver detalhes.',
          'Arrows show exchange direction. Select a subsystem or Rio Branco for details.',
          'Las flechas indican el sentido del intercambio. Selecciona un subsistema o Rio Branco para ver detalles.')}</p>
      </section>
      <section className="sin-panel sin-controls">
        <h2>{q('Controle da simulação', 'Simulation controls', 'Control de la simulación')}</h2>
        <label className="sin-select">{q('Cenário de operação', 'Operating scenario', 'Escenario de operación')}
          <select ref={scenarioSelect} value={model.scenario} onChange={event => applyScenario(event.target.value as SinScenario)}>
            {scenarioKeys.map(key => <option key={key} value={key}>{t(sinScenarioText[key].name)}</option>)}
            {model.scenario === 'custom' && <option value="custom" disabled>{q('Personalizado', 'Custom', 'Personalizado')}</option>}
          </select>
        </label>
        <p className="sin-scenario-detail" aria-live="polite">{model.scenario === 'custom'
          ? q('Ajustes manuais de geração, demanda ou disponibilidade dos corredores.', 'Manual adjustments to generation, demand or corridor availability.', 'Ajustes manuales de generación, demanda o disponibilidad de corredores.')
          : t(sinScenarioText[model.scenario].detail)}</p>
        <div className="sin-region-controls">
          {selected === 'acre' ? <Acre/> : <RegionControls region={selected} data={result.regions[selected]}
            onAdjust={(field, value) => adjust(selected, field, value)}/>}
        </div>
        <Button kind="quiet" icon="reset" onClick={() => applyScenario('reference')}>
          {q('Restaurar referência', 'Restore reference', 'Restaurar referencia')}
        </Button>
      </section>
    </div>
    <CorridorControls corridors={result.corridors} onToggle={toggle}/>
    <SinLesson onChallenge={() => {
      applyScenario('bottleneck');
      scenarioSelect.current?.focus();
    }}/>
  </div>;
}
