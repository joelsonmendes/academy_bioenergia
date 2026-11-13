import {T, tr, format} from './model';
import type {Language} from './types';
import {escapeHTML, offlineDocument} from './study-export.js';
import type {IntegratorRecord} from './integrator-schema';
import {equivalentHours, projectEfficiencies, submissionReadiness, type SchoolComparison, type SchoolEstimate} from './integrator-engine';
import {batteryFormula, caseLabel, caseReferences, choices, comparisonRows, dispatchAssumptions, energyFormula, equipmentName, labels,
  projectBrief, projectName, projectSteps, pvFormula, rubric, scenarios, schoolTitle, simulationScope, studyScope} from './integrator-content';

export function projectDiagram(diesel: boolean, lang: Language) {
  const q = (pt: string, en: string, es: string) => tr(T(pt, en, es), lang);
  const caption = diesel
    ? q('Campo FV e banco de baterias ligados ao inversor-carregador. O inversor e o gerador alimentam o barramento CA, que atende as cargas.',
      'PV array and battery bank connect to the inverter-charger. The inverter and generator feed the AC bus supplying the loads.',
      'Campo FV y banco de baterías conectados al inversor-cargador. El inversor y el generador alimentan la barra CA que abastece las cargas.')
    : q('Campo FV e banco de baterias ligados ao inversor-carregador. O inversor alimenta o barramento CA, que atende as cargas.',
      'PV array and battery bank connect to the inverter-charger. The inverter feeds the AC bus supplying the loads.',
      'Campo FV y banco de baterías conectados al inversor-cargador. El inversor alimenta la barra CA que abastece las cargas.');
  const box = (x: number, y: number, width: number, lines: string[], fill: string) => {
    const center = x + width / 2;
    return `<rect x="${x}" y="${y}" width="${width}" height="52" rx="8" fill="${fill}" stroke="#729189"/><text x="${center}" y="${y + (lines.length === 2 ? 22 : 32)}">${lines.map((line, index) =>
      `<tspan x="${center}" dy="${index ? 17 : 0}">${escapeHTML(line)}</tspan>`).join('')}</text>`;
  };
  const inverter = q('Inversor / carregador', 'Inverter / charger', 'Inversor / cargador').split(' / ');
  const bus = lang === 'en' ? ['AC bus'] : [q('Barramento', 'Bus', 'Barra'), 'CA'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 572 156" role="img" aria-label="${escapeHTML(caption)}" style="width:100%;height:auto;display:block">
    <defs><marker id="flow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill="#245a51"/></marker></defs>
    <rect width="572" height="156" rx="12" fill="#eff6f4"/>
    <g stroke="#245a51" stroke-width="2" fill="none" marker-end="url(#flow)">
      <path d="M124 42H157"/><path d="M281 42H314"/><path d="M439 42H471"/>
      <path d="M220 69V89" marker-start="url(#flow)"/>${diesel ? '<path d="M376 92V71"/>' : ''}
    </g>
    <g fill="#14362f" font-family="Arial,sans-serif" font-size="16" font-weight="600" text-anchor="middle">
      ${box(12, 16, 112, [q('Campo FV', 'PV array', 'Campo FV')], '#d8efe7')}
      ${box(158, 16, 123, inverter, '#f9fcfb')}
      ${box(315, 16, 124, bus, '#f9fcfb')}
      ${box(472, 16, 88, [q('Cargas', 'Loads', 'Cargas')], '#dcecf3')}
      ${box(158, 92, 123, [q('Baterias', 'Batteries', 'Baterías')], '#d8efe7')}
      ${diesel ? box(315, 92, 124, [q('Gerador', 'Diesel', 'Generador'), q('diesel', 'generator', 'diésel')], '#f9e8d4') : ''}
    </g></svg>`;
  return {svg, caption};
}

function table(headings: string[], rows: string[][]) {
  const cells = (values: string[], tag: 'th' | 'td') => values.map(value => `<${tag}>${escapeHTML(value)}</${tag}>`).join('');
  return `<table><thead><tr>${cells(headings, 'th')}</tr></thead><tbody>${rows.map(row => `<tr>${cells(row, 'td')}</tr>`).join('')}</tbody></table>`;
}

export function makeProjectReport(record: IntegratorRecord, estimate: SchoolEstimate, comparison: SchoolComparison | null, lang: Language, logo: string) {
  const t = (value: Parameters<typeof tr>[0]) => tr(value, lang);
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const n = (value: number, digits = 2) => format(value, lang, digits);
  const readiness = submissionReadiness(record, estimate, comparison);
  const status = Object.values(readiness).every(Boolean) ? q('Pronto para revisão docente', 'Ready for instructor review', 'Listo para revisión docente')
    : q('Rascunho · evidências pendentes', 'Draft · evidence pending', 'Borrador · evidencias pendientes');
  const day = new Intl.DateTimeFormat(lang, {dateStyle: 'long', timeZone: 'America/Rio_Branco'}).format(new Date());
  const section = (title: string, content: string) => `<article><h2>${escapeHTML(title)}</h2>${content}</article>`;
  const note = (title: string, content: string) => `<h3>${escapeHTML(title)}</h3><p class="project-note">${escapeHTML(content.trim() || '—')}</p>`;
  const time = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
  const inputs = record.design;
  const values = record.simulation;
  const preview = estimate.preview;
  const diagram = projectDiagram(record.choice === 'diesel', lang);
  const content = `
    <style>
      .project-actions {display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-block:18px}
      .project-actions button {cursor:pointer;background:#087e6e;border:0;color:white;padding:10px 16px;border-radius:8px;font:inherit}
      .project-note {white-space:pre-wrap;overflow-wrap:anywhere}
      th {background:#edf6f4}
      td {overflow-wrap:anywhere}
      figure {margin:15px 0;break-inside:avoid}
      figcaption {font-size:12px;color:#536778}
      @media print {.project-actions {display:none} @page {margin:14mm} thead {display:table-header-group}}
    </style>
    <p><strong>${escapeHTML(t(caseLabel))} · ${escapeHTML(status)}</strong><br>${escapeHTML(day)}</p>
    ${record.author.trim() ? `<p><strong>${escapeHTML(q('Aluno ou equipe', 'Student or team', 'Estudiante o equipo'))}</strong> · ${escapeHTML(record.author.trim())}</p>` : ''}
    <p>${escapeHTML(t(projectBrief))}</p>
    <div class="project-actions"><button type="button" onclick="window.print()">${q('Imprimir / Salvar em PDF', 'Print / Save as PDF', 'Imprimir / Guardar como PDF')}</button></div>
    ${section(t(projectSteps.loads.label), table(
      [t(labels.equipment), t(labels.quantity), 'W', q('Janela de uso', 'Use window', 'Horario de uso'), t(labels.duty), 'kWh/d', t(labels.essential)],
      estimate.rows.map(row => [equipmentName(row, lang) || '—', n(row.quantity, 0), n(row.watts),
        time(row.start) + '–' + time(row.end), n(row.duty * 100, 0) + '%', n(row.kWh, 3),
        row.essential ? q('Sim', 'Yes', 'Sí') : '—'])
    ) + `<p>${t(labels.demand)} <strong>${n(estimate.daily, 3)} kWh/d</strong> · ${t(labels.essentialDemand)} <strong>${n(estimate.essential, 3)} kWh/d</strong> · ${t(labels.peak)} <strong>${n(estimate.peak, 3)} kW</strong></p>
      <code>${t(energyFormula)}</code><p>${q('Horas equivalentes = duração da janela × fração de tempo ativo.', 'Equivalent hours = window duration × active time fraction.', 'Horas equivalentes = duración del horario × fracción de tiempo activo.')}</p>
      ${estimate.rows[0] ? `<p>${escapeHTML(equipmentName(estimate.rows[0], lang))} · ${n(estimate.rows[0].quantity, 0)} × ${n(estimate.rows[0].watts)} W × ${n(equivalentHours(estimate.rows[0]))} h ÷ ${n(1000, 0)} = ${n(estimate.rows[0].kWh, 3)} kWh/d</p>` : ''}`)}
    ${section(t(projectSteps.sizing.label), table(
      [q('Premissa', 'Assumption', 'Supuesto'), q('Valor', 'Value', 'Valor')],
      [[t(labels.hsp), n(inputs.hsp) + ' h/d'], [t(labels.moduleW), n(inputs.moduleW, 0) + ' Wp'],
        [t(labels.pr), n(inputs.pr, 0) + '%'], [t(labels.autonomyDays), n(inputs.autonomyDays) + ' d'], [t(labels.dod), n(inputs.dod, 0) + '%'],
        [q('Eficiências inversor / ciclo / descarga', 'Inverter / cycle / discharge efficiencies', 'Eficiencias inversor / ciclo / descarga'),
          [projectEfficiencies.inverterEff, projectEfficiencies.batteryRoundEff, projectEfficiencies.batteryDisEff].map(value => n(value) + '%').join(' / ')]]
    ) + `<p><code>${t(pvFormula)}</code><code>${t(batteryFormula)}</code></p>` + (preview ? table(
      [q('Resultado preliminar', 'Preliminary result', 'Resultado preliminar'), q('Valor', 'Value', 'Valor')],
      [[q('Potência FV calculada / instalada', 'Calculated / installed PV power', 'Potencia FV calculada / instalada'), n(preview.requiredKWp, 3) + ' / ' + n(preview.installedKWp, 3) + ' kWp'],
        [t(labels.modules), n(preview.neededModules, 0)],
        [t(labels.batteryKWh), n(preview.batteryNeededKwh) + ' kWh'],
        [q('Soma das potências ativas nominais', 'Sum of active nameplate ratings', 'Suma de potencias activas nominales'), n(preview.referenceInverterKW, 3) + ' kW']]
    ) + `<p>${q('Módulos = potência FV em Wp ÷ potência unitária, com arredondamento para cima.', 'Module count = PV power in Wp ÷ module power, rounded up.', 'Módulos = potencia FV en Wp ÷ potencia unitaria, redondeada hacia arriba.')}</p>` : ''))}
    ${section(t(projectSteps.compare.label), comparison && readiness.comparison ? `
      <p>${t(labels.hsp)} ${n(values.hsp)} h/d · ${t(labels.modules)} ${n(values.modules, 0)} (${n(comparison.input.pvKWp, 3)} kWp) · ${t(labels.batteryKWh)} ${n(values.batteryKWh)} kWh · ${t(labels.inverterKW)} ${n(values.inverterKW)} kW</p>
      <p>${t(labels.socStart)} ${n(values.socStart, 1)}% · SOC mín. ${n(comparison.input.socMin, 0)}% · ${t(labels.generatorKW)} ${n(values.generatorKW)} kW · ${t(labels.fuelLiters)} ${n(values.fuelLiters)} L</p>
      ${table([q('Indicador', 'Metric', 'Indicador'), 'A · ' + t(scenarios.solar), 'B · ' + t(scenarios.diesel)], comparisonRows(comparison, lang))}
      <ul>${dispatchAssumptions(comparison, lang).map(line => `<li>${escapeHTML(line)}</li>`).join('')}</ul>
      <p>${escapeHTML(t(simulationScope))}</p>` : `<p>${q('Simulação pendente para os dados atuais.', 'Simulation pending for current inputs.', 'Simulación pendiente para los datos actuales.')}</p>`)}
    ${section(t(projectSteps.delivery.label), `
      <p><strong>${q('Decisão proposta', 'Proposed decision', 'Decisión propuesta')}</strong> · ${record.choice ? t(choices[record.choice]) : '—'}</p>
      ${note(t(labels.rationale), record.rationale)}${note(t(labels.maintenance), record.maintenance)}${note(t(labels.fieldData), record.fieldData)}
      <h3>${q('Diagrama funcional', 'Functional diagram', 'Diagrama funcional')} · ${record.choice === 'diesel' ? 'B' : 'A'}</h3>
      <figure>${diagram.svg}<figcaption>${escapeHTML(diagram.caption)} ${q('Topologia conceitual.', 'Conceptual topology.', 'Topología conceptual.')}</figcaption></figure>`)}
    ${section(t(labels.rubric), table(
      [q('Critério', 'Criterion', 'Criterio'), q('Peso', 'Weight', 'Peso'), q('Evidência esperada', 'Expected evidence', 'Evidencia esperada')],
      rubric.map(item => [t(item.title), item.weight + '%', t(item.evidence)])
    ))}
    ${section(t(labels.references), `<p>${escapeHTML(t(studyScope))}</p><ul>${caseReferences.map(ref =>
      `<li><a href="${escapeHTML(ref.url)}">${escapeHTML(ref.name)}</a></li>`).join('')}</ul>`)}
  `;
  return offlineDocument(t(projectName) + ' · ' + t(schoolTitle), content, lang === 'pt' ? 'pt-BR' : lang, logo);
}
