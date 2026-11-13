import {useId, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {Button, Icon} from './components';
import {T} from './model';
import {useApp} from './store';
import {
  annualEnergy, calculateCogeneration, classifyGeneration, compensateEnergy,
  dispatchableLimitKw, dispatchableSources, microLimitKw, nondispatchableLimitKw
} from './generation-engine';
import type {CogenerationInput, CogenerationSource, Connection, GenerationInput, GenerationSource} from './generation-engine';
import {
  bandDetails, bandLabels, cogenerationSourceLabels, compensationArrangements, connectionLabels, connectionSteps,
  generationCases, generationConcepts, generationQuiz, generationReviewedOn, generationSources, generationSourceLabels
} from './generation-content';
import type {GenerationReference} from './generation-content';
import type {Localized} from './types';

const sections = {
  overview: {label: T('Visão geral', 'Overview', 'Vista general'), icon: 'layers'},
  classification: {label: T('Porte e enquadramento', 'Size and eligibility', 'Tamaño y clasificación'), icon: 'target'},
  compensation: {label: T('Compensação e conexão', 'Compensation and connection', 'Compensación y conexión'), icon: 'grid'},
  cogeneration: {label: T('Cogeração', 'Cogeneration', 'Cogeneración'), icon: 'leaf'},
  utility: {label: T('Grande porte', 'Large-scale generation', 'Generación a gran escala'), icon: 'plant'},
  challenge: {label: T('Desafio', 'Challenge', 'Desafío'), icon: 'check'}
};
type Section = keyof typeof sections;
const sectionKeys = Object.keys(sections) as Section[];

function useGenerationText() {
  const {t, lang, navigate} = useApp();
  const locale = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US';
  return {
    t, navigate, locale,
    q: (pt: string, en: string, es: string) => t(T(pt, en, es)),
    n: (value: number, digits = 2) => new Intl.NumberFormat(locale, {maximumFractionDigits: digits}).format(value)
  };
}

function SourceLinks({ids}: {ids: GenerationReference[]}) {
  return <div className="reference-links generation-sources">
    {ids.map(id => <a key={id} href={generationSources[id].url} target="_blank" rel="noopener noreferrer">
      {generationSources[id].name}<Icon name="external"/>
    </a>)}
  </div>;
}

function Panel({children, className = ''}: {children: ReactNode; className?: string}) {
  return <section className={`generation-panel ${className}`}>{children}</section>;
}

function Note({children}: {children: ReactNode}) {
  return <div className="generation-note"><Icon name="info"/><div>{children}</div></div>;
}

function NumericField({label, unit, value, onChange, positive = false}: {
  label: string; unit: string; value: number | null; onChange: (value: number | null) => void; positive?: boolean
}) {
  const id = useId();
  return <div className="generation-field">
    <label htmlFor={id}>{label}</label>
    <div className="generation-number">
      <input id={id} type="number" min="0" step="any" inputMode="decimal" value={value ?? ''}
        aria-invalid={value === null || value < 0 || (positive && value === 0)}
        aria-describedby={id + '-unit'}
        onChange={event => onChange(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : null)}/>
      <span id={id + '-unit'}>{unit}</span>
    </div>
  </div>;
}

function SelectField<Value extends string>({label, options, value, onChange}: {
  label: string; options: Record<Value, Localized>; value: Value; onChange: (value: Value) => void
}) {
  const {t} = useApp();
  return <label className="generation-field">{label}
    <select value={value} onChange={event => onChange(event.target.value as Value)}>
      {(Object.keys(options) as Value[]).map(key => <option key={key} value={key}>{t(options[key])}</option>)}
    </select>
  </label>;
}

function RangeField({label, value, max, step = 1, unit, onChange}: {
  label: string; value: number; max: number; step?: number; unit: string; onChange: (value: number) => void
}) {
  const {n} = useGenerationText();
  const id = useId();
  return <div className="generation-range">
    <div><label htmlFor={id}>{label}</label><output htmlFor={id}>{n(value)} {unit}</output></div>
    <input id={id} type="range" min="0" max={max} step={step} value={value} disabled={max === 0}
      aria-valuetext={`${n(value)} ${unit}`} onChange={event => onChange(event.target.valueAsNumber)}/>
  </div>;
}

type Segment = {label: string; value: number; color: 'electric' | 'heat' | 'muted'};
function BalanceBar({title, unit, segments}: {title: string; unit: string; segments: Segment[]}) {
  const {n} = useGenerationText();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return <div className="generation-balance">
    <div className="generation-balance-title"><strong>{title}</strong><span>{n(total)} {unit}</span></div>
    <div className="generation-track" aria-hidden="true">
      {total > 0 && segments.map(segment => <span key={segment.label} className={`generation-${segment.color}`}
        style={{width: `${segment.value / total * 100}%`}}/>)}
    </div>
    <dl className="generation-legend">
      {segments.map(segment => <div key={segment.label}><dt>
        <i aria-hidden="true" className={`generation-${segment.color}`}/>{segment.label}
      </dt><dd>{n(segment.value)} {unit}</dd></div>)}
    </dl>
  </div>;
}

function Overview({onOpen, onCase}: {onOpen: (section: Section) => void; onCase: (index: number) => void}) {
  const {t, q, navigate} = useGenerationText();
  return <>
    <section className="generation-hero">
      <img src={BIO_ASSETS['carbon-cover']} alt={q('Ilustração de unidade agroindustrial junto a um rio amazônico',
        'Illustration of an agro-industrial facility by an Amazonian river', 'Ilustración de una instalación agroindustrial junto a un río amazónico')}/>
      <div>
        <h2>{q('Da escola ribeirinha à usina', 'From a riverside school to a power plant', 'De la escuela ribereña a la central')}</h2>
        <p>{q('Use a potência em corrente alternada, a fonte e o tipo de conexão para classificar uma central. Depois, acompanhe o caminho da eletricidade e do calor.',
          'Use AC capacity, source and connection type to classify a plant. Then trace the paths of electricity and heat.',
          'Usa la potencia en corriente alterna, la fuente y la conexión para clasificar una central. Después, sigue el recorrido de la electricidad y del calor.')}</p>
        <Button icon="flask" kind="primary" onClick={() => onCase(0)}>{q('Classificar o caso da escola', 'Classify the school scenario', 'Clasificar el caso de la escuela')}</Button>
      </div>
    </section>
    <div className="generation-concepts">
      {generationConcepts.map((concept, index) => <article className="generation-panel generation-concept" key={concept.icon}>
        <span className="generation-icon"><Icon name={concept.icon}/></span>
        <h3>{t(concept.title)}</h3>
        <strong>{t(concept.metric)}</strong>
        <p>{t(concept.detail)}</p>
        <Button kind="quiet" icon="arrow" onClick={() => concept.section === 'classification' ? onCase(index) : onOpen(concept.section)}>
          {q('Explorar', 'Explore', 'Explorar')} {t(concept.title).toLocaleLowerCase()}
        </Button>
      </article>)}
    </div>
    <Panel className="generation-region">
      <img loading="lazy" src={BIO_ASSETS['carbon-microgrid']} alt={q('Módulos solares e abrigo elétrico em uma comunidade ribeirinha, cena ilustrativa',
        'Solar panels and an electrical enclosure in a riverside community, illustrative scene',
        'Paneles solares y caseta eléctrica en una comunidad ribereña, escena ilustrativa')}/>
      <div>
        <h2>{q('Geração autônoma na Amazônia', 'Standalone generation in the Amazon', 'Generación autónoma en la Amazonía')}</h2>
        <p>{q('Em uma microrrede solar-diesel sem conexão à distribuidora, baterias e gerador atendem a demanda quando a geração solar é insuficiente. Uma localidade fora do SIN também pode ter rede pública de distribuição. Identifique a conexão antes de avaliar a compensação.',
          'In a solar-diesel microgrid with no distributor connection, batteries and the generator cover demand when PV output falls short. A locality outside the national interconnected system can also have a public distribution network. Identify the connection before assessing compensation.',
          'En una microrred solar-diésel sin conexión a la distribuidora, las baterías y el generador cubren la demanda cuando la energía solar es insuficiente. Una localidad fuera del SIN también puede tener red pública de distribución. Identifica la conexión antes de evaluar la compensación.')}</p>
        <div className="generation-actions">
          <Button icon="target" onClick={() => onCase(3)}>{q('Classificar a microrrede', 'Classify the microgrid', 'Clasificar la microrred')}</Button>
          <Button icon="globe" kind="quiet" onClick={() => navigate('amazon')}>{q('Abrir Campus Amazônia', 'Open Amazon Campus', 'Abrir Campus Amazonía')}</Button>
        </div>
      </div>
    </Panel>
  </>;
}

function Classification({input, onChange}: {input: GenerationInput; onChange: (input: GenerationInput) => void}) {
  const {q, t, n} = useGenerationText();
  const result = classifyGeneration(input);
  return <>
    <Panel>
      <h2>{q('Classificador de porte e conexão', 'Size and connection classifier', 'Clasificador de tamaño y conexión')}</h2>
      <p>{q('Selecione um caso didático ou preencha os campos. Use a potência instalada em corrente alternada (CA). Na fotovoltaica, a potência de pico dos módulos em kWp é uma grandeza do lado CC.',
        'Select a learning scenario or fill out the fields. Use installed alternating-current (AC) capacity. For PV, peak module capacity in kWp is a DC-side quantity.',
        'Selecciona un caso didáctico o completa los campos. Usa la potencia instalada en corriente alterna (CA). En fotovoltaica, la potencia pico de los módulos en kWp corresponde al lado CC.')}</p>
      <div className="generation-pills" role="group" aria-label={q('Casos de classificação', 'Classification scenarios', 'Casos de clasificación')}>
        {generationCases.map(({name, input: example}) => <button type="button" key={t(name)} onClick={() => onChange(example)}
          aria-pressed={input.powerKw === example.powerKw && input.source === example.source && input.connection === example.connection &&
            input.dispatchControl === example.dispatchControl}>
          {t(name)}
        </button>)}
      </div>
      <div className="generation-fields generation-fields-three">
        <NumericField label={q('Potência instalada', 'Installed capacity', 'Potencia instalada')} unit={q('kW CA', 'kW AC', 'kW CA')} value={input.powerKw} positive
          onChange={powerKw => onChange({...input, powerKw})}/>
        <SelectField label={q('Fonte de geração', 'Generation source', 'Fuente de generación')} value={input.source} options={generationSourceLabels}
          onChange={(source: GenerationSource) => onChange({...input, source, dispatchControl: false})}/>
        <SelectField label={q('Tipo de conexão', 'Connection type', 'Tipo de conexión')} value={input.connection} options={connectionLabels}
          onChange={(connection: Connection) => onChange({...input, connection})}/>
      </div>
      {input.connection === 'consumer' && dispatchableSources.has(input.source) && <label className="generation-check">
        <input type="checkbox" checked={input.dispatchControl}
          onChange={event => onChange({...input, dispatchControl: event.target.checked})}/>
        {q('A central pode ser despachada por controlador local ou remoto', 'The plant can be dispatched by a local or remote controller', 'La central puede despacharse mediante un controlador local o remoto')}
      </label>}
      <div className="generation-result" aria-live="polite">
        <span className="generation-icon"><Icon name={result ? 'bolt' : 'info'}/></span>
        <div>{result ? <>
          <h3>{t(bandLabels[result.band])}</h3>
          <p>{t(bandDetails[result.band])}</p>
          {result.miniLimitKw && <p className="generation-cap">
            {q('Teto geral de minigeração da fonte selecionada', 'General minigeneration ceiling for the selected source', 'Límite general de minigeneración para la fuente seleccionada')}
            {' · '}{n(result.miniLimitKw)} {q('kW CA', 'kW AC', 'kW CA')}
          </p>}
        </> : <p>{q('Informe uma potência instalada maior que zero.', 'Enter an installed capacity greater than zero.', 'Introduce una potencia instalada mayor que cero.')}</p>}</div>
      </div>
      <SourceLinks ids={['law', 'mmgd']}/>
    </Panel>
    <Panel>
      <h2>{q('Limites gerais da Lei 14.300', 'General thresholds under Law 14,300', 'Límites generales de la Ley 14.300')}</h2>
      <div className="generation-thresholds">
        <div><span>{q('Microgeração', 'Microgeneration', 'Microgeneración')}</span><strong>≤ {n(microLimitKw)} {q('kW CA', 'kW AC', 'kW CA')}</strong></div>
        <div><span>{q('Mini · fonte não despachável', 'Mini · non-dispatchable', 'Mini · no despachable')}</span><strong>&gt; {n(microLimitKw)} {q('até', 'up to', 'hasta')} {n(nondispatchableLimitKw)} {q('kW CA', 'kW AC', 'kW CA')}</strong></div>
        <div><span>{q('Mini · fonte despachável', 'Mini · dispatchable', 'Mini · despachable')}</span><strong>&gt; {n(microLimitKw)} {q('até', 'up to', 'hasta')} {n(dispatchableLimitKw)} {q('kW CA', 'kW AC', 'kW CA')}</strong></div>
      </div>
      <p>{q('A micro e minigeração distribuída (MMGD) abrange fontes renováveis e cogeração qualificada conectadas à distribuição por instalações de unidades consumidoras. Para o teto de 5 MW, a ANEEL exige uma fonte elegível e a possibilidade de despacho por controlador local ou remoto.',
        'Distributed microgeneration and minigeneration (MMGD) cover renewables or qualified cogeneration connected to distribution through consumer-unit facilities. The 5 MW ceiling requires an eligible source and dispatch capability via a local or remote controller under ANEEL rules.',
        'La micro y minigeneración distribuida (MMGD) abarca renovables y cogeneración calificada conectadas a distribución mediante instalaciones de unidades consumidoras. Para el límite de 5 MW, ANEEL exige una fuente elegible y la posibilidad de despacho mediante controlador local o remoto.')}</p>
      <details className="generation-details">
        <summary>{q('Fotovoltaica com baterias, transição e divisão de centrais', 'PV with batteries, transition and plant splitting', 'Fotovoltaica con baterías, transición y división de centrales')}</summary>
        <ul>
          <li>{q('Para a fonte fotovoltaica despachável, o art. 1º, IX, limita a potência a 3 MW e exige baterias e controle para modular o equivalente a pelo menos 20% da capacidade de geração mensal da central. O percentual é de energia, expresso em relação à geração mensal.',
            'For dispatchable PV, Article 1(IX) limits capacity to 3 MW and requires batteries and controls to modulate an amount equivalent to at least 20% of the plant’s monthly generation capacity. The percentage refers to energy relative to monthly generation.',
            'Para fotovoltaica despachable, el artículo 1, IX, limita la potencia a 3 MW y exige baterías y control para modular el equivalente a por lo menos el 20% de la capacidad de generación mensual de la central. El porcentaje se refiere a energía respecto de la generación mensual.')}</li>
          <li>{q('O parágrafo único do art. 1º prevê teto de 5 MW até 31/12/2045 para unidades abrangidas pelo caput do art. 26. Confira o histórico de acesso e os prazos do empreendimento.',
            'The sole paragraph of Article 1 provides a 5 MW ceiling through 31 December 2045 for units covered by the main clause of Article 26. Check the project’s access history and deadlines.',
            'El párrafo único del artículo 1 prevé un límite de 5 MW hasta el 31/12/2045 para las unidades abarcadas por el encabezado del artículo 26. Comprueba el historial de acceso y los plazos del proyecto.')}</li>
          <li>{q('O art. 11, § 2º, veda dividir uma central para enquadrá-la artificialmente nos limites de MMGD. Consulte as condições específicas na lei.',
            'Article 11(2) prohibits splitting a plant to fit artificially within MMGD limits. Consult the specific conditions in the law.',
            'El artículo 11, § 2, prohíbe dividir una central para encuadrarla artificialmente en los límites de MMGD. Consulta las condiciones específicas de la ley.')}</li>
        </ul>
      </details>
      <SourceLinks ids={['connection']}/>
    </Panel>
  </>;
}

function Compensation() {
  const {t, q, n, navigate} = useGenerationText();
  const [generated, setGenerated] = useState<number | null>(550);
  const [consumed, setConsumed] = useState<number | null>(600);
  const [direct, setDirect] = useState<number | null>(250);
  const [arrangement, setArrangement] = useState(0);
  const result = compensateEnergy(generated, consumed, direct);

  return <>
    <Panel>
      <h2>{q('Energia injetada e créditos do SCEE', 'Injected energy and SCEE credits', 'Energía inyectada y créditos del SCEE')}</h2>
      <p>{q('No Sistema de Compensação de Energia Elétrica (SCEE), a energia ativa injetada pode abater o consumo medido da rede. O saldo que sobra pode ser registrado como crédito.',
        'In the Electricity Compensation System (SCEE), injected active energy can offset metered grid consumption. The remaining balance can be recorded as a credit.',
        'En el Sistema de Compensación de Energía Eléctrica (SCEE), la energía activa inyectada puede compensar el consumo medido de la red. El saldo restante puede registrarse como crédito.')}</p>
      <p>{q('Simule um ciclo de faturamento de uma unidade, em um único posto tarifário, com saldo anterior zero. A geração consumida no mesmo instante abastece as cargas diretamente. O excedente injetado pode compensar a energia ativa importada no ciclo.',
        'Simulate one billing cycle at one consumer unit in a single tariff period with zero previous balance. Generation used at the same time serves the loads directly. Injected surplus can offset imported active energy in the cycle.',
        'Simula un ciclo de facturación de una unidad en un único período tarifario, con saldo anterior cero. La generación utilizada en el mismo instante abastece las cargas directamente. El excedente inyectado puede compensar la energía activa importada en el ciclo.')}</p>
      <div className="generation-fields generation-fields-three">
        <NumericField label={q('Energia gerada', 'Energy generated', 'Energía generada')} unit="kWh" value={generated} onChange={setGenerated}/>
        <NumericField label={q('Consumo total da unidade', 'Total unit consumption', 'Consumo total de la unidad')} unit="kWh" value={consumed} onChange={setConsumed}/>
        <NumericField label={q('Consumo simultâneo à geração', 'Consumption simultaneous with generation', 'Consumo simultáneo a la generación')} unit="kWh" value={direct} onChange={setDirect}/>
      </div>
      <div aria-live="polite">
        {result ? <>
          <div className="generation-two">
            <BalanceBar title={q('Destino da geração', 'Where generation goes', 'Destino de la generación')} unit="kWh" segments={[
              {label: q('Uso direto', 'Direct use', 'Uso directo'), value: result.direct, color: 'electric'},
              {label: q('Injeção na rede', 'Grid injection', 'Inyección en red'), value: result.injected, color: 'heat'}
            ]}/>
            <BalanceBar title={q('Atendimento ao consumo', 'How consumption is met', 'Cómo se cubre el consumo')} unit="kWh" segments={[
              {label: q('Uso direto', 'Direct use', 'Uso directo'), value: result.direct, color: 'electric'},
              {label: q('Importação da rede', 'Grid import', 'Importación de la red'), value: result.imported, color: 'muted'}
            ]}/>
          </div>
          <dl className="generation-metrics">
            <div><dt>{q('Energia compensada', 'Energy offset', 'Energía compensada')}</dt><dd>{n(result.compensated)} <small>kWh</small></dd></div>
            <div><dt>{q('Novos créditos', 'New credits', 'Nuevos créditos')}</dt><dd>{n(result.credits)} <small>kWh</small></dd></div>
            <div><dt>{q('Importação sem compensação', 'Uncompensated import', 'Importación sin compensación')}</dt><dd>{n(result.remaining)} <small>kWh</small></dd></div>
          </dl>
        </> : <Note>{q('Preencha os três valores com números a partir de zero. O consumo simultâneo deve caber tanto na geração quanto no consumo total.',
          'Enter nonnegative numbers in all three fields. Simultaneous use must be no more than generation and total consumption.',
          'Introduce valores desde cero en los tres campos. El consumo simultáneo debe caber tanto en la generación como en el consumo total.')}</Note>}
      </div>
      <details className="generation-details">
        <summary>{q('Fórmulas e regras de faturamento', 'Formulas and billing rules', 'Fórmulas y reglas de facturación')}</summary>
        <ul>
          <li>{q('Injeção = geração − uso direto. Importação = consumo total − uso direto.',
            'Injection = generation − direct use. Import = total consumption − direct use.',
            'Inyección = generación − uso directo. Importación = consumo total − uso directo.')}</li>
          <li>{q('Compensação = menor valor entre injeção e importação. Novos créditos = injeção − compensação. Importação sem compensação = importação − compensação.',
            'Offset = the smaller of injection and import. New credits = injection − offset. Uncompensated import = import − offset.',
            'Compensación = menor valor entre inyección e importación. Nuevos créditos = inyección − compensación. Importación sin compensar = importación − compensación.')}</li>
          <li>{q('Créditos são contabilizados em energia ativa e expiram em 60 meses após o faturamento em que foram gerados. A fatura pode incluir componentes de uso da rede, tributos, custo de disponibilidade ou demanda contratada conforme o grupo e o enquadramento. O cálculo aqui é em kWh.',
            'Credits are recorded in active energy and expire 60 months after the billing cycle in which they were generated. Bills may include grid charges, taxes, minimum charges or contracted demand depending on the group and regime. This calculation is in kWh.',
            'Los créditos se contabilizan en energía activa y vencen 60 meses después de la facturación en que se generaron. La factura puede incluir uso de red, impuestos, costo mínimo o demanda contratada según grupo y régimen. El cálculo aquí es en kWh.')}</li>
          <li>{q('Na regra geral de transição do art. 27, em 2026 incidem 60% de componentes específicas de distribuição sobre a energia compensada. A data da solicitação, as condições do art. 26 e os casos do art. 27, § 1º, podem mudar o tratamento. Para calcular a fatura, confira o enquadramento e as tarifas da distribuidora.',
            'Under the general transition rule in Article 27, 60% of specified distribution charges apply to compensated energy in 2026. Application timing, the conditions of Article 26 and the cases in Article 27(1) may change treatment. Check the applicable regime and distributor tariffs to calculate a bill.',
            'En la regla general de transición del artículo 27, en 2026 incide el 60% de componentes específicos de distribución sobre la energía compensada. La fecha de solicitud, las condiciones del artículo 26 y los casos del artículo 27, § 1, pueden cambiar el tratamiento. Para calcular la factura, comprueba el régimen y las tarifas de la distribuidora.')}</li>
        </ul>
      </details>
      <SourceLinks ids={['law', 'mmgd', 'scee']}/>
    </Panel>
    <Panel>
      <h2>{q('Quem pode receber os excedentes?', 'Who can receive surplus energy?', '¿Quién puede recibir los excedentes?')}</h2>
      <div className="generation-pills" role="group" aria-label={q('Modalidades do SCEE', 'SCEE arrangements', 'Modalidades del SCEE')}>
        {compensationArrangements.map((item, index) => <button key={index} type="button" aria-pressed={arrangement === index}
          onClick={() => setArrangement(index)}>{t(item.name)}</button>)}
      </div>
      <div className="generation-result" aria-live="polite"><span className="generation-icon"><Icon name="grid"/></span><div>
        <h3>{t(compensationArrangements[arrangement].name)}</h3><p>{t(compensationArrangements[arrangement].detail)}</p>
      </div></div>
    </Panel>
    <Panel>
      <h2>{q('Da solicitação à conexão', 'From application to connection', 'De la solicitud a la conexión')}</h2>
      <ol className="generation-steps">
        {connectionSteps.map(([title, detail]) => <li key={t(title)}><h3>{t(title)}</h3><p>{t(detail)}</p></li>)}
      </ol>
      <Note>{q('Para um caso no Acre, confirme a distribuidora pelo endereço da unidade. Na área da Energisa Acre, consulte as normas vigentes de conexão de MMGD em baixa ou média tensão conforme o projeto.',
        'For a case in Acre, confirm the distributor using the unit address. In the Energisa Acre service area, check current low- or medium-voltage MMGD connection standards for the project.',
        'Para un caso en Acre, confirma la distribuidora por la dirección. En el área de Energisa Acre, consulta las normas vigentes de conexión de MMGD en baja o media tensión según el proyecto.')}</Note>
      <SourceLinks ids={['connection', 'scee', 'energisaBt', 'energisaMt']}/>
      <Button kind="quiet" icon="print" onClick={() => navigate('pvreport', 'solar')}>
        {q('Abrir memória de cálculo fotovoltaica', 'Open PV calculation report', 'Abrir memoria de cálculo fotovoltaica')}
      </Button>
    </Panel>
  </>;
}

const biomassScenario: CogenerationInput = {
  source: 'otherFuel', installedMw: 0.5, inputEnergy: 1000, electricity: 300, recoverableHeat: 450, heatDemand: 450
};

function Cogeneration() {
  const {q, n, navigate} = useGenerationText();
  const [input, setInput] = useState(biomassScenario);
  const result = calculateCogeneration(input);
  const fields = [
    {key: 'inputEnergy', label: q('Energia de entrada (Eᶠ)', 'Energy input (Eᶠ)', 'Energía de entrada (Eᶠ)'), unit: 'kWh', positive: true},
    {key: 'electricity', label: q('Eletricidade líquida (Eᵉ)', 'Net electricity (Eᵉ)', 'Electricidad neta (Eᵉ)'), unit: 'kWh'},
    {key: 'recoverableHeat', label: q('Calor disponível para uso', 'Heat available for use', 'Calor disponible para uso'), unit: 'kWh'},
    {key: 'heatDemand', label: q('Demanda de calor do processo', 'Process heat demand', 'Demanda térmica del proceso'), unit: 'kWh'},
    {key: 'installedMw', label: q('Potência elétrica instalada', 'Installed electrical capacity', 'Potencia eléctrica instalada'), unit: 'MW', positive: true}
  ] as const;
  const errors = {
    input: q('Preencha os campos com valores válidos. A entrada de energia e a potência instalada devem ser maiores que zero.',
      'Enter valid values in every field. Input energy and installed capacity must be greater than zero.',
      'Completa los campos con valores válidos. La energía de entrada y la potencia instalada deben ser mayores que cero.'),
    nameplate: q('A eletricidade líquida de uma hora supera a energia que a potência elétrica instalada permite nesse período.',
      'One hour of net electricity exceeds the energy possible at installed electrical capacity over that period.',
      'La electricidad neta de una hora supera la energía que permite la potencia eléctrica instalada en ese período.'),
    balance: q('A soma de eletricidade líquida e calor disponível supera a energia de entrada. Revise o balanço.',
      'Net electricity plus available heat exceeds input energy. Check the energy balance.',
      'La electricidad neta más el calor disponible supera la energía de entrada. Revisa el balance.')
  };

  return <>
    <Panel className="generation-region">
      <img loading="lazy" src={BIO_ASSETS['carbon-industry']} alt={q('Caldeira, tubulações isoladas e passarela industrial, cena ilustrativa',
        'Boiler, insulated pipes and industrial walkway, illustrative scene', 'Caldera, tuberías aisladas y pasarela industrial, escena ilustrativa')}/>
      <div>
        <h2>{q('Biomassa, eletricidade e vapor', 'Biomass, electricity and steam', 'Biomasa, electricidad y vapor')}</h2>
        <p>{q('Na cogeração, uma mesma fonte fornece eletricidade ou energia eletromecânica e calor útil. Em uma usina a biomassa, a caldeira produz vapor para a turbina. O vapor extraído ou descarregado pela turbina pode aquecer um processo, como a secagem. Em um motogerador a biogás, o calor do motor pode aquecer água.',
          'In cogeneration, one source provides electricity or electromechanical energy and useful heat. In a biomass plant, the boiler makes steam for the turbine. Extracted or exhaust steam can heat a process such as drying. In a biogas engine-generator, engine heat can heat water.',
          'En la cogeneración, una misma fuente entrega electricidad o energía electromecánica y calor útil. En una central de biomasa, la caldera genera vapor para la turbina. El vapor extraído o de escape puede aportar calor a procesos como el secado. En un motogenerador a biogás, el calor del motor puede calentar agua.')}</p>
        <SourceLinks ids={['bioelectricity']}/>
        <Button kind="quiet" icon="layers" onClick={() => navigate('lab3d', 'biomass')}>
          {q('Explorar a usina de biomassa em 3D', 'Explore the 3D biomass plant', 'Explorar la central de biomasa en 3D')}
        </Button>
      </div>
    </Panel>
    <Panel>
      <h2>{q('Bancada de cogeração', 'Cogeneration lab', 'Banco de cogeneración')}</h2>
      <p>{q('Todos os valores em kWh correspondem à mesma hora de operação. Para combustíveis, use a energia de entrada pelo poder calorífico inferior (PCI). Desconte os serviços auxiliares da geração elétrica e considere o calor líquido entregue ao processo.',
        'All kWh values refer to the same operating hour. For fuel, use thermal input on a lower heating value (LHV) basis. Use electricity net of auxiliary loads and net heat delivered to the process.',
        'Todos los valores en kWh corresponden a la misma hora de operación. Usa la entrada térmica por poder calorífico inferior (PCI) para el combustible, la electricidad neta de los auxiliares y el calor neto entregado al proceso.')}</p>
      <div className="generation-pills" role="group" aria-label={q('Cenários de aproveitamento de vapor', 'Steam use scenarios', 'Escenarios de uso de vapor')}>
        <button type="button" onClick={() => setInput(biomassScenario)}>{q('Vapor em uso', 'Steam in use', 'Vapor en uso')}</button>
        <button type="button" onClick={() => setInput({...biomassScenario, heatDemand: 0})}>{q('Processo sem demanda de vapor', 'Process with no steam demand', 'Proceso sin demanda de vapor')}</button>
      </div>
      <div className="generation-fields generation-fields-three">
        {fields.map(({key, label, unit, ...options}) => <NumericField key={key} label={label} unit={unit} value={input[key]}
          onChange={value => setInput(current => ({...current, [key]: value}))} {...options}/>)}
        <SelectField label={q('Fonte para o critério ANEEL', 'Source for the ANEEL criterion', 'Fuente para el criterio ANEEL')}
          options={cogenerationSourceLabels} value={input.source}
          onChange={(source: CogenerationSource) => setInput(current => ({...current, source}))}/>
      </div>
      <div aria-live="polite">
        {!result.valid ? <Note>{errors[result.error]}</Note> : <>
          <BalanceBar title={q('Balanço da energia de entrada', 'Input energy balance', 'Balance de energía de entrada')} unit="kWh" segments={[
            {label: q('Eletricidade líquida', 'Net electricity', 'Electricidad neta'), value: result.electricity, color: 'electric'},
            {label: q('Calor útil (Eᵗ)', 'Useful heat (Eᵗ)', 'Calor útil (Eᵗ)'), value: result.heat, color: 'heat'},
            {label: q('Perdas e calor sem uso', 'Losses and unused heat', 'Pérdidas y calor sin uso'), value: result.losses, color: 'muted'}
          ]}/>
          <dl className="generation-metrics">
            <div><dt>{q('Rendimento global', 'Overall efficiency', 'Rendimiento global')}</dt><dd>{n(result.efficiency)} <small>%</small></dd></div>
            <div><dt>{q('Rendimento elétrico', 'Electrical efficiency', 'Rendimiento eléctrico')}</dt><dd>{n(result.electricPercent)} <small>%</small></dd></div>
            <div><dt>{q('Calor disponível sem uso', 'Available heat left unused', 'Calor disponible sin uso')}</dt><dd>{n(result.discardedHeat)} <small>kWh</small></dd></div>
          </dl>
          <p className="generation-formula">η = (Eᵉ + Eᵗ) ÷ Eᶠ × 100 = ({n(result.electricity)} + {n(result.heat)}) ÷ {n(result.inputEnergy)} × 100 = {n(result.efficiency)}%</p>
          <div className="generation-result">
            <span className="generation-icon"><Icon name={result.meetsEnergyCriteria ? 'check' : 'info'}/></span>
            <div>
              <h3>{q('Requisitos energéticos da REN 1.031, art. 15', 'Energy requirements of REN 1,031, Article 15', 'Requisitos energéticos de REN 1.031, art. 15')}</h3>
              <p>{result.meetsEnergyCriteria
                ? q('O cenário atende às duas inequações e tem produção elétrica.', 'The scenario meets both inequalities and produces electricity.', 'El escenario cumple las dos desigualdades y tiene producción eléctrica.')
                : q('O cenário precisa atender às duas inequações e ter produção elétrica para passar nesta triagem.', 'The scenario needs to meet both inequalities and produce electricity to pass this screening.', 'El escenario debe cumplir ambas desigualdades y producir electricidad para superar esta evaluación.')}</p>
              <p className="generation-cap">Eᵗ/Eᶠ = {n(result.heatPercent)}% · {q('mínimo', 'minimum', 'mínimo')} 15%<br/>
                (Eᵗ/Eᶠ)/X + Eᵉ/Eᶠ = {n(result.score)}% · {q('mínimo', 'minimum', 'mínimo')} {n(result.fc)}% · X = {n(result.x)}</p>
            </div>
          </div>
        </>}
      </div>
      <details className="generation-details">
        <summary>{q('Como calcular o calor útil e interpretar a qualificação', 'Calculating useful heat and interpreting qualification', 'Cómo calcular el calor útil e interpretar la calificación')}</summary>
        <p>{q('O calor útil líquido é a energia entregue ao processo menos a energia do fluido que retorna. Nesta bancada, o valor útil fica limitado à demanda e ao calor disponível. Para uma central real, use vazão, estados termodinâmicos e medições na fronteira do processo.',
          'Net useful heat is energy delivered to the process less energy in the returning fluid. In this lab it is bounded by demand and available heat. For a real plant, use flow, thermodynamic states and measurements at the process boundary.',
          'El calor útil neto es la energía entregada al proceso menos la energía del fluido de retorno. Aquí se limita por la demanda y el calor disponible. Para una central real, usa caudal, estados termodinámicos y mediciones en la frontera del proceso.')}</p>
        <p>{q('O ensaio aplica a tabela da ANEEL para uma única fonte. A qualificação formal depende da regularidade da central, da documentação e da análise da ANEEL. O art. 19 prevê dispensa de qualificação para centrais exclusivamente a biomassa, observadas as condições de cada benefício legal.',
          'The exercise applies the ANEEL table to a single source. Formal qualification depends on the plant’s regulatory status, documentation and ANEEL review. Article 19 waives qualification for biomass-only plants subject to the conditions of each legal benefit.',
          'El ensayo aplica la tabla de ANEEL a una sola fuente. La calificación formal depende de la regularidad de la central, los documentos y el análisis de ANEEL. El artículo 19 prevé exención para centrales exclusivamente de biomasa según las condiciones de cada beneficio legal.')}</p>
      </details>
      <SourceLinks ids={['cogeneration']}/>
    </Panel>
  </>;
}

const gridStages = [
  {icon: 'plant', name: T('Geração', 'Generation', 'Generación'),
    detail: T('A usina converte uma fonte primária em eletricidade. A subestação pode elevar a tensão para o transporte, conforme o ponto de acesso.',
      'The plant converts a primary source into electricity. Its substation can raise the voltage for transport, depending on the connection point.',
      'La central convierte una fuente primaria en electricidad. La subestación puede elevar la tensión para el transporte según el punto de acceso.')},
  {icon: 'bolt', name: T('Transmissão', 'Transmission', 'Transmisión'),
    detail: T('A rede de alta tensão transporta energia entre regiões e grandes centros de carga. No SIN, o ONS coordena a operação conforme suas atribuições.',
      'The high-voltage grid carries power between regions and large load centers. In the SIN, ONS coordinates operations within its remit.',
      'La red de alta tensión transporta energía entre regiones y grandes centros de carga. En el SIN, el ONS coordina la operación según sus atribuciones.')},
  {icon: 'grid', name: T('Distribuição', 'Distribution', 'Distribución'),
    detail: T('Subestações e alimentadores levam energia às redes locais em níveis de tensão adequados. Centrais também podem ter acesso direto à distribuição, conforme as condições do projeto.',
      'Substations and feeders deliver electricity to local networks at appropriate voltages. Power plants can also connect directly to distribution, depending on project conditions.',
      'Subestaciones y alimentadores llevan energía a las redes locales a tensiones adecuadas. Las centrales también pueden acceder directamente a distribución según el proyecto.')},
  {icon: 'target', name: T('Consumo', 'Consumption', 'Consumo'),
    detail: T('A energia chega a instalações como escolas, residências, comércios e indústrias. O ponto de conexão e a medição dependem do tipo de consumidor.',
      'Electricity reaches facilities such as schools, homes, businesses and industry. The connection point and metering depend on the consumer type.',
      'La energía llega a escuelas, viviendas, comercios e industrias. El punto de conexión y la medición dependen del tipo de consumidor.')}
];

function UtilityGeneration() {
  const {t, q, n} = useGenerationText();
  const [installed, setInstalled] = useState<number | null>(20);
  const [factor, setFactor] = useState(22);
  const [gridStage, setGridStage] = useState(0);
  const result = annualEnergy(installed, factor);
  return <>
    <Panel>
      <h2>{q('Geração de grande porte e geração centralizada', 'Large-scale and centralized generation', 'Generación a gran escala y centralizada')}</h2>
      <p>{q('“Macrogeração” é uma expressão informal para geração de grande porte. Micro e mini são as faixas legais da MMGD. Na geração centralizada, a usina tem acesso próprio à rede e opera em regime de geração como comercialização ou autoprodução, conforme o empreendimento.',
        '“Macrogeneration” informally refers to large-scale generation. Micro and mini are the legal MMGD bands. Centralized plants have their own grid connection and operate under arrangements such as commercialization or self-production, depending on the project.',
        '“Macrogeneración” es una expresión informal para la gran escala. Micro y mini son las franjas legales de la MMGD. Una central tiene acceso propio a la red y opera en un régimen como comercialización o autoproducción según el proyecto.')}</p>
      <p>{q('Em um caso didático de usina fotovoltaica de 20 MW para comercialização, a rota de outorga é a autorização. Outras fontes e portes podem seguir registro, autorização ou concessão. Cada projeto avalia o acesso à rede, o licenciamento aplicável e os contratos de energia.',
        'In an example of a 20 MW commercial PV plant, the grant route is authorization. Other sources and sizes may follow registration, authorization or concession. Each project assesses grid access, applicable licensing and energy contracts.',
        'En el ejemplo de una central fotovoltaica comercial de 20 MW, la vía es la autorización. Otras fuentes y tamaños pueden seguir registro, autorización o concesión. Cada proyecto evalúa el acceso a la red, el licenciamiento y los contratos de energía.')}</p>
      <details className="generation-details">
        <summary>{q('Contratação regulada e livre', 'Regulated and free contracting', 'Contratación regulada y libre')}</summary>
        <p>{q('No Ambiente de Contratação Regulada (ACR), distribuidoras contratam energia para atender seus consumidores, principalmente por leilões. No Ambiente de Contratação Livre (ACL), agentes negociam contratos bilaterais conforme as regras do mercado. A CCEE registra e contabiliza as operações aplicáveis.',
          'In the regulated contracting environment (ACR), distributors procure energy for their consumers, chiefly via auctions. In the free contracting environment (ACL), agents negotiate bilateral contracts under market rules. CCEE registers and accounts for applicable transactions.',
          'En el ambiente regulado (ACR), las distribuidoras contratan energía para sus consumidores, principalmente en subastas. En el ambiente libre (ACL), los agentes negocian contratos bilaterales según las reglas del mercado. La CCEE registra y contabiliza las operaciones aplicables.')}</p>
      </details>
      <SourceLinks ids={['grants', 'plants', 'contracts']}/>
    </Panel>
    <Panel>
      <h2>{q('O caminho da eletricidade no SIN', 'The path of electricity in the SIN', 'El camino de la electricidad en el SIN')}</h2>
      <p>{q('Explore um percurso possível no Sistema Interligado Nacional (SIN), da usina às cargas.', 'Explore one possible path through the National Interconnected System (SIN) from plant to loads.', 'Explora un recorrido posible en el Sistema Interconectado Nacional (SIN), desde la central hasta las cargas.')}</p>
      <div className="generation-grid-path" role="group" aria-label={q('Etapas do fluxo de eletricidade', 'Electricity flow stages', 'Etapas del flujo eléctrico')}>
        {gridStages.map((stage, index) => <div key={stage.icon}>
          <button type="button" onClick={() => setGridStage(index)} aria-pressed={gridStage === index}>
            <Icon name={stage.icon}/>{t(stage.name)}
          </button>
          {index < gridStages.length - 1 && <Icon name="arrow" className="generation-path-arrow"/>}
        </div>)}
      </div>
      <p className="generation-path-detail" aria-live="polite">{t(gridStages[gridStage].detail)}</p>
      <SourceLinks ids={['grid']}/>
    </Panel>
    <Panel>
      <h2>{q('Simule a produção anual de uma usina', 'Simulate annual plant output', 'Simula la producción anual de una central')}</h2>
      <p>{q('O fator de capacidade é a razão entre a energia produzida no período e a energia que seria gerada à potência nominal durante todas as horas. Varie o fator e compare a potência média e a produção em um ano de 8.760 h.',
        'Capacity factor is the ratio of period output to the energy that would be generated at rated capacity for all hours. Change the factor and compare average power and production in an 8,760-hour year.',
        'El factor de capacidad es la relación entre la energía del período y la que se generaría a potencia nominal durante todas las horas. Varía el factor y compara la potencia media y la producción en un año de 8.760 h.')}</p>
      <div className="generation-fields">
        <NumericField label={q('Potência instalada da usina', 'Installed plant capacity', 'Potencia instalada de la central')} unit="MW" value={installed} positive onChange={setInstalled}/>
        <RangeField label={q('Fator de capacidade', 'Capacity factor', 'Factor de capacidad')} value={factor} max={100} step={0.1} unit="%" onChange={setFactor}/>
      </div>
      <div aria-live="polite">
        {result && installed !== null ? <>
          <dl className="generation-metrics generation-two">
            <div><dt>{q('Potência média', 'Average power', 'Potencia media')}</dt><dd>{n(result.averageMw)} <small>MW</small></dd></div>
            <div><dt>{q('Energia anual estimada', 'Estimated annual energy', 'Energía anual estimada')}</dt><dd>{n(result.energyMwh)} <small>{q('MWh/ano', 'MWh/year', 'MWh/año')}</small></dd></div>
          </dl>
          <p className="generation-formula">E = P × {q('fator', 'factor', 'factor')} × t = {n(installed)} MW × {n(factor)}% × {n(8760)} h = {n(result.energyMwh)} MWh</p>
        </> : <Note>{q('Informe uma potência instalada positiva e dentro da faixa calculável.', 'Enter a positive installed capacity within the calculable range.', 'Introduce una potencia instalada positiva y dentro del rango calculable.')}</Note>}
      </div>
      <p>{q('O fator inicial de 22% é uma hipótese de exercício. Na prática, recurso disponível, indisponibilidade e restrições de operação afetam a produção.',
        'The initial 22% factor is a learning assumption. Actual production depends on resource availability, downtime and operating restrictions.',
        'El 22% inicial es un supuesto didáctico. En la práctica, el recurso, la indisponibilidad y las restricciones operativas afectan la producción.')}</p>
    </Panel>
  </>;
}

function Challenge() {
  const {q, t, n} = useGenerationText();
  const prefix = useId();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const count = Object.keys(answers).length;
  const score = generationQuiz.filter((question, index) => answers[index] === question.correct).length;
  return <Panel>
    <div className="generation-challenge-head">
      <div>
        <h2>{q('Desafio de geração de energia', 'Power generation challenge', 'Desafío de generación eléctrica')}</h2>
        <p>{q('Classifique os casos e confira os cálculos. Cada resposta recebe uma explicação.', 'Classify the scenarios and check the calculations. Each answer includes an explanation.', 'Clasifica los casos y comprueba los cálculos. Cada respuesta incluye una explicación.')}</p>
      </div>
      <div className="generation-score" role="status">
        <span>{n(count)}/{generationQuiz.length} {q('respondidas', 'answered', 'respondidas')}</span>
        <strong>{n(score)} {q(score === 1 ? 'acerto' : 'acertos', score === 1 ? 'correct answer' : 'correct answers', score === 1 ? 'acierto' : 'aciertos')}</strong>
      </div>
    </div>
    <div className="generation-quiz">
      {generationQuiz.map((item, index) => <fieldset key={index}>
        <legend>{index + 1}. {t(item.question)}</legend>
        {item.options.map((option, optionIndex) => <label key={optionIndex}>
          <input type="radio" name={prefix + '-' + index} checked={answers[index] === optionIndex}
            onChange={() => setAnswers(current => ({...current, [index]: optionIndex}))}/><span>{t(option)}</span>
        </label>)}
        <div aria-live="polite">
          {answers[index] !== undefined && <p className={`generation-feedback ${answers[index] === item.correct ? 'correct' : 'review'}`}>
            <strong>{answers[index] === item.correct ? q('Correto.', 'Correct.', 'Correcto.') : q('Revise o raciocínio.', 'Review your reasoning.', 'Revisa el razonamiento.')}</strong> {t(item.feedback)}
          </p>}
        </div>
      </fieldset>)}
    </div>
    <Button icon="reset" disabled={!count} onClick={() => setAnswers({})}>{q('Refazer desafio', 'Restart challenge', 'Rehacer desafío')}</Button>
  </Panel>;
}

export default function Generation() {
  const {q, t, locale} = useGenerationText();
  const [section, setSection] = useState<Section>('overview');
  const [classification, setClassification] = useState<GenerationInput>(generationCases[0].input);
  const tabs = useRef<Partial<Record<Section, HTMLButtonElement>>>({});
  const prefix = useId();
  const open = (next: Section) => {
    setSection(next);
    tabs.current[next]?.focus();
  };
  const openCase = (index: number) => {
    setClassification(generationCases[index].input);
    open('classification');
  };
  const content: Record<Section, ReactNode> = {
    overview: <Overview onOpen={open} onCase={openCase}/>,
    classification: <Classification input={classification} onChange={setClassification}/>,
    compensation: <Compensation/>,
    cogeneration: <Cogeneration/>,
    utility: <UtilityGeneration/>,
    challenge: <Challenge/>
  };
  return <div className="generation">
    <header className="generation-heading">
      <h1>{q('Geração de energia', 'Power generation', 'Generación eléctrica')}</h1>
      <p>{q('Microgeração, minigeração, cogeração e usinas de grande porte no contexto do setor elétrico brasileiro.',
        'Microgeneration, minigeneration, cogeneration and large power plants in the Brazilian power sector.',
        'Microgeneración, minigeneración, cogeneración y centrales a gran escala en el sector eléctrico brasileño.')}</p>
    </header>
    <nav className="generation-tabs" aria-label={q('Seções de geração de energia', 'Power generation sections', 'Secciones de generación eléctrica')}>
      {sectionKeys.map(key => <button key={key} type="button" id={prefix + '-' + key}
        ref={element => { if (element) tabs.current[key] = element; }} aria-pressed={key === section}
        aria-controls={prefix + '-panel-' + key} onClick={() => setSection(key)}>
        <Icon name={sections[key].icon}/>{t(sections[key].label)}
      </button>)}
    </nav>
    {sectionKeys.map(key => <section className="generation-section" key={key} hidden={key !== section}
      id={prefix + '-panel-' + key} aria-labelledby={prefix + '-' + key}>{content[key]}</section>)}
    <p className="generation-date">
      {q('Cenários didáticos. Referências regulatórias conferidas em', 'Learning scenarios. Regulatory references checked on', 'Escenarios didácticos. Referencias regulatorias comprobadas el')}{' '}
      <time dateTime={generationReviewedOn}>{new Date(generationReviewedOn + 'T00:00:00Z').toLocaleDateString(locale, {timeZone: 'UTC'})}</time>.
    </p>
  </div>;
}
