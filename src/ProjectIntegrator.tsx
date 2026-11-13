import {useMemo, useRef, useState} from 'react';
import {Button, Download, Icon} from './components';
import {useApp} from './store';
import {useLearning} from './learning-store';
import {T, format} from './model';
import {
  designLimits, integratorSteps, newIntegratorRecord, simulationLimits,
  type IntegratorRecord, type IntegratorStep, type ProjectLoad
} from './integrator-schema';
import {
  compareSchool, deficitTolerance, estimateSchool, projectEfficiencies, submissionReadiness, suggestedEquipment,
  type SchoolComparison, type SchoolEstimate
} from './integrator-engine';
import {
  batteryFormula, caseLabel, caseReferences, choices, comparisonRows, dispatchAssumptions, energyFormula, equipmentName, labels,
  projectBrief, projectName, projectSteps, pvFormula, rubric, scenarios, schoolTitle, simulationScope, studyScope
} from './integrator-content';
import {makeProjectReport, projectDiagram} from './integrator-report';
import type {Localized} from './types';

const emptyProject = newIntegratorRecord();
const hourLabel = (hour: number) => String(hour).padStart(2, '0') + ':00';

function useProjectText() {
  const {lang, t} = useApp();
  return {lang, t, q: (pt: string, en: string, es: string) => t(T(pt, en, es)),
    n: (value: number, digits = 2) => format(value, lang, digits)};
}

export function ProjectEntry() {
  const {t, q} = useProjectText();
  const {record} = useLearning();
  return <section className="panel integrator-entry">
    <img src={BIO_ASSETS['carbon-microgrid']} alt="" width="420" height="220"/>
    <div>
      <p className="eyebrow">{t(projectName)}</p>
      <h2>{t(schoolTitle)}</h2>
      <p>{q('Dimensione a microrrede, compare dois cenários de geração e prepare a entrega para avaliação.',
        'Size the microgrid, compare two generation scenarios and prepare a submission for review.',
        'Dimensiona la microrred, compara dos escenarios de generación y prepara la entrega para evaluación.')}</p>
    </div>
    <a className="button primary" href="#activities/solar/projeto-integrador">
      <Icon name={record.integrator ? 'book' : 'arrow'}/>
      {record.integrator ? q('Continuar projeto', 'Continue project', 'Continuar proyecto') : q('Abrir projeto', 'Open project', 'Abrir proyecto')}
    </a>
  </section>;
}

function ProjectNumber({label, value, range, onChange, integer = false, unit, context}: {
  label: Localized; value: number; range: readonly [number, number]; onChange: (value: number) => void;
  integer?: boolean; unit?: string; context?: string;
}) {
  const {t, q, n} = useProjectText();
  const [invalid, setInvalid] = useState<string | null>(null);
  const [min, max] = range;
  return <label className="integrator-field">
    <span>{t(label)}{unit && <small> · {unit}</small>}</span>
    <input type="number" inputMode={integer ? 'numeric' : 'decimal'} min={min} max={max} step={integer ? 1 : 'any'}
      aria-label={[t(label), unit, context].filter(Boolean).join(' · ')} aria-invalid={invalid !== null || undefined}
      value={invalid ?? value} onBlur={() => setInvalid(null)} onChange={event => {
        const next = event.currentTarget.valueAsNumber;
        const valid = Number.isFinite(next) && next >= min && next <= max && (!integer || Number.isInteger(next));
        setInvalid(valid ? null : event.currentTarget.value);
        if (valid) onChange(next);
      }}/>
    {invalid !== null && <small role="status">
      {q('Informe um valor de', 'Enter a value from', 'Introduce un valor de')} {n(min, integer ? 0 : 2)}–{n(max, integer ? 0 : 2)}.
    </small>}
  </label>;
}

function ProjectMetrics({items}: {items: [string, string][]}) {
  return <dl className="integrator-metrics">
    {items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>;
}

function Inventory({loads, estimate, onChange}: {loads: ProjectLoad[]; estimate: SchoolEstimate; onChange: (rows: ProjectLoad[]) => void}) {
  const {lang, t, q, n} = useProjectText();
  const rows = estimate.rows;
  const add = () => onChange([
    ...loads,
    {id: crypto.randomUUID?.() ?? Date.now().toString(36), label: '', watts: 0, quantity: 1, start: 8, end: 9, duty: 1, essential: false}
  ]);
  return <>
    <ProjectMetrics items={[
      [t(labels.demand), n(estimate.daily, 3) + ' kWh/d'],
      [t(labels.essentialDemand), n(estimate.essential, 3) + ' kWh/d'],
      [t(labels.peak), n(estimate.peak, 3) + ' kW']
    ]}/>
    <p>{q('Revise o inventário inicial. Marque as cargas essenciais e distribua os horários para observar a simultaneidade.',
      'Review the initial inventory. Mark essential loads and change schedules to see which loads overlap.',
      'Revisa el inventario inicial. Marca las cargas esenciales y ajusta los horarios para observar la simultaneidad.')}</p>
    <div className="integrator-loads">
      {rows.map((row, index) => {
        const name = equipmentName(row, lang);
        const equipment = t(labels.equipment) + ' ' + (index + 1);
        const update = (patch: Partial<ProjectLoad>) => onChange(loads.map(other => other.id === row.id ? {...other, ...patch} : other));
        return <fieldset className="integrator-load" key={row.id}>
          <legend className="sr-only">{name || equipment}</legend>
          <label className="integrator-field integrator-load-name">
            <span>{equipment}</span>
            <input value={name} onChange={event => update({label: event.target.value})} maxLength={100}/>
          </label>
          <ProjectNumber label={labels.quantity} context={equipment} range={[1, 100]} integer value={row.quantity} onChange={quantity => update({quantity})}/>
          <ProjectNumber label={labels.watts} context={equipment} unit="W" range={[0, 20000]} value={row.watts} onChange={watts => update({watts})}/>
          <ProjectNumber label={labels.start} context={equipment} unit="h" range={[0, 23]} integer value={row.start} onChange={start => update({start})}/>
          <ProjectNumber label={labels.end} context={equipment} unit="h" range={[0, 24]} integer value={row.end} onChange={end => update({end})}/>
          <ProjectNumber label={labels.duty} context={equipment} unit="%" range={[0, 100]} value={Number((row.duty * 100).toFixed(6))}
            onChange={duty => update({duty: duty / 100})}/>
          <div className="integrator-load-actions">
            <label><input type="checkbox" checked={row.essential} aria-label={t(labels.essential) + ' · ' + equipment}
              onChange={event => update({essential: event.target.checked})}/>{t(labels.essential)}</label>
            <strong>{n(row.kWh, 3)} kWh/d</strong>
            <button type="button" className="icon-button" aria-label={q('Remover', 'Remove', 'Eliminar') + ' · ' + (name || equipment)}
              onClick={() => onChange(loads.filter(other => other.id !== row.id))} disabled={rows.length <= 1}><Icon name="trash"/></button>
          </div>
        </fieldset>;
      })}
    </div>
    <div className="integrator-actions">
      <Button icon="plus" onClick={add} disabled={rows.length >= 30}>{q('Adicionar carga', 'Add load', 'Añadir carga')}</Button>
      {estimate.peak > 0 && <span>{q('Primeiro pico horário às', 'First hourly peak at', 'Primer pico horario a las')} {hourLabel(estimate.peakHour)}</span>}
    </div>
    <aside className="integrator-note">
      <code>{t(energyFormula)}</code>
      <p>{q('O tempo ativo é a fração da janela em que a carga funciona. Use 00–24 h para o dia inteiro. Um fim anterior ao início atravessa a meia-noite.',
        'Active time is the fraction of the window when the load runs. Use 00–24 h for the full day. An end before the start crosses midnight.',
        'El tiempo activo es la fracción del horario en que funciona la carga. Usa 00–24 h para todo el día. Un fin anterior al inicio cruza la medianoche.')}</p>
      {!estimate.inventoryReady && <p className="integrator-alert" role="status">{q(
        'Para completar o inventário, dê nome a todas as cargas, informe consumo positivo e marque ao menos uma como essencial.',
        'To complete the inventory, name each load, enter positive consumption and mark at least one essential.',
        'Para completar el inventario, nombra cada carga, indica un consumo positivo y marca al menos una esencial.')}</p>}
    </aside>
  </>;
}

function Sizing({record, estimate, onChange, onApply}: {
  record: IntegratorRecord; estimate: SchoolEstimate;
  onChange: (inputs: IntegratorRecord['design']) => void;
  onApply: (values: NonNullable<ReturnType<typeof suggestedEquipment>>) => void;
}) {
  const {t, q, n} = useProjectText();
  const {design} = record;
  const {preview} = estimate;
  const suggestion = preview && suggestedEquipment(preview);
  const fields = {hsp: 'h/d', moduleW: 'Wp', pr: '%', autonomyDays: 'd', dod: '%'};
  return <>
    <p>{q('Estime a potência do campo solar e a capacidade do banco para toda a escola. As horas de sol pleno representam o total diário de irradiação equivalente a 1 kW/m².',
      'Estimate PV power and battery capacity for the whole school. Peak sun hours express daily irradiation as equivalent hours at 1 kW/m².',
      'Estima la potencia solar y la capacidad de las baterías para toda la escuela. Las horas solares pico expresan la irradiación diaria equivalente a 1 kW/m².')}</p>
    <div className="integrator-fields">
      {(Object.keys(fields) as (keyof typeof fields)[]).map(key => <ProjectNumber key={key} label={labels[key]} unit={fields[key]}
        value={design[key]} range={designLimits[key]} onChange={value => onChange({...design, [key]: value})}/>)}
    </div>
    {preview ? <>
      <ProjectMetrics items={[
        [q('Campo FV calculado', 'Calculated PV array', 'Campo FV calculado'), n(preview.requiredKWp, 3) + ' kWp'],
        [t(labels.modules), n(preview.neededModules, 0) + ' · ' + n(preview.installedKWp, 3) + ' kWp'],
        [t(labels.batteryKWh), n(preview.batteryNeededKwh) + ' kWh'],
        [q('Soma das potências nominais', 'Sum of nameplate ratings', 'Suma de potencias nominales'), n(preview.referenceInverterKW, 3) + ' kW']
      ]}/>
      <div className="integrator-actions">
        <Button kind="primary" icon="arrow" disabled={!suggestion}
          onClick={() => {if (suggestion) onApply(suggestion);}}>{q('Usar estimativa na simulação', 'Use estimate in simulation', 'Usar estimación en la simulación')}</Button>
        {!suggestion && <span role="status">{q('A estimativa excede os limites da bancada. Revise os parâmetros ou simule um arranjo menor.',
          'The estimate exceeds the bench limits. Revise the inputs or simulate a smaller system.',
          'La estimación supera los límites del banco. Revisa los parámetros o simula un sistema menor.')}</span>}
      </div>
    </> : <p className="integrator-alert" role="status">{q('Informe uma demanda diária maior que zero no inventário.', 'Enter positive daily demand in the inventory.', 'Introduce una demanda diaria positiva en el inventario.')}</p>}
    <aside className="integrator-note">
      <code>{t(pvFormula)}</code><code>{t(batteryFormula)}</code>
      <p>{q('Eficiências adotadas · inversor', 'Assumed efficiencies · inverter', 'Eficiencias adoptadas · inversor')} {n(projectEfficiencies.inverterEff, 0)}% · {q('ciclo da bateria', 'battery cycle', 'ciclo de batería')} {n(projectEfficiencies.batteryRoundEff, 2)}% · {q('descarga', 'discharge', 'descarga')} {n(projectEfficiencies.batteryDisEff, 0)}%.</p>
      <p>{q('Na estimativa FV, toda a energia passa pelo ciclo da bateria. Arredonde a quantidade de módulos para cima. A soma nominal ajuda a estimar o inversor antes de verificar simultaneidade e partidas.',
        'The PV estimate assumes that all energy passes through the battery cycle. Round the module count up. The nameplate sum helps estimate inverter size before checking overlap and starting loads.',
        'La estimación FV supone que toda la energía pasa por el ciclo de batería. Redondea hacia arriba la cantidad de módulos. La suma nominal orienta la potencia del inversor antes de verificar simultaneidad y arranques.')}</p>
    </aside>
  </>;
}

function SOCChart({comparison}: {comparison: SchoolComparison}) {
  const {q, t} = useProjectText();
  const {solar, diesel, input} = comparison;
  const width = 600, height = 188, x = 46, y = 14, span = 530, plotHeight = 142;
  const yAt = (soc: number) => y + plotHeight * (1 - soc / 100);
  const xAt = (hour: number) => x + span * hour / 24;
  const points = (rows: SchoolComparison['solar']['rows']) =>
    [[0, input.socStart], ...rows.map(row => [row.hour + 1, row.soc])].map(([hour, soc]) => xAt(hour) + ',' + yAt(soc)).join(' ');
  return <figure className="integrator-chart">
    <figcaption>{q('Estado de carga da bateria ao longo do dia', 'Battery state of charge throughout the day', 'Estado de carga de la batería durante el día')}</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {[0, 25, 50, 75, 100].map(tick => <g key={tick}>
        <path d={`M${x} ${yAt(tick)}H${x + span}`} className="integrator-chart-grid"/>
        <text x={x - 7} y={yAt(tick) + 4} textAnchor="end">{tick}%</text>
      </g>)}
      {[0, 6, 12, 18, 24].map(tick => <text key={tick} x={xAt(tick)} y={height - 7} textAnchor="middle">{tick}h</text>)}
      <path d={`M${x} ${yAt(input.socMin)}H${x + span}`} className="integrator-chart-floor"/>
      <polyline points={points(solar.rows)} className="integrator-line-a"/>
      <polyline points={points(diesel.rows)} className="integrator-line-b"/>
    </svg>
    <div className="integrator-legend">
      <span><i className="integrator-line-a"/>A · {t(scenarios.solar)}</span>
      <span><i className="integrator-line-b"/>B · {t(scenarios.diesel)}</span>
      <span><i className="integrator-chart-floor"/>{q('SOC mínimo', 'Minimum SOC', 'SOC mínimo')} {input.socMin}%</span>
    </div>
  </figure>;
}

function ComparisonResults({comparison}: {comparison: SchoolComparison}) {
  const {lang, t, q, n} = useProjectText();
  const {solar, diesel} = comparison;
  const avoided = Math.max(0, solar.unservedKWh - diesel.unservedKWh);
  return <div className="integrator-results">
    <p className="integrator-result-summary" role="status">
      <Icon name={avoided > deficitTolerance ? 'target' : 'info'}/>
      {avoided > deficitTolerance
        ? q('O gerador reduziu o déficit em', 'The generator reduced the shortfall by', 'El generador redujo el déficit en') + ' ' + n(avoided, 3) + ' kWh.'
        : q('Os cenários tiveram o mesmo déficit. Compare o SOC final e o combustível disponível.',
          'Both scenarios had the same shortfall. Compare final SOC and available fuel.',
          'Los escenarios tuvieron el mismo déficit. Compara el SOC final y el combustible disponible.')}
    </p>
    <div className="integrator-comparison">
      <div className="integrator-table">
        <table>
          <thead><tr><th>{q('Indicador em 24 h', '24-hour metric', 'Indicador en 24 h')}</th>
            <th scope="col">A <span className="sr-only">{t(scenarios.solar)}</span></th><th scope="col">B <span className="sr-only">{t(scenarios.diesel)}</span></th></tr></thead>
          <tbody>{comparisonRows(comparison, lang).map(([name, a, b]) => <tr key={name}><th scope="row">{name}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table>
      </div>
      <SOCChart comparison={comparison}/>
    </div>
    <details className="integrator-details">
      <summary>{q('Consultar resultados por hora', 'View hourly results', 'Consultar resultados por hora')}</summary>
      <div className="integrator-table">
        <table>
          <thead><tr>{[q('Hora inicial', 'Start hour', 'Hora inicial'), q('Demanda (kWh)', 'Demand (kWh)', 'Demanda (kWh)'),
            q('Déficit A (kWh)', 'Shortfall A (kWh)', 'Déficit A (kWh)'), q('Déficit B (kWh)', 'Shortfall B (kWh)', 'Déficit B (kWh)'),
            q('SOC A (%)', 'SOC A (%)', 'SOC A (%)'), q('SOC B (%)', 'SOC B (%)', 'SOC B (%)')].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{solar.rows.map((a, index) => {
            const b = diesel.rows[index];
            return <tr key={a.hour}><th scope="row">{hourLabel(a.hour)}</th><td>{n(a.load, 3)}</td><td>{n(a.unserved, 3)}</td>
              <td>{n(b.unserved, 3)}</td><td>{n(a.soc, 1)}</td><td>{n(b.soc, 1)}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </details>
  </div>;
}

function Compare({record, comparison, estimate, onChange, onRun}: {
  record: IntegratorRecord; comparison: SchoolComparison | null; estimate: SchoolEstimate;
  onChange: (values: IntegratorRecord['simulation']) => void; onRun: () => void;
}) {
  const {lang, t, q, n} = useProjectText();
  const {design, simulation, compared} = record;
  const fields = {hsp: 'h/d', modules: '', batteryKWh: 'kWh', inverterKW: 'kW', socStart: '%', generatorKW: 'kW', fuelLiters: 'L'};
  const pvKWp = simulation.modules * design.moduleW / 1000;
  const socMin = 100 - design.dod;
  return <>
    <p>{q('Simule um dia crítico com a mesma demanda e o mesmo arranjo fotovoltaico nos dois cenários. Somente o cenário B dispõe de gerador.',
      'Simulate a difficult day with the same demand and PV setup in both scenarios. Only scenario B has a generator.',
      'Simula un día crítico con la misma demanda y el mismo sistema FV en ambos escenarios. Solo el escenario B dispone de generador.')}</p>
    <div className="integrator-scenarios">
      <strong><span>A</span>{t(scenarios.solar)}</strong>
      <strong><span>B</span>{t(scenarios.diesel)}</strong>
    </div>
    <div className="integrator-fields">
      {(Object.keys(fields) as (keyof typeof fields)[]).map(key => <ProjectNumber key={key} label={labels[key]} unit={fields[key]}
        integer={key === 'modules'} value={simulation[key]} range={key === 'socStart' ? [socMin, 100] : simulationLimits[key]}
        onChange={value => onChange({...simulation, [key]: value})}/>)}
    </div>
    <p className="integrator-muted">{q('Campo FV', 'PV array', 'Campo FV')} {n(pvKWp, 3)} kWp · {q('SOC mínimo', 'Minimum SOC', 'SOC mínimo')} {n(socMin, 1)}% · {t(labels.demand)} {n(estimate.daily, 3)} kWh/d</p>
    <div className="integrator-actions">
      <Button kind="primary" icon="play" disabled={!comparison || estimate.daily <= 0} onClick={onRun}>
        {q('Simular 24 horas', 'Simulate 24 hours', 'Simular 24 horas')}</Button>
      {!comparison && <span className="integrator-alert" role="status">{q('O campo FV excede o limite de 50 kWp da bancada.',
        'The array exceeds the bench limit of 50 kWp.', 'El campo FV supera el límite de 50 kWp del banco.')}</span>}
      {estimate.daily <= 0 && <span className="integrator-alert" role="status">{q('Informe demanda no inventário.', 'Enter demand in the inventory.', 'Introduce la demanda en el inventario.')}</span>}
    </div>
    {compared && comparison && <ComparisonResults comparison={comparison}/>}
    <details className="integrator-details">
      <summary>{q('Premissas do despacho', 'Dispatch assumptions', 'Supuestos del despacho')}</summary>
      <div className="integrator-details-body"><p>{t(simulationScope)}</p>
        {comparison && <ul>{dispatchAssumptions(comparison, lang).map(line => <li key={line}>{line}</li>)}</ul>}</div>
    </details>
  </>;
}

function Delivery({record, estimate, comparison, onChange}: {
  record: IntegratorRecord; estimate: SchoolEstimate; comparison: SchoolComparison | null; onChange: (change: Partial<IntegratorRecord>) => void;
}) {
  const {lang, t, q} = useProjectText();
  const ready = submissionReadiness(record, estimate, comparison);
  const complete = Object.values(ready).every(Boolean);
  const canReview = ready.inventory && ready.sizing && ready.comparison && ready.analysis;
  const diagram = projectDiagram(record.choice === 'diesel', lang);
  const pending: [boolean, string][] = [
    [ready.inventory, t(projectSteps.loads.label)], [ready.sizing, t(projectSteps.sizing.label)],
    [ready.comparison, t(projectSteps.compare.label)], [ready.analysis, q('Decisão e plano de manutenção', 'Decision and maintenance plan', 'Decisión y plan de mantenimiento')],
    [ready.reviewed, q('Revisão do aluno', 'Student review', 'Revisión del estudiante')]
  ];
  return <>
    <p>{q('Defenda a proposta com os números da simulação. Informe como a escola pode acompanhar o sistema e quais dados faltam para um projeto real.',
      'Defend the proposal using the simulation results. Explain how the school can monitor the system and what data are missing for a real project.',
      'Defiende la propuesta con los resultados de la simulación. Explica cómo la escuela puede supervisar el sistema y qué datos faltan para un proyecto real.')}</p>
    <div className="integrator-fields">
      <label className="integrator-field"><span>{t(labels.author)}</span><input value={record.author} maxLength={80} onChange={event => onChange({author: event.target.value})}/></label>
      <label className="integrator-field"><span>{q('Decisão proposta', 'Proposed decision', 'Decisión propuesta')}</span>
        <select value={record.choice} onChange={event => onChange({choice: event.target.value as IntegratorRecord['choice'], reviewed: false})}>
          <option value="">{q('Selecione uma decisão', 'Select a decision', 'Selecciona una decisión')}</option>
          {(Object.keys(choices) as (keyof typeof choices)[]).map(key => <option key={key} value={key}>{t(choices[key])}</option>)}
        </select>
      </label>
    </div>
    <div className="integrator-writing">
      <label className="integrator-field"><span>{t(labels.rationale)}</span>
        <small>{q('Use o déficit de energia, o SOC final e os litros consumidos para justificar sua escolha.',
          'Use the energy shortfall, final SOC and fuel used to justify your choice.',
          'Usa el déficit de energía, el SOC final y el combustible consumido para justificar tu elección.')}</small>
        <textarea value={record.rationale} maxLength={2400} onChange={event => onChange({rationale: event.target.value, reviewed: false})}/>
      </label>
      <label className="integrator-field"><span>{t(labels.maintenance)}</span>
        <small>{q('Defina ações, periodicidade e responsáveis. Considere umidade, cheias e o acesso por barco.',
          'Define actions, frequency and responsibilities. Consider humidity, flooding and access by boat.',
          'Define acciones, frecuencia y responsables. Considera la humedad, las crecidas y el acceso por barco.')}</small>
        <textarea value={record.maintenance} maxLength={2400} onChange={event => onChange({maintenance: event.target.value, reviewed: false})}/>
      </label>
      <label className="integrator-field"><span>{t(labels.fieldData)}</span>
        <small>{q('Registre o que precisa ser medido ou consultado para validar a proposta.',
          'Record what must be measured or researched to validate the proposal.',
          'Registra lo que hay que medir o consultar para validar la propuesta.')}</small>
        <textarea value={record.fieldData} maxLength={2400} onChange={event => onChange({fieldData: event.target.value, reviewed: false})}/>
      </label>
    </div>
    <figure className="integrator-diagram">
      <figcaption>{q('Diagrama funcional', 'Functional diagram', 'Diagrama funcional')} · {record.choice === 'diesel' ? 'B' : 'A'}</figcaption>
      <div dangerouslySetInnerHTML={{__html: diagram.svg}}/>
      <p className="integrator-muted">{diagram.caption}</p>
    </figure>
    <details className="integrator-details">
      <summary>{t(labels.rubric)}</summary>
      <dl className="integrator-rubric">{rubric.map(item => <div key={t(item.title)}><dt>{item.weight}% · {t(item.title)}</dt><dd>{t(item.evidence)}</dd></div>)}</dl>
    </details>
    <div className="integrator-readiness">
      <strong role="status">{complete ? q('Pronto para revisão docente', 'Ready for instructor review', 'Listo para revisión docente')
        : q('Rascunho · evidências pendentes', 'Draft · evidence pending', 'Borrador · evidencias pendientes')}</strong>
      <ul>{pending.map(([ok, label]) => <li key={label}><Icon name={ok ? 'check' : 'clock'}/>{label}
        <span className="sr-only"> · {ok ? q('Completo', 'Complete', 'Completo') : q('Pendente', 'Pending', 'Pendiente')}</span></li>)}</ul>
      {canReview && <label className="integrator-review"><input type="checkbox" checked={record.reviewed}
        onChange={event => onChange({reviewed: event.target.checked})}/>
        {q('Revisei a justificativa com os resultados do ensaio atual.', 'I checked my justification against the current run.',
          'Revisé la justificación con los resultados del ensayo actual.')}</label>}
      <Button kind="primary" icon="download" onClick={() => Download('BioEnergia_Projeto_Integrador.html',
        makeProjectReport(record, estimate, comparison, lang, SENAI_HUB_LOGO), 'text/html;charset=utf-8')}>
        {complete ? q('Baixar entrega técnica', 'Download technical submission', 'Descargar entrega técnica') : q('Baixar rascunho', 'Download draft', 'Descargar borrador')}
      </Button>
      <p className="integrator-muted">{q('Abra o arquivo HTML e use Imprimir / Salvar em PDF. A avaliação é feita pelo docente com a rubrica.',
        'Open the HTML file and use Print / Save as PDF. The instructor assesses the submission using the rubric.',
        'Abre el archivo HTML y usa Imprimir / Guardar como PDF. El docente evalúa la entrega con la rúbrica.')}</p>
    </div>
  </>;
}

export default function ProjectIntegrator() {
  const {t, q} = useProjectText();
  const {record: notebook, patch, storage} = useLearning();
  const record = notebook.integrator ?? emptyProject;
  const {step, loads, design, simulation} = record;
  const stage = useRef<HTMLHeadingElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const estimate = useMemo(() => estimateSchool({loads, design}), [loads, design]);
  const comparison = useMemo(() => compareSchool({loads, design, simulation}), [loads, design, simulation]);
  const index = integratorSteps.indexOf(step);
  const update = (values: Partial<IntegratorRecord>) => patch({integrator: {
    ...record, ...values, reviewed: values.compared === false ? false : values.reviewed ?? record.reviewed
  }});
  const open = (next: IntegratorStep, values: Partial<IntegratorRecord> = {}) => {
    update({...values, step: next});
    requestAnimationFrame(() => {
      stage.current?.focus({preventScroll: true});
      navigation.current?.scrollIntoView({block: 'start', behavior: 'instant'});
    });
  };
  return <div className="integrator">
    <a className="integrator-back" href="#activities/solar"><Icon name="back"/>
      {q('Missões de aprendizagem', 'Learning missions', 'Misiones de aprendizaje')}</a>
    <header className="integrator-hero">
      <div>
        <p className="eyebrow">{t(projectName)} · {t(caseLabel)}</p>
        <h1>{t(schoolTitle)}</h1>
        <p>{t(projectBrief)}</p>
      </div>
      <figure>
        <img src={BIO_ASSETS['carbon-microgrid']} width="420" height="220" alt={q('Vista ilustrativa de módulos solares em uma comunidade ribeirinha.',
          'Illustration of solar modules in a riverside community.', 'Vista ilustrativa de módulos solares en una comunidad ribereña.')}/>
        <figcaption>{q('Imagem ilustrativa', 'Illustrative image', 'Imagen ilustrativa')}</figcaption>
      </figure>
    </header>
    {storage === 'loading' ? <p role="status">{q('Abrindo o caderno…', 'Opening notebook…', 'Abriendo el cuaderno…')}</p> : <>
      <nav className="integrator-steps" ref={navigation} aria-label={q('Etapas do projeto', 'Project steps', 'Etapas del proyecto')}>
        {integratorSteps.map(key => <button type="button" key={key} aria-current={key === step ? 'step' : undefined}
          onClick={() => open(key)}><Icon name={projectSteps[key].icon}/>{t(projectSteps[key].label)}</button>)}
      </nav>
      <section className="panel integrator-stage" aria-labelledby="integrator-stage-title">
        <div className="integrator-stage-head">
          <h2 ref={stage} tabIndex={-1} id="integrator-stage-title">{t(projectSteps[step].label)}</h2>
          <span className={storage === 'memory' ? 'integrator-alert' : 'integrator-storage'}>
            <Icon name="save"/>{storage === 'memory' ? q('Caderno sem armazenamento local', 'Notebook without local storage', 'Cuaderno sin almacenamiento local')
              : q('Progresso no caderno offline', 'Progress in offline notebook', 'Progreso en el cuaderno sin conexión')}</span>
        </div>
        {step === 'loads' && <Inventory loads={loads} estimate={estimate} onChange={loads => update({loads, compared: false})}/>}
        {step === 'sizing' && <Sizing record={record} estimate={estimate} onChange={design =>
          update({design, simulation: {...simulation, socStart: Math.max(simulation.socStart, 100 - design.dod)}, compared: false})}
          onApply={values => open('compare', {simulation: {...simulation, ...values}, compared: false})}/>}
        {step === 'compare' && <Compare record={record} estimate={estimate} comparison={comparison}
          onChange={simulation => update({simulation, compared: false})} onRun={() => update({compared: true})}/>}
        {step === 'delivery' && <Delivery record={record} estimate={estimate} comparison={comparison} onChange={update}/>}
        <div className="integrator-stage-nav">
          {index > 0 && <Button icon="back" kind="quiet" onClick={() => open(integratorSteps[index - 1])}>{t(projectSteps[integratorSteps[index - 1]].label)}</Button>}
          {index < integratorSteps.length - 1 && <Button icon="arrow" onClick={() => open(integratorSteps[index + 1])}>{t(projectSteps[integratorSteps[index + 1]].label)}</Button>}
        </div>
      </section>
    </>}
    <aside className="integrator-sources">
      <h2>{t(labels.references)}</h2>
      <p>{t(studyScope)}</p>
      <div className="reference-links">{caseReferences.map(ref => <a key={ref.url} href={ref.url} target="_blank" rel="noopener noreferrer">
        {ref.name}<Icon name="external"/></a>)}</div>
    </aside>
  </div>;
}
