import {useId, useState} from 'react';
import {Button, Icon} from './components';
import {format, T} from './model';
import {useApp} from './store';
import {pvDefaults, pvId, pvLimits} from './pv-report-engine';
import type {PVLoad, PVSystem} from './pv-report-engine';
import {calculatePVPreview, createPVStudy, pvCalculatorDefaults} from './pv-calculator-engine';
import type {PVCalculatorField, PVCalculatorValues, PVPreview} from './pv-calculator-engine';
import {pvReferences} from './pv-report-content';
import {readSavedPVProject, savePVProject} from './pv-report-storage';
import type {Localized} from './types';

const modes = [
  {id: 'ongrid', icon: 'grid', label: 'On-grid', detail: T('Conectado à rede', 'Grid connected', 'Conectado a la red')},
  {id: 'offgrid', icon: 'bolt', label: 'Off-grid', detail: T('Operação autônoma', 'Stand-alone operation', 'Operación autónoma')},
  {id: 'hybrid', icon: 'layers', label: T('Híbrido', 'Hybrid', 'Híbrido'), detail: T('Rede e backup', 'Grid and backup', 'Red y respaldo')}
] as const;

const labels: Record<PVCalculatorField, {name: Localized; unit: string}> = {
  monthlyKwh: {name: T('Consumo médio mensal', 'Average monthly use', 'Consumo mensual medio'), unit: 'kWh'},
  hsp: {name: T('Horas de sol pleno · HSP', 'Peak sun hours · PSH', 'Horas de sol pico · HSP'), unit: 'h/d'},
  moduleW: {name: T('Potência por módulo', 'Module power', 'Potencia por módulo'), unit: 'Wp'},
  pr: {name: T('Fator de desempenho · PR', 'Performance ratio · PR', 'Factor de rendimiento · PR'), unit: '%'},
  days: {name: T('Dias do período', 'Days in period', 'Días del período'), unit: 'd'},
  coverage: {name: T('Meta de cobertura', 'Coverage target', 'Objetivo de cobertura'), unit: '%'},
  dcAc: {name: T('Relação CC/CA', 'DC/AC ratio', 'Relación CC/CA'), unit: ''},
  autonomyDays: {name: T('Autonomia desejada', 'Target autonomy', 'Autonomía deseada'), unit: 'd'},
  dod: {name: T('Profundidade de descarga · DoD', 'Depth of discharge · DoD', 'Profundidad de descarga · DoD'), unit: '%'}
};

function useCalculatorText() {
  const {t, lang, navigate, notify} = useApp();
  return {t, navigate, notify, q: (pt: string, en: string, es: string) => t(T(pt, en, es)),
    n: (value: number, decimals = 2) => format(value, lang, decimals)};
}

function CalculatorNumber({name, unit = '', value, onChange, min, max, integer = false}: {
  name: string; unit?: string; value: number; min: number; max: number; integer?: boolean;
  onChange: (value: number) => void;
}) {
  const invalid = !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value));
  return <label className="pv-field">
    <span>{name}</span>
    <span className="pv-number">
      <input type="number" inputMode={integer ? 'numeric' : 'decimal'} min={min} max={max} step={integer ? 1 : 'any'}
        value={Number.isFinite(value) ? value : ''} aria-invalid={invalid || undefined}
        onChange={event => onChange(event.target.valueAsNumber)}/>
      {unit && <small>{unit}</small>}
    </span>
  </label>;
}

function emptyLoad(): PVLoad {
  return {id: pvId(), name: '', quantity: 1, watts: 0, hours: 0, startFactor: 1, critical: true};
}

function Loads({loads, system, onChange}: {loads: PVLoad[]; system: PVSystem; onChange: (rows: PVLoad[]) => void}) {
  const {q, n} = useCalculatorText();
  return <section className="pv-calc-loads" aria-label={q('Inventário de cargas', 'Load inventory', 'Inventario de cargas')}>
    <div className="pv-calc-load-head">
      <div>
        <h3>{q('Inventário de cargas', 'Load inventory', 'Inventario de cargas')}</h3>
        <p>{system === 'hybrid'
          ? q('Marque as cargas que devem funcionar quando faltar energia da rede.', 'Mark the loads that must run during a grid outage.', 'Marca las cargas que deben funcionar cuando falle la red.')
          : q('Informe as horas equivalentes de uso por dia de cada equipamento.', 'Enter equivalent daily operating hours for each appliance.', 'Introduce las horas equivalentes de uso diario de cada equipo.')}</p>
      </div>
      <Button icon="plus" disabled={loads.length >= 30} onClick={() => onChange([...loads, emptyLoad()])}>
        {q('Adicionar carga', 'Add load', 'Añadir carga')}
      </Button>
    </div>
    {loads.map((load, index) => {
      const update = (values: Partial<PVLoad>) => onChange(loads.map(row => row.id === load.id ? {...row, ...values} : row));
      return <div className="pv-calc-load" key={load.id}>
        <div className="pv-calc-load-name">
          <label className="pv-field">
            <span>{q('Equipamento', 'Appliance', 'Equipo')} {index + 1}</span>
            <input value={load.name} maxLength={120} placeholder={q('Ex. Iluminação', 'E.g. Lighting', 'Ej. Iluminación')}
              onChange={event => update({name: event.target.value})}/>
          </label>
          <button className="icon-button" type="button" disabled={loads.length === 1}
            aria-label={`${q('Remover carga', 'Remove load', 'Eliminar carga')} ${index + 1}`}
            onClick={() => onChange(loads.filter(row => row.id !== load.id))}><Icon name="trash"/></button>
        </div>
        <div className="pv-calc-load-fields">
          <CalculatorNumber name={q('Quantidade', 'Quantity', 'Cantidad')} integer min={0} max={1000}
            value={load.quantity} onChange={quantity => update({quantity})}/>
          <CalculatorNumber name={q('Potência unitária', 'Unit power', 'Potencia unitaria')} unit="W" min={0} max={1000000}
            value={load.watts} onChange={watts => update({watts})}/>
          <CalculatorNumber name={q('Uso diário', 'Daily use', 'Uso diario')} unit="h/d" min={0} max={24}
            value={load.hours} onChange={hours => update({hours})}/>
          <CalculatorNumber name={q('Fator de partida', 'Starting factor', 'Factor de arranque')} unit="×" min={1} max={10}
            value={load.startFactor} onChange={startFactor => update({startFactor})}/>
        </div>
        <div className="pv-calc-load-foot">
          {system === 'hybrid' && <label><input type="checkbox" checked={load.critical}
            onChange={event => update({critical: event.target.checked})}/>
            {q('Carga de backup', 'Backup load', 'Carga de respaldo')}</label>}
          <span>{n(load.quantity * load.watts * load.hours / 1000)} kWh/d</span>
        </div>
      </div>;
    })}
  </section>;
}

function Comparison({target, generation, unit}: {target: number; generation: number; unit: string}) {
  const {q, n} = useCalculatorText();
  const max = Math.max(target, generation);
  const rows = [
    {name: q('Meta de energia', 'Energy target', 'Meta de energía'), value: target},
    {name: q('Estimativa FV', 'PV estimate', 'Estimación FV'), value: generation}
  ];
  return <div className="pv-calc-comparison">
    {rows.map((row, index) => <div key={row.name}>
      <span>{row.name}</span><strong>{n(row.value, 1)} {unit}</strong>
      <div className="pv-calc-track" aria-hidden="true"><span className={index === 1 ? 'pv-calc-track-fv' : ''}
        style={{width: `${max > 0 ? 100 * row.value / max : 0}%`}}/></div>
    </div>)}
  </div>;
}

function PreviewResults({preview}: {preview: PVPreview}) {
  const {q, n} = useCalculatorText();
  const {system, inputs} = preview;
  const autonomous = system === 'offgrid';
  const storage = system !== 'ongrid';
  const unit = autonomous ? 'kWh/d' : 'kWh';
  const effectiveLoad = autonomous ? preview.dailyLoad : preview.criticalDaily;
  const inverterBasis = autonomous
    ? q('Base de carga simultânea', 'Simultaneous load basis', 'Base de carga simultánea')
    : q('Base CC/CA e carga de backup quando aplicável', 'DC/AC ratio and backup load where applicable', 'Relación CC/CA y carga de respaldo cuando corresponda');
  return <>
    <div className="pv-calc-primary">
      <div><strong>{n(preview.neededModules, 0)}</strong>
        <span>{q('Módulos mínimos pela energia', 'Minimum modules by energy', 'Módulos mínimos por energía')}</span></div>
      <div><strong>{n(preview.installedKWp)} <small>kWp</small></strong>
        <span>{q('Potência do arranjo', 'Array capacity', 'Potencia del generador')}</span></div>
    </div>
    <Comparison target={preview.targetDaily * preview.periodDays} generation={preview.generation} unit={unit}/>
    <dl className="pv-result-list pv-calc-results">
      <div><dt>{q('Inversor de referência', 'Reference inverter', 'Inversor de referencia')}<small>{inverterBasis}</small></dt>
        <dd>{n(preview.referenceInverterKW)} kW</dd></div>
      {storage && <>
        <div><dt>{q('Consumo atendido pelo banco', 'Daily load served by the bank', 'Consumo atendido por el banco')}</dt><dd>{n(effectiveLoad)} kWh/d</dd></div>
        <div><dt>{q('Capacidade nominal mínima do banco', 'Minimum nominal battery capacity', 'Capacidad nominal mínima del banco')}</dt>
          <dd>{n(preview.batteryNeededKwh)} kWh</dd></div>
        <div><dt>{q('Pico estimado de partida', 'Estimated starting load', 'Pico estimado de arranque')}</dt><dd>{n(preview.surgeKW)} kW</dd></div>
      </>}
    </dl>
    <details className="pv-details pv-calc-math">
      <summary>{q('Memória de cálculo', 'Calculation breakdown', 'Memoria de cálculo')}</summary>
      <p>{q('Potência mínima do arranjo', 'Minimum array capacity', 'Potencia mínima del generador')}</p>
      <p className="pv-calc-equation">{n(preview.targetDaily)} kWh/d ÷ ({n(inputs.hsp)} h/d × {n(inputs.pr / 100)}{autonomous
        ? ` × ${n(inputs.inverterEff / 100)} × ${n(inputs.batteryRoundEff / 100)}` : ''}) ≈ {n(preview.requiredKWp)} kWp</p>
      <p>{q('Divida a potência mínima em watts pela potência unitária do módulo e arredonde para cima.',
        'Divide minimum array power in watts by the module rating and round up.',
        'Divide la potencia mínima en vatios por la potencia unitaria del módulo y redondea hacia arriba.')}</p>
      {storage && <>
        <p>{q('Capacidade nominal do banco · consumo diário × autonomia ÷ (DoD × eficiência de descarga × eficiência do inversor)',
          'Nominal battery capacity · daily consumption × autonomy ÷ (depth of discharge × discharge efficiency × inverter efficiency)',
          'Capacidad nominal del banco · consumo diario × autonomía ÷ (profundidad de descarga × eficiencia de descarga × eficiencia del inversor)')}</p>
        <p className="pv-calc-equation">{n(effectiveLoad)} kWh/d × {n(inputs.autonomyDays)} d ÷
          ({n(inputs.dod / 100)} × {n(inputs.batteryDisEff / 100, 3)} × {n(inputs.inverterEff / 100, 3)}) ≈ {n(preview.batteryNeededKwh)} kWh</p>
      </>}
    </details>
  </>;
}

export default function PVCalculator() {
  const {t, q, n, navigate, notify} = useCalculatorText();
  const [existing] = useState(() => readSavedPVProject('calculator'));
  const [system, setSystem] = useState<PVSystem>(() => existing?.system ?? 'ongrid');
  const [values, setValues] = useState<PVCalculatorValues>(() => existing?.inputs ?? {...pvCalculatorDefaults});
  const [loads, setLoads] = useState<PVLoad[]>(() => existing?.loads.some(load => load.quantity > 0) ? existing.loads : [emptyLoad()]);
  const headingId = useId();
  const preview = calculatePVPreview(system, values, loads, existing?.inputs);
  const storage = system !== 'ongrid';
  const offGrid = system === 'offgrid';
  const efficiency = existing?.inputs ?? pvDefaults;

  function field(key: PVCalculatorField) {
    return <CalculatorNumber key={key} name={t(labels[key].name)} unit={labels[key].unit} value={values[key]}
      min={pvLimits[key][0]} max={pvLimits[key][1]} integer={key === 'days'}
      onChange={value => setValues(previous => ({...previous, [key]: value}))}/>;
  }

  function example() {
    setSystem('ongrid');
    setValues({...pvCalculatorDefaults});
  }

  function detail() {
    if (preview.error !== null) return;
    const base = readSavedPVProject('calculator');
    const current = base ? calculatePVPreview(system, values, loads, base.inputs) : preview;
    if (current.error !== null) return;
    const project = createPVStudy(current, {
      title: q('Estudo da Calculadora FV', 'PV Calculator study', 'Estudio de la Calculadora FV'),
      moduleName: `${q('Módulo de referência', 'Reference module', 'Módulo de referencia')} · ${n(current.inputs.moduleW, 1)} Wp`,
      locationNote: q('HSP manual do pré-dimensionamento. Confirme as coordenadas e a irradiação no plano dos módulos.',
        'Manual peak sun hours from the preliminary study. Verify coordinates and plane-of-array irradiation.',
        'HSP manual del predimensionamiento. Verifica coordenadas e irradiación en el plano de módulos.')
    }, base);
    const saved = savePVProject(project, 'calculator');
    navigate('pvreport', 'solar', 'calculator');
    if (!saved) notify(q('Estudo aberto nesta sessão. Exporte o projeto para guardar uma cópia.',
      'Study opened for this session. Export the project to keep a copy.',
      'Estudio abierto en esta sesión. Exporta el proyecto para guardar una copia.'));
  }

  return <section className="pv-calc" aria-labelledby={headingId}>
    <header className="pv-calc-heading">
      <div><h1 id={headingId}>{q('Calculadora FV', 'PV Calculator', 'Calculadora FV')}</h1>
        <p>{q('Estime módulos, geração e autonomia a partir das condições do seu projeto.',
          'Estimate module count, generation and autonomy using your project conditions.',
          'Estima módulos, generación y autonomía según las condiciones de tu proyecto.')}</p>
      </div>
      <Button icon="reset" onClick={example}>{q('Carregar exemplo de 450 kWh', 'Load 450 kWh example', 'Cargar ejemplo de 450 kWh')}</Button>
    </header>
    <div className="pv-calc-modes" role="group" aria-label={q('Tipo de sistema fotovoltaico', 'PV system type', 'Tipo de sistema fotovoltaico')}>
      {modes.map(mode => <button key={mode.id} type="button" aria-pressed={system === mode.id} onClick={() => setSystem(mode.id)}>
        <Icon name={mode.icon}/><span><strong>{t(mode.label)}</strong><small>{t(mode.detail)}</small></span>
      </button>)}
    </div>
    <div className="pv-calc-grid">
      <section className="pv-card pv-calc-inputs">
        <h2>{q('Dados do sistema', 'System inputs', 'Datos del sistema')}</h2>
        <div className="pv-fields">
          {!offGrid && field('monthlyKwh')}{field('hsp')}{field('moduleW')}{field('pr')}
        </div>
        <p className="pv-note">{offGrid
          ? q('Informe a HSP do mês de projeto no plano dos módulos. O PR representa as perdas do arranjo e os rendimentos do inversor e da bateria entram à parte.',
            'Enter design-month peak sun hours in the array plane. PR accounts for array losses and inverter and battery efficiencies are applied separately.',
            'Introduce la HSP del mes de diseño en el plano de módulos. El PR representa pérdidas del generador y las eficiencias de inversor y batería se aplican aparte.')
          : q('Informe a HSP no plano dos módulos. O PR reúne as perdas estimadas até a saída CA. A HSP inicial de 4,5 h/d é didática.',
            'Enter peak sun hours in the array plane. PR includes estimated losses through AC output. The initial 4.5 h/d is an example.',
            'Introduce la HSP en el plano de módulos. El PR reúne las pérdidas estimadas hasta la salida CA. La HSP inicial de 4,5 h/d es didáctica.')}</p>
        {!offGrid && <details className="pv-details">
          <summary>{q('Dias, cobertura e relação CC/CA', 'Days, coverage and DC/AC ratio', 'Días, cobertura y relación CC/CA')}</summary>
          <div className="pv-fields">{field('days')}{field('coverage')}{field('dcAc')}</div>
        </details>}
        {storage && <>
          <div className="pv-fields">{field('autonomyDays')}{field('dod')}</div>
          <p className="pv-note">{q('Rendimentos adotados', 'Assumed efficiencies', 'Eficiencias adoptadas')} ·
            {' '}{q('inversor', 'inverter', 'inversor')} {n(efficiency.inverterEff, 0)}% ·
            {' '}{q('descarga', 'discharge', 'descarga')} {n(efficiency.batteryDisEff, 0)}%
            {offGrid && ` · ${q('ciclo da bateria', 'battery round trip', 'ciclo de batería')} ${n(efficiency.batteryRoundEff, 0)}%`}
          </p>
          <Loads loads={loads} system={system} onChange={setLoads}/>
        </>}
      </section>
      <section className="pv-card pv-calc-preview">
        <h2>{q('Pré-dimensionamento', 'Preliminary sizing', 'Predimensionamiento')}</h2>
        <div aria-live="polite">
          {preview.error === null ? <PreviewResults preview={preview}/> : <p className="pv-notice pv-error">
            {preview.error === 'demand'
              ? q('Inclua uma carga com potência e horas de uso. No híbrido, marque pelo menos uma carga de backup.',
                'Add a load with power and operating hours. For hybrid systems, mark at least one backup load.',
                'Incluye una carga con potencia y horas de uso. En híbrido, marca al menos una carga de respaldo.')
              : q('Confira os campos destacados. Use valores dentro dos limites e quantidade inteira para cargas e dias do período.',
                'Check the highlighted fields. Use values within range and whole numbers for load quantities and period days.',
                'Revisa los campos marcados. Usa valores dentro de los límites y enteros para cantidades de cargas y días.')}
          </p>}
        </div>
        <p className="pv-note">{q('A estimativa usa as premissas informadas. No relatório, o arranjo final depende do datasheet, da janela MPPT e dos limites elétricos.',
          'The estimate uses the entered assumptions. In the report, final array sizing depends on datasheets, the MPPT window and electrical limits.',
          'La estimación utiliza los supuestos indicados. En el informe, el generador final depende de las fichas técnicas, la ventana MPPT y los límites eléctricos.')}</p>
        {existing && <p className="pv-note">{q('Detalhar projeto atualiza os dados desta calculadora no estudo salvo.',
          'Detail project applies these calculator inputs to the saved study.',
          'Detallar proyecto aplica estos datos de la calculadora al estudio guardado.')}</p>}
        <div className="pv-calc-actions">
          <Button icon="arrow" kind="primary" disabled={preview.error !== null} onClick={detail}>
            {q('Detalhar projeto', 'Detail project', 'Detallar proyecto')}
          </Button>
          {existing && <Button icon="book" onClick={() => navigate('pvreport', 'solar', 'calculator')}>
            {q('Abrir estudo detalhado', 'Open detailed study', 'Abrir estudio detallado')}
          </Button>}
        </div>
      </section>
    </div>
    <div className="pv-calc-references">
      {pvReferences.filter(ref => ref.name.startsWith('INPE/')).map(ref =>
        <a key={ref.url} href={ref.url} target="_blank" rel="noopener noreferrer">{ref.name}<Icon name="external"/></a>)}
    </div>
  </section>;
}
