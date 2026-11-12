import React, {useId, useRef, useState} from 'react';
import {Button, Icon} from './components';
import {T, format} from './model';
import {useApp} from './store';
import {carbonDefaults, estimateCarbon, maxCarbonActivity, sbceBand, sbceThresholds} from './carbon-engine';
import type {CarbonCase, CarbonInput, EmissionsBand} from './carbon-engine';
import {
  bandText, carbonCases, carbonQuiz, carbonReviewedOn, carbonSources, marketInstruments,
  sbceProcess, scopes, sectorCases, sectorSpecial, sectorTimeline
} from './carbon-content';
import type {CarbonSector, CarbonSource} from './carbon-content';

const sections = {
  intro: {label: T('Comece aqui', 'Start here', 'Empieza aquí'), icon: 'leaf'},
  law: {label: T('Lei e mercado', 'Law and market', 'Ley y mercado'), icon: 'book'},
  screening: {label: T('Quem se enquadra', 'Who is covered', 'A quién se aplica'), icon: 'target'},
  lab: {label: T('Simular emissões', 'Simulate emissions', 'Simular emisiones'), icon: 'flask'},
  quiz: {label: T('Desafio', 'Challenge', 'Desafío'), icon: 'check'}
};
type Section = keyof typeof sections;
const caseIds: CarbonCase[] = ['microgrid', 'industry', 'electricity'];
const bands: EmissionsBand[] = ['under', 'report', 'reconcile'];

function useCarbonText() {
  const {t, lang} = useApp();
  return {t, lang, q: (pt: string, en: string, es: string) => t(T(pt, en, es)),
    n: (value: number, decimals = 0) => format(value, lang, decimals)};
}

function SourceLinks({ids}: {ids: CarbonSource[]}) {
  return <div className="reference-links carbon-links">{ids.map(id => {
    const source = carbonSources[id];
    return <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">{source.name}<Icon name="external"/></a>;
  })}</div>;
}

function NumberInput({label, unit, value, onChange, max = maxCarbonActivity}: {
  label: string; unit: string; value: number | null; max?: number; onChange: (value: number | null) => void;
}) {
  const id = useId();
  const invalid = value !== null && (value < 0 || value > max);
  return <div className="carbon-field">
    <label htmlFor={id}>{label}</label>
    <div className="carbon-number">
      <input id={id} type="number" inputMode="decimal" min="0" max={max} step="any" value={value ?? ''}
        aria-invalid={invalid} aria-describedby={id + '-unit'}
        onChange={event => onChange(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : null)}/>
      <span id={id + '-unit'}>{unit}</span>
    </div>
  </div>;
}

function Introduction({onCase}: {onCase: (kind: CarbonCase) => void}) {
  const {t, q} = useCarbonText();
  const [scope, setScope] = useState(0);
  return <>
    <section className="carbon-panel carbon-intro">
      <div>
        <h2>{q('O que é descarbonizar?', 'What is decarbonization?', '¿Qué es descarbonizar?')}</h2>
        <p>{q('Reduzir as emissões de gases de efeito estufa (GEE) de uma atividade. Na prática, o ponto de partida é identificar as fontes, medir a situação inicial e comparar soluções que entreguem o mesmo serviço.',
          'It means reducing greenhouse gas (GHG) emissions from an activity. Identify sources, measure the baseline and compare solutions that provide the same service.',
          'Significa reducir las emisiones de gases de efecto invernadero (GEI) de una actividad. Identifica las fuentes, mide la situación inicial y compara soluciones con el mismo servicio.')}</p>
        <p>{q('A unidade tCO₂e reúne gases como CO₂, metano e óxido nitroso em uma base comum. Emissão evitada é a diferença entre cenários. Remoção retira GEE da atmosfera.',
          'The unit tCO₂e puts gases such as CO₂, methane and nitrous oxide on a common basis. Avoided emissions are the difference between scenarios. Removals take GHGs out of the atmosphere.',
          'La unidad tCO₂e reúne gases como CO₂, metano y óxido nitroso en una base común. La emisión evitada es la diferencia entre escenarios. La remoción retira GEI de la atmósfera.')}</p>
      </div>
      <div className="carbon-scope">
        <h3>{q('De onde vêm as emissões?', 'Where do emissions come from?', '¿De dónde vienen las emisiones?')}</h3>
        <div className="carbon-pills" role="group" aria-label={q('Escopo do inventário', 'Inventory scope', 'Alcance del inventario')}>
          {scopes.map((item, i) => <button type="button" key={item.icon} aria-pressed={scope === i} onClick={() => setScope(i)}>
            {q('Escopo', 'Scope', 'Alcance')} {i + 1}
          </button>)}
        </div>
        <div className="carbon-explanation" aria-live="polite"><Icon name={scopes[scope].icon}/><div>
          <h4>{t(scopes[scope].name)}</h4><p>{t(scopes[scope].detail)}</p>
        </div></div>
        <SourceLinks ids={['scopes']}/>
      </div>
    </section>
    <h2 className="carbon-section-title">{q('Dois casos para testar', 'Two cases to try', 'Dos casos para probar')}</h2>
    <div className="carbon-case-grid">
      {(['microgrid', 'industry'] as const).map(id => {
        const item = carbonCases[id];
        return <article className="carbon-panel carbon-case" key={id}>
          <img loading="lazy" src={BIO_ASSETS[item.image]} alt={t(item.alt)} width="840" height="473"/>
          <div><h3>{t(item.title)}</h3><p>{t(item.description)}</p>
            <Button icon="arrow" onClick={() => onCase(id)}>{q('Testar este caso', 'Try this case', 'Probar este caso')}</Button>
          </div>
        </article>;
      })}
    </div>
    <details className="carbon-panel carbon-details">
      <summary>{q('Como a biomassa entra no inventário?', 'How is biomass counted?', '¿Cómo se contabiliza la biomasa?')}</summary>
      <p>{q('No GHG Protocol, o CO₂ biogênico da combustão é apresentado separadamente. Metano e óxido nitroso da queima em fonte própria entram no escopo 1 conforme a metodologia. Para comparar combustíveis, considere também origem, transporte, processamento e uso do solo no recorte escolhido.',
        'Under the GHG Protocol, biogenic combustion CO₂ is reported separately. Methane and nitrous oxide from an owned source are in scope 1 under the method. Fuel comparisons should also account for origin, transport, processing and land use within the chosen boundary.',
        'En el GHG Protocol, el CO₂ biogénico de la combustión se informa por separado. El metano y el óxido nitroso de fuentes propias entran en el alcance 1 según el método. Al comparar combustibles, considera también origen, transporte, procesamiento y uso del suelo.')}</p>
      <SourceLinks ids={['scopes']}/>
    </details>
  </>;
}

function LawAndMarket() {
  const {t, q} = useCarbonText();
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState(0);
  const item = sbceProcess[step];
  return <>
    <section className="carbon-panel">
      <h2>{q('A lei do mercado regulado de carbono', 'The regulated carbon market law', 'La ley del mercado regulado de carbono')}</h2>
      <p>{q('A Lei nº 15.042/2024 instituiu o Sistema Brasileiro de Comércio de Emissões de Gases de Efeito Estufa (SBCE). O sistema combina um teto de emissões com a negociação de ativos para o cumprimento de obrigações por operadores de fontes e instalações abrangidas.',
        'Law 15,042/2024 established Brazil’s Greenhouse Gas Emissions Trading System (SBCE). It combines an emissions cap with tradable assets for operators of covered sources and facilities to meet obligations.',
        'La Ley 15.042/2024 instituyó el Sistema Brasileño de Comercio de Emisiones de Gases de Efecto Invernadero (SBCE). Combina un límite de emisiones con activos negociables para el cumplimiento de obligaciones de los operadores regulados.')}</p>
      <div className="carbon-process" role="group" aria-label={q('Etapas do funcionamento do SBCE', 'How the SBCE works', 'Etapas del funcionamiento del SBCE')}>
        {sbceProcess.map((part, i) => <button key={part.icon} type="button" aria-pressed={i === step} onClick={() => setStep(i)}>
          <Icon name={part.icon}/><span>{t(part.title)}</span>
        </button>)}
      </div>
      <div className="carbon-explanation" aria-live="polite"><Icon name={item.icon}/><div>
        <h3>{t(item.title)} <span className="carbon-article">{item.article}</span></h3><p>{t(item.text)}</p>
        {step === 3 && <p>{q('Exemplo didático. Para conciliar 32.000 tCO₂e com 30.000 CBEs disponíveis, faltam ativos elegíveis equivalentes a 2.000 tCO₂e, conforme o PNA.',
          'Example. Reconciling 32,000 tCO₂e with 30,000 available CBEs leaves a gap of eligible assets covering 2,000 tCO₂e, subject to the PNA.',
          'Ejemplo. Conciliar 32.000 tCO₂e con 30.000 CBE disponibles deja un déficit de activos elegibles equivalente a 2.000 tCO₂e, conforme al PNA.')}</p>}
      </div></div>
      <SourceLinks ids={['law']}/>
    </section>

    <section className="carbon-panel">
      <h2>{q('Cronograma do MRV por setor', 'MRV schedule by sector', 'Calendario de MRV por sector')}</h2>
      <p>{q('A Portaria SEMC/MF nº 3.199/2026 escalona a entrada setorial na mensuração, relato e verificação (MRV). As datas abaixo se referem ao início de cada etapa, com o plano de monitoramento.',
        'Ordinance SEMC/MF 3,199/2026 phases in sectoral measurement, reporting and verification (MRV). The dates below refer to the start of each stage, with the monitoring plan.',
        'La Portaria SEMC/MF 3.199/2026 escalona la medición, informe y verificación (MRV). Las fechas indican el inicio de cada etapa, con el plan de seguimiento.')}</p>
      <div className="carbon-timeline" role="group" aria-label={q('Início de cada etapa setorial', 'Start of each sector stage', 'Inicio de cada etapa sectorial')}>
        {sectorTimeline.map((entry, i) => <button key={i} type="button" aria-pressed={i === stage} onClick={() => setStage(i)}>
          <span>{t(entry.title)}</span><strong>{t(entry.year)}</strong>
        </button>)}
      </div>
      <p className="carbon-stage-text" aria-live="polite">{t(sectorTimeline[stage].detail)}</p>
      <ol className="carbon-year-list">
        <li><strong>{q('1º ano', 'Year 1', 'Año 1')}</strong><span>{q('Submeter o plano de monitoramento.', 'Submit the monitoring plan.', 'Presentar el plan de seguimiento.')}</span></li>
        <li><strong>{q('2º ano', 'Year 2', 'Año 2')}</strong><span>{q('Mensurar emissões e remoções conforme o plano aprovado.', 'Measure emissions and removals under the approved plan.', 'Medir emisiones y remociones según el plan aprobado.')}</span></li>
        <li><strong>{q('3º ano em diante', 'Year 3 onward', 'Desde el año 3')}</strong><span>{q('Mensurar e entregar o relato verificado do ano anterior.', 'Measure and submit the verified report for the prior year.', 'Medir y presentar el informe verificado del año anterior.')}</span></li>
      </ol>
      <p className="carbon-note">{q('O órgão gestor define o recorte das atividades, fontes e instalações. Estar em um CNAE listado, por si só, não determina sujeição ao MRV. O primeiro PNA é previsto a partir de 2030 no cronograma geral divulgado pela Fazenda.',
        'The regulator defines the covered activities, sources and facilities. A listed activity code alone does not establish MRV coverage. The Finance Ministry’s general schedule projects the first PNA from 2030.',
        'El regulador define las actividades, fuentes e instalaciones cubiertas. Un CNAE listado por sí solo no determina la sujeción a MRV. Hacienda prevé el primer PNA a partir de 2030 en su calendario general.')}</p>
      <SourceLinks ids={['schedule', 'implementation', 'guidelines']}/>
    </section>

    <section className="carbon-panel">
      <h2>{q('CBE, CRVE, CBIO e crédito voluntário', 'CBE, CRVE, CBIO and voluntary credits', 'CBE, CRVE, CBIO y crédito voluntario')}</h2>
      <div className="carbon-instruments">
        {marketInstruments.map(entry => <article key={t(entry.name)}><h3>{t(entry.name)}</h3><p>{t(entry.body)}</p></article>)}
      </div>
      <SourceLinks ids={['law', 'cbio']}/>
      <details className="carbon-details">
        <summary>{q('Direitos das comunidades em projetos de carbono', 'Community rights in carbon projects', 'Derechos comunitarios en proyectos de carbono')}</summary>
        <p>{q('O art. 47 trata de projetos em territórios tradicionalmente ocupados. Para povos indígenas e comunidades tradicionais, prevê consentimento resultante de consulta livre, prévia e informada, salvaguardas e repartição justa dos benefícios.',
          'Article 47 addresses projects in traditionally occupied territories. For Indigenous peoples and traditional communities, it provides for consent through free, prior and informed consultation, safeguards and equitable benefit sharing.',
          'El art. 47 aborda proyectos en territorios tradicionalmente ocupados. Para pueblos indígenas y comunidades tradicionales prevé consentimiento mediante consulta libre, previa e informada, salvaguardas y reparto equitativo de beneficios.')}</p>
      </details>
    </section>
  </>;
}

function Screening() {
  const {t, q, n} = useCarbonText();
  const [sector, setSector] = useState<CarbonSector>('cement');
  const [emissions, setEmissions] = useState<number | null>(sectorCases.cement.emissions);
  const band = sbceBand(emissions);
  const special = sector in sectorSpecial ? sectorSpecial[sector as keyof typeof sectorSpecial] : null;
  const stage = sectorCases[sector].stage;
  const summary = special ? t(special) : band ? t(bandText[band].detail) : q('Informe um valor anual válido.', 'Enter a valid annual value.', 'Introduce un valor anual válido.');
  const title = sector === 'agriculture'
    ? q('Exclusão legal para a produção primária', 'Statutory exclusion for primary production', 'Exclusión legal de la producción primaria')
    : special ? q('Verifique o tratamento específico', 'Check the specific treatment', 'Verifica el tratamiento específico')
      : band ? t(bandText[band].title) : q('Preencha as emissões', 'Enter emissions', 'Introduce las emisiones');
  const labels = [
    '≤ ' + n(sbceThresholds.report),
    '> ' + n(sbceThresholds.report) + ' · ≤ ' + n(sbceThresholds.reconcile),
    '> ' + n(sbceThresholds.reconcile)
  ];
  return <section className="carbon-panel">
    <h2>{q('Triagem didática do SBCE', 'SBCE learning assessment', 'Evaluación didáctica del SBCE')}</h2>
    <p>{q('Escolha um caso fictício e ajuste as emissões anuais da fonte ou instalação no recorte aplicável. A triagem compara o valor com o art. 30 da Lei nº 15.042/2024.',
      'Choose a fictional case and adjust annual emissions from the source or facility within the applicable boundary. The assessment compares the amount with Article 30 of Law 15,042/2024.',
      'Elige un caso ficticio y ajusta las emisiones anuales de la fuente o instalación en el ámbito aplicable. La evaluación compara el valor con el art. 30 de la Ley 15.042/2024.')}</p>
    <div className="carbon-fields">
      <label className="carbon-field">{q('Atividade do caso', 'Case activity', 'Actividad del caso')}
        <select value={sector} onChange={event => {
          const next = event.target.value as CarbonSector;
          setSector(next);
          setEmissions(sectorCases[next].emissions);
        }}>
          {(Object.keys(sectorCases) as CarbonSector[]).map(key => <option key={key} value={key}>{t(sectorCases[key].name)}</option>)}
        </select>
      </label>
      <NumberInput label={q('Emissões anuais no recorte', 'Annual emissions in boundary', 'Emisiones anuales en el ámbito')}
        unit={q('tCO₂e/ano', 'tCO₂e/yr', 'tCO₂e/año')} value={emissions} onChange={setEmissions}/>
    </div>
    <div className="carbon-bands" aria-label={q('Patamares do artigo 30 em tCO₂e por ano', 'Article 30 bands in tCO₂e per year', 'Umbrales del artículo 30 en tCO₂e al año')}>
      {bands.map((key, i) => <div key={key} data-current={band === key && !special}>
        <strong>{labels[i]}</strong><span>{t(bandText[key].title)}</span>
      </div>)}
    </div>
    <div className="carbon-explanation carbon-screening-result" aria-live="polite"><Icon name={special ? 'info' : 'target'}/><div>
      <h3>{title}</h3><p>{summary}</p>
      {stage > 0 && <p><strong>{t(sectorTimeline[stage - 1].title)} · {t(sectorTimeline[stage - 1].year)}</strong> {q('para início setorial do MRV, conforme o recorte regulamentado.',
        'for the start of sectoral MRV, subject to the regulated boundary.', 'para el inicio sectorial del MRV, según el ámbito regulado.')}</p>}
    </div></div>
    <p className="carbon-note">{q('A aplicação real depende da fonte, instalação, gases, metodologia de MRV e fase em vigor. O órgão gestor pode elevar os patamares em ato específico. Use o recorte regulamentar em vez de somar automaticamente os escopos 1, 2 e 3 do inventário.',
      'Actual coverage depends on the source, facility, gases, MRV methodology and current stage. The regulator may raise the thresholds by a specific act. Use the regulatory boundary rather than automatically adding corporate scopes 1, 2 and 3.',
      'La aplicación real depende de la fuente, instalación, gases, metodología de MRV y fase vigente. El regulador puede elevar los umbrales por acto específico. Aplica el ámbito normativo antes de sumar los alcances 1, 2 y 3.')}</p>
    <SourceLinks ids={['law', 'schedule']}/>
  </section>;
}

function EmissionsLab({kind, onChangeCase}: {kind: CarbonCase; onChangeCase: (kind: CarbonCase) => void}) {
  const {t, q, n} = useCarbonText();
  const [inputs, setInputs] = useState(carbonDefaults);
  const input = inputs[kind];
  const grid = kind === 'electricity';
  const item = carbonCases[kind];
  const result = estimateCarbon(kind, input);
  const activityUnit = grid ? q('MWh/ano', 'MWh/yr', 'MWh/año') : q('L/ano', 'L/yr', 'L/año');
  const tonnesUnit = q('t CO₂/ano', 't CO₂/yr', 't CO₂/año');
  function update(change: Partial<CarbonInput>) {
    setInputs(previous => ({...previous, [kind]: {...previous[kind], ...change}}));
  }
  return <section className="carbon-panel">
    <div className="carbon-section-head"><h2>{q('Compare dois cenários', 'Compare two scenarios', 'Compara dos escenarios')}</h2>
      <Button icon="reset" onClick={() => setInputs(previous => ({...previous, [kind]: carbonDefaults[kind]}))}>{q('Repor exemplo', 'Reset example', 'Restablecer ejemplo')}</Button>
    </div>
    <div className="carbon-pills carbon-case-picker" role="group" aria-label={q('Caso do simulador', 'Simulation case', 'Caso del simulador')}>
      {caseIds.map(id => <button key={id} type="button" aria-pressed={kind === id} onClick={() => onChangeCase(id)}>{t(carbonCases[id].short)}</button>)}
    </div>
    <div className="carbon-lab">
      <div className="carbon-lab-form">
        <div className="carbon-lab-image"><img loading="lazy" src={BIO_ASSETS[item.image]} alt={t(item.alt)} width="840" height="473"/></div>
        <h3>{t(item.title)}</h3><p>{t(item.description)}</p>
        <div className="carbon-fields">
          <NumberInput label={q('Consumo anual inicial', 'Initial annual consumption', 'Consumo anual inicial')}
            unit={activityUnit} value={input.activity} onChange={activity => update({activity})}/>
          <NumberInput label={q('Fator de emissão', 'Emission factor', 'Factor de emisión')}
            unit={grid ? 't CO₂/MWh' : 'kg CO₂/L'} value={input.factor} max={100} onChange={factor => update({factor})}/>
        </div>
        <label className="carbon-range">
          <span>{q('Redução de consumo', 'Consumption reduction', 'Reducción del consumo')} <strong>{n(input.reduction)}%</strong></span>
          <input type="range" min="0" max="100" step="1" value={input.reduction}
            aria-valuetext={n(input.reduction) + '%'} onChange={event => update({reduction: event.target.valueAsNumber})}/>
        </label>
      </div>
      <div className="carbon-lab-results">
        <span className="carbon-label">{grid ? q('Escopo 2 · Eletricidade adquirida', 'Scope 2 · Purchased electricity', 'Alcance 2 · Electricidad comprada')
          : q('Escopo 1 · Combustão na fonte', 'Scope 1 · On-site combustion', 'Alcance 1 · Combustión en la fuente')}</span>
        {result ? <>
          <h3>{q('CO₂ evitado no cenário', 'CO₂ avoided in the scenario', 'CO₂ evitado en el escenario')}</h3>
          <output className="carbon-avoided" aria-live="off">{n(result.avoided, 3)} <small>{tonnesUnit}</small></output>
          <dl className="carbon-bars">
            <div><dt>{q('Situação inicial', 'Baseline', 'Situación inicial')}</dt><dd>{n(result.baseline, 3)} {tonnesUnit}</dd>
              <span aria-hidden="true"><i style={{width: result.baseline > 0 ? '100%' : '0%'}}/></span></div>
            <div><dt>{q('Com a intervenção', 'With intervention', 'Con la intervención')}</dt><dd>{n(result.project, 3)} {tonnesUnit}</dd>
              <span aria-hidden="true"><i style={{width: result.baseline > 0 ? (100 - input.reduction) + '%' : '0%'}}/></span></div>
          </dl>
          <p>{q('Consumo economizado', 'Consumption saved', 'Consumo ahorrado')} <strong>{n(result.savedActivity, 2)} {activityUnit}</strong></p>
          <div className="carbon-formula">
            <strong>{q('Memória de cálculo', 'Calculation notes', 'Memoria de cálculo')}</strong>
            <p>{n(result.savedActivity, 2)} × {n(input.factor ?? 0, grid ? 4 : 3)}{grid ? '' : ' ÷ ' + n(1000)} = {n(result.avoided, 3)} {tonnesUnit}</p>
            <small>{grid
              ? q('MWh economizados × fator em t CO₂/MWh.', 'MWh saved × factor in t CO₂/MWh.', 'MWh ahorrados × factor en t CO₂/MWh.')
              : q('Litros economizados × kg CO₂/L, convertidos para toneladas.', 'Litres saved × kg CO₂/L, converted to tonnes.', 'Litros ahorrados × kg CO₂/L, convertidos a toneladas.')}</small>
          </div>
        </> : <p role="status">{q('Informe consumo e fator válidos e não negativos.', 'Enter a valid, non-negative consumption and factor.', 'Introduce un consumo y factor válidos y no negativos.')}</p>}
        <p className="carbon-note">{grid
          ? q('O fator de 0,05 t CO₂/MWh é um exemplo. Para inventário do SIN, use o fator médio do período publicado pelo MCTI/SIRENE.',
            'The 0.05 t CO₂/MWh factor is illustrative. For a Brazilian grid inventory, use the period average published by MCTI/SIRENE.',
            'El factor de 0,05 t CO₂/MWh es ilustrativo. Para inventarios del SIN, usa el factor medio del período publicado por MCTI/SIRENE.')
          : q('O fator didático de 2,68 kg CO₂/L usa diesel fóssil de referência, densidade assumida de 0,84 kg/L, PCI de 43 MJ/kg e 74,1 kg CO₂/GJ do IPCC. Use dados do combustível real em inventários.',
            'The illustrative factor of 2.68 kg CO₂/L uses fossil diesel, assumed density of 0.84 kg/L, net calorific value of 43 MJ/kg and the IPCC’s 74.1 kg CO₂/GJ. Use actual fuel data for inventories.',
            'El factor didáctico de 2,68 kg CO₂/L usa diésel fósil, densidad supuesta de 0,84 kg/L, PCI de 43 MJ/kg y 74,1 kg CO₂/GJ del IPCC. Usa datos del combustible real en inventarios.')}</p>
        <p className="carbon-note">{q('A comparação mantém o serviço e o fator de emissão fixos. O resultado estima apenas CO₂ no recorte escolhido. Créditos exigem metodologia e verificação próprias.',
          'The comparison keeps service output and the emission factor constant. It estimates CO₂ only within the chosen boundary. Credits require their own methodology and verification.',
          'La comparación mantiene fijos el servicio y el factor de emisión. Estima solo CO₂ en el ámbito elegido. Los créditos requieren metodología y verificación propias.')}</p>
        <SourceLinks ids={grid ? ['electricity'] : ['fuel', 'calorific']}/>
      </div>
    </div>
  </section>;
}

function CarbonChallenge() {
  const {t, q} = useCarbonText();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const attempted = Object.keys(answers).length;
  const correct = carbonQuiz.filter((item, i) => answers[i] === item.correct).length;
  return <section className="carbon-panel">
    <div className="carbon-section-head">
      <h2>{q('Desafio de aplicação', 'Application challenge', 'Desafío de aplicación')}</h2>
      <Button icon="reset" disabled={attempted === 0} onClick={() => setAnswers({})}>{q('Recomeçar', 'Start again', 'Reiniciar')}</Button>
    </div>
    <p aria-live="polite">{q('Acertos', 'Correct', 'Aciertos')} <strong>{correct}/{carbonQuiz.length}</strong> · {q('Respondidas', 'Answered', 'Respondidas')} <strong>{attempted}/{carbonQuiz.length}</strong></p>
    <div className="carbon-quiz-grid">{carbonQuiz.map((item, i) => {
      const answer = answers[i];
      return <article key={i} className="carbon-question">
        <h3>{t(item.question)}</h3>
        <div className="carbon-options" role="group" aria-label={t(item.question)}>
          {item.answers.map((option, j) => <button key={j} type="button" aria-pressed={answer === j}
            data-answer={answer === j ? j === item.correct ? 'correct' : 'incorrect' : undefined}
            onClick={() => setAnswers(previous => ({...previous, [i]: j}))}>{t(option)}</button>)}
        </div>
        {answer !== undefined && <p className="carbon-feedback" role="status"><strong>
          {answer === item.correct ? q('Correto.', 'Correct.', 'Correcto.') : q('Revise este ponto.', 'Review this point.', 'Revisa este punto.')}
        </strong> {t(item.feedback)}</p>}
      </article>;
    })}</div>
  </section>;
}

export default function Decarbonization() {
  const {t, q, lang} = useCarbonText();
  const [section, setSection] = useState<Section>('intro');
  const [kind, setKind] = useState<CarbonCase>('microgrid');
  const navigation = useRef<HTMLElement>(null);
  const date = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : lang, {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(carbonReviewedOn));
  function open(next: Section) {
    setSection(next);
    navigation.current?.scrollIntoView({block: 'start'});
  }
  function openCase(next: CarbonCase) {
    setKind(next);
    open('lab');
  }
  return <section className="carbon-page">
    <header className="carbon-hero">
      <img src={BIO_ASSETS['carbon-cover']} alt={t(carbonCases.electricity.alt)} width="1260" height="709"/>
      <div className="carbon-hero-overlay"/>
      <div className="carbon-hero-content">
        <span className="carbon-label">{q('Energia, clima e indústria', 'Energy, climate and industry', 'Energía, clima e industria')}</span>
        <h1>{q('Descarbonização', 'Decarbonization', 'Descarbonización')}</h1>
        <p>{q('Entenda a lei brasileira do mercado de carbono e pratique a redução de emissões em casos da Amazônia.',
          'Understand Brazil’s carbon market law and practise emissions reduction through Amazon region cases.',
          'Conoce la ley brasileña del mercado de carbono y practica la reducción de emisiones con casos amazónicos.')}</p>
        <div className="carbon-hero-actions">
          <Button kind="primary" icon="target" onClick={() => open('screening')}>{q('Simular enquadramento', 'Try a coverage assessment', 'Simular aplicación')}</Button>
          <Button icon="flask" onClick={() => open('lab')}>{q('Comparar emissões', 'Compare emissions', 'Comparar emisiones')}</Button>
        </div>
      </div>
      <span className="carbon-image-credit">{q('Cenas ilustrativas geradas por IA', 'Illustrative AI-generated scenes', 'Escenas ilustrativas generadas por IA')}</span>
    </header>
    <nav className="carbon-tabs" ref={navigation} aria-label={q('Conteúdo de Descarbonização', 'Decarbonization content', 'Contenido de Descarbonización')}>
      {(Object.keys(sections) as Section[]).map(key => <button type="button" key={key} aria-pressed={key === section}
        aria-controls={'carbon-section-' + key} onClick={() => setSection(key)}><Icon name={sections[key].icon}/>{t(sections[key].label)}</button>)}
    </nav>
    <div id="carbon-section-intro" hidden={section !== 'intro'}><Introduction onCase={openCase}/></div>
    <div id="carbon-section-law" hidden={section !== 'law'}><LawAndMarket/></div>
    <div id="carbon-section-screening" hidden={section !== 'screening'}><Screening/></div>
    <div id="carbon-section-lab" hidden={section !== 'lab'}><EmissionsLab kind={kind} onChangeCase={setKind}/></div>
    <div id="carbon-section-quiz" hidden={section !== 'quiz'}><CarbonChallenge/></div>
    <p className="carbon-review"><Icon name="clock"/>{q('Referências legais conferidas em', 'Legal references checked on', 'Referencias legales consultadas el')} <time dateTime={carbonReviewedOn}>{date}</time>.</p>
  </section>;
}
