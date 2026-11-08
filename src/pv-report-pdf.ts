import reportRegular from '../assets/fonts/bioenergia-report-regular.ttf';
import reportBold from '../assets/fonts/bioenergia-report-bold.ttf';
import type {Language} from './types';
import {format, tr, T} from './model';
import {pvFieldLabels, pvReferences, pvSystems, installationGuidance} from './pv-report-content';
import type {PVProject, PVCalculation, PVInputKey} from './pv-report-engine';

function pdfText(value: string) {
  return value.replace(/Δ/g, 'Delta ').replace(/η/g, 'eta').replace(/ρ/g, 'rho').replace(/Ω/g, 'ohm')
    .replace(/₀/g, '0').replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3').replace(/ₚ/g, 'p')
    .replace(/ₜ/g, 't').replace(/ₑ/g, 'e').replace(/ṁ/g, 'm').replace(/→/g, '->')
    .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≈/g, '~').replace(/−/g, '-')
    .replace(/[–—]/g, '-').replace(/…/g, '...').replace(/✓/g, 'OK');
}
async function imageData(source: string, width: number, height: number) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS');
  ctx.fillStyle = '#fff';ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}
export async function buildPVReport(project: PVProject, result: PVCalculation, lang: Language, images: {logo: string;diagram: string}) {
  const {jsPDF} = await import('jspdf');
  const doc = new jsPDF({unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true});
  doc.addFileToVFS('BioEnergiaReport-Regular.ttf', reportRegular);
  doc.addFileToVFS('BioEnergiaReport-Bold.ttf', reportBold);
  doc.addFont('BioEnergiaReport-Regular.ttf', 'BioEnergiaReport', 'normal');
  doc.addFont('BioEnergiaReport-Bold.ttf', 'BioEnergiaReport', 'bold');
  const t = (pt: string, en: string, es: string) => tr(T(pt, en, es), lang);
  const n = (value: number | null, digits = 2) => format(value, lang, digits);
  const day = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US',
    {dateStyle: 'long', timeZone: 'America/Rio_Branco'}).format(new Date());
  const {logo, diagram} = images;
  let y = 0;
  const navy: [number, number, number] = [17, 39, 57];
  const green: [number, number, number] = [19, 125, 92];
  const muted: [number, number, number] = [80, 102, 117];
  const textWidth = () => doc.internal.pageSize.getWidth() - 30;

  function header() {
    const width = doc.internal.pageSize.getWidth();
    doc.setFillColor(...navy);doc.rect(0, 0, width, 27, 'F');
    doc.setFillColor(137, 247, 128);
    doc.lines([[5, -7], [-1, 5], [5, 0], [-8, 10], [2, -7], [-5, 0]], 17, 10, [1, 1], 'F', true);
    doc.setFont('BioEnergiaReport', 'bold');doc.setFontSize(12);doc.setTextColor(255, 255, 255);
    doc.text('BIOENERGIA ACADEMY', 32, 12);
    doc.setFont('BioEnergiaReport', 'normal');doc.setFontSize(7);
    doc.text(t('ENGENHARIA FOTOVOLTAICA EDUCACIONAL', 'EDUCATIONAL PHOTOVOLTAIC ENGINEERING', 'INGENIERIA FOTOVOLTAICA EDUCATIVA'), 32, 18);
    doc.addImage(logo, 'PNG', width - 55, 6, 40, 11.6);
    doc.setDrawColor(...green);doc.setLineWidth(.7);doc.line(15, 31, width - 15, 31);
    doc.setTextColor(...navy);y = 40;
  }
  function newPage(landscape = false) {
    doc.addPage('a4', landscape ? 'landscape' : 'portrait');header();
  }
  function room(height: number) {
    if (y + height > doc.internal.pageSize.getHeight() - 20) newPage();
  }
  function paragraph(text: string, size = 9, color = muted) {
    doc.setFont('BioEnergiaReport', 'normal');doc.setFontSize(size);doc.setTextColor(...color);
    const lines = doc.splitTextToSize(pdfText(text), textWidth()) as string[];
    for (const line of lines) {
      room(size * .48 + 1);
      doc.text(line, 15, y);y += size * .48;
    }
    y += 3;
  }
  function heading(text: string) {
    room(25);
    y += 4;doc.setFont('BioEnergiaReport', 'bold');doc.setFontSize(12);doc.setTextColor(...green);
    doc.text(pdfText(text), 15, y);y += 8;
  }
  function table(headers: string[], rows: string[][], widths?: number[]) {
    const cols = widths ?? headers.map(() => textWidth() / headers.length);
    function row(values: string[], head: boolean) {
      doc.setFont('BioEnergiaReport', head ? 'bold' : 'normal');doc.setFontSize(8);
      const cells = values.map((value, i) => doc.splitTextToSize(pdfText(value), cols[i] - 5) as string[]);
      const height = Math.max(...cells.map(lines => lines.length)) * 3.6 + 2.8;
      if (y + height > doc.internal.pageSize.getHeight() - 20) {
        newPage();
        if (!head) row(headers, true);
      }
      let x = 15;
      doc.setFillColor(...(head ? navy : [245, 248, 250] as [number, number, number]));
      doc.rect(15, y - 3.4, cols.reduce((sum, width) => sum + width, 0), height, 'F');
      doc.setTextColor(...(head ? [255, 255, 255] as [number, number, number] : navy));
      for (let i = 0; i < cells.length; i++) {
        doc.text(cells[i], x + 2.5, y + .6, {lineHeightFactor: 1.3});x += cols[i];
      }
      doc.setDrawColor(221, 229, 235);doc.setLineWidth(.15);
      doc.line(15, y + height - 3.4, x, y + height - 3.4);y += height;
    }
    row(headers, true);
    for (const values of rows) row(values, false);
    y += 3;
  }
  const fieldTable = (keys: PVInputKey[]) => table(
    [t('Dado de entrada', 'Input parameter', 'Dato de entrada'), t('Valor adotado', 'Selected value', 'Valor adoptado')],
    keys.map(key => [tr(pvFieldLabels[key].label, lang), n(project.inputs[key]) + ' ' + pvFieldLabels[key].unit]), [125, 55]);
  const resultTable = (rows: string[][]) => table(
    [t('Grandeza calculada', 'Calculated quantity', 'Magnitud calculada'), t('Resultado', 'Result', 'Resultado')], rows, [125, 55]);
  const errors = result.checks.filter(check => check.kind === 'error');
  const reviews = result.checks.filter(check => check.kind === 'review');
  header();
  doc.setFont('BioEnergiaReport', 'bold');doc.setFontSize(19);doc.setTextColor(...navy);
  doc.text(t('Relatório técnico fotovoltaico', 'Photovoltaic technical report', 'Informe técnico fotovoltaico'), 15, y);y += 8;
  paragraph(t('Memória de cálculo e diagrama unifilar preliminar', 'Calculation record and preliminary single-line diagram', 'Memoria de cálculo y diagrama unifilar preliminar'), 11);
  paragraph(project.title, 10);
  paragraph(day + ' · ' + tr(pvSystems[project.system], lang));
  table([t('Identificação', 'Identification', 'Identificación'), t('Informação', 'Information', 'Información')], [
    [t('Cliente', 'Client', 'Cliente'), project.client.name || '—'],
    [t('Contato / unidade consumidora', 'Contact / consumer unit', 'Contacto / unidad consumidora'), [project.client.contact, project.client.consumerUnit].filter(Boolean).join(' · ') || '—'],
    [t('Endereço', 'Address', 'Dirección'), [project.site.address, project.site.city, project.site.uf, project.site.cep].filter(Boolean).join(', ')],
    [t('Coordenadas', 'Coordinates', 'Coordenadas'), n(project.inputs.latitude, 5) + ', ' + n(project.inputs.longitude, 5)],
    [t('Autor / registro informado', 'Author / declared registration', 'Autor / registro informado'), [project.designer, project.registration].filter(Boolean).join(' · ') || '—']
  ], [55, 125]);
  heading(t('Resumo do dimensionamento', 'Sizing overview', 'Resumen del dimensionamiento'));
  resultTable([
    [t('Arranjo instalado', 'Installed array', 'Generador instalado'), n(result.installedKWp) + ' kWp · ' + result.modules + ' ' + t('módulos', 'modules', 'módulos')],
    [t('Configuração', 'Configuration', 'Configuración'), result.strings + ' × ' + result.ns + ' · MPPT ' + result.distribution.join(' / ')],
    [t('Potência nominal CA selecionada', 'Selected AC rated power', 'Potencia nominal CA seleccionada'), n(project.inputs.inverterKW) + ' kW'],
    [t('HSP utilizada no plano dos módulos', 'Peak sun hours used on array plane', 'HSP utilizada en el plano de módulos'), n(result.hsp, 3) + ' h/dia'],
    [t('Geração diária / período', 'Generation per day / period', 'Generación diaria / período'), n(result.dailyGeneration) + ' / ' + n(result.monthlyGeneration) + ' kWh'],
    [t('Seção do cabo da string / queda', 'String cable size / voltage drop', 'Sección del cable de cadena / caída'), n(project.inputs.dcSection, 1) + ' mm² / ' + n(result.dcDropPercent) + '%']
  ]);
  paragraph(t('Estudo preliminar educacional com premissas declaradas. A emissão deste PDF requer revisão técnica do local, dos fabricantes, das proteções e das normas aplicáveis antes da execução.',
    'Preliminary educational study with declared assumptions. This PDF requires technical review of the site, equipment, protection and applicable standards before installation.',
    'Estudio educativo preliminar con supuestos declarados. Este PDF requiere revisión técnica del lugar, fabricantes, protecciones y normas aplicables antes de la ejecución.'));
  paragraph(t('Verificações com erro', 'Failed checks', 'Verificaciones con error') + ' ' + errors.length + ' · ' +
    t('Itens para revisão', 'Review items', 'Elementos a revisar') + ' ' + reviews.length, 9, errors.length ? [169, 49, 45] : green);

  newPage();
  heading(t('1. Recurso solar e consumo', '1. Solar resource and demand', '1. Recurso solar y consumo'));
  paragraph(project.site.locationNote);
  fieldTable(['monthlyKwh', 'days', 'coverage', 'pr', 'dcAc', 'tilt', 'azimuth', 'minTemp', 'maxCellTemp']);
  if (project.solar && result.monthlyPOA && project.solarMode !== 'manual') {
    paragraph('NASA POWER · ' + project.solar.period + ' · ' + t('Consulta', 'Retrieved', 'Consulta') + ' ' + project.solar.retrievedAt.slice(0, 10));
    paragraph(t('Irradiação mensal média diária. A transposição usa dia representativo mensal, céu isotrópico e albedo 0,20. A inclinação sugerida maximiza a média anual do modelo entre 0° e 60°. Sombreamento e horizonte devem ser avaliados no local.',
      'Monthly mean daily irradiation. Transposition uses a representative monthly day, isotropic sky and albedo 0.20. Suggested tilt maximizes modelled annual mean over 0°–60°. Assess shading and horizon on site.',
      'Irradiación media diaria mensual. Transposición con día mensual representativo, cielo isotrópico y albedo 0,20. La inclinación sugerida maximiza la media anual del modelo entre 0° y 60°. Evaluar sombras y horizonte en campo.'));
    table([t('Mês', 'Month', 'Mes'), 'GHI (kWh/m²/dia)', 'DHI (kWh/m²/dia)', t('Plano adotado', 'Selected plane', 'Plano adoptado')], project.solar.ghi.map((value, i) => [
      String(i + 1).padStart(2, '0'), n(value, 3), n(project.solar!.diffuse[i], 3), n(result.monthlyPOA![i], 3)
    ]));
    paragraph(project.solar.url, 7);
  } else {
    paragraph(t('HSP manual do plano informado. Confirmar origem e adequação à inclinação, ao azimute e ao mês crítico. Uma mudança do plano exige revisar esta premissa.',
      'Manual peak sun hours for the specified plane. Confirm source, tilt, azimuth and critical month. Changing the plane requires revising this assumption.',
      'HSP manual del plano informado. Confirmar fuente, inclinación, acimut y mes crítico. Cambiar el plano exige revisar este supuesto.'));
  }
  heading(t('2. Inventário de cargas', '2. Load inventory', '2. Inventario de cargas'));
  table([t('Carga', 'Load', 'Carga'), 'Qtd.', 'W', 'h/dia', 'kWh/dia', t('Crítica', 'Critical', 'Crítica')], project.loads.map(load => [
    load.name, String(load.quantity), n(load.watts, 0), n(load.hours, 1), n(load.quantity * load.watts * load.hours / 1000),
    load.critical ? t('Sim', 'Yes', 'Sí') : t('Não', 'No', 'No')
  ]), [60, 16, 26, 24, 30, 24]);
  paragraph(t('Horas de uso equivalentes devem representar o ciclo de trabalho. A partida considera o pior acionamento individual com as demais cargas declaradas em operação.',
    'Equivalent use hours must represent duty cycle. Starting power assumes the worst individual start with other declared loads running.',
    'Las horas equivalentes representan el ciclo de trabajo. El arranque considera la peor partida individual con las demás cargas declaradas en funcionamiento.'));

  newPage();
  heading(t('3. Equipamentos e configuração elétrica', '3. Equipment and electrical configuration', '3. Equipos y configuración eléctrica'));
  paragraph(project.moduleName + ' · ' + project.inverterName);
  fieldTable(['moduleW', 'voc', 'vmp', 'isc', 'imp', 'betaVoc', 'betaVmp', 'alphaIsc', 'moduleFuse', 'moduleReverse',
    'moduleMaxV', 'inverterKW', 'inverterDCW', 'inverterMaxV', 'mpptMin', 'mpptMax', 'mppts', 'stringsPerMppt', 'mpptA', 'mpptIsc', 'startV']);
  heading(t('4. Memória de cálculo', '4. Calculation record', '4. Memoria de cálculo'));
  paragraph('E_d = E_mensal × (cobertura/100) / dias. P_FV = E_d / (HSP × PR/100).');
  if (project.system === 'offgrid') paragraph(t('No off-grid, P_FV também inclui as eficiências do inversor e do ciclo de bateria no denominador, assumindo conservadoramente toda a energia através do banco. PR representa as perdas do arranjo e cabeamento.',
    'Off-grid PV sizing additionally divides by inverter and battery round-trip efficiencies, conservatively routing all energy through storage. PR represents array and wiring losses.',
    'En off-grid, el cálculo FV divide además por las eficiencias del inversor y del ciclo de batería, suponiendo toda la energía a través del banco. PR representa pérdidas del generador y cableado.'));
  paragraph('Voc_frio = Voc_STC × [1 + beta_Voc/100 × (T_min - 25)]. Vmp_quente = Vmp_STC × [1 + beta_Vmp/100 × (T_cel,max - 25)].');
  paragraph('I_string,proj = Isc × fator_irradiancia × [1 + alpha_Isc/100 × (T_cel,max - 25)].');
  paragraph('R(T) = R20 × [1 + 0,00393 × (T_cond - 20)]. Delta V_CC = 2 × R(T) × L_ida × I_mp,proj / 1000. R em ohm/km e L em m.');
  paragraph('Iz_corrigida = Iz_base × fator_termico × fator_agrupamento. Circuito CA: Ib <= In <= Iz. O limite de queda e premissa do estudo.');
  resultTable([
    [t('Potência FV requerida / inversor de referência', 'Required PV / reference inverter power', 'Potencia FV requerida / inversor de referencia'), n(result.requiredKWp) + ' kWp / ' + n(result.recommendedInverterKW) + ' kW'],
    [t('Voc do módulo no frio / Vmp no calor', 'Cold module Voc / hot Vmp', 'Voc del módulo en frío / Vmp en caliente'), n(result.vocCold) + ' / ' + n(result.vmpHot) + ' V'],
    [t('Voc da string no frio / Vmp no calor', 'Cold string Voc / hot Vmp', 'Voc de cadena en frío / Vmp en caliente'), n(result.stringVoc) + ' / ' + n(result.stringVmpHot) + ' V'],
    [t('Corrente de projeto da string', 'String design current', 'Corriente de diseño de cadena'), n(result.dcCurrent) + ' A'],
    [t('Corrente por MPPT / Isc por MPPT', 'Current per MPPT / Isc per MPPT', 'Corriente por MPPT / Isc por MPPT'), n(result.mpptCurrent) + ' / ' + n(result.mpptShortCircuit) + ' A'],
    [t('Seção mínima sugerida por queda', 'Suggested minimum voltage-drop section', 'Sección mínima sugerida por caída'), result.recommendedSection === null ? '—' : n(result.recommendedSection, 1) + ' mm²'],
    [t('Resistência CC na temperatura adotada', 'DC resistance at selected temperature', 'Resistencia CC a temperatura adoptada'), n(result.dcResistance, 3) + ' ohm/km'],
    [t('Queda CC / CA', 'DC / AC voltage drop', 'Caída CC / CA'), n(result.dcDropPercent) + '% / ' + n(result.acDropPercent) + '%']
  ]);
  paragraph(project.cableMethod === 'prysun40'
    ? t('Base CC de referência Prysmian Prysun, coluna (2). Dois cabos encostados ao ar livre e expostos ao sol, ambiente de 40°C, condutor de 90°C. Os fatores adicionais informados devem representar as condições reais. O modo manual usa R20 e Iz declarados.',
      'DC reference base is Prysmian Prysun column (2). Two touching cables in free air, exposed to sun, ambient 40°C, conductor 90°C. User correction factors must represent actual conditions. Manual mode uses declared R20 and ampacity.',
      'Base CC Prysmian Prysun, columna (2). Dos cables en contacto al aire libre, expuestos al sol, ambiente de 40°C y conductor de 90°C. Los factores declarados deben representar condiciones reales. Modo manual usa R20 e Iz declarados.')
    : t('R20 e capacidade base CC informados pelo aluno a partir do datasheet e método de instalação. A sugestão de seção manual é uma aproximação por proporcionalidade de resistência e área.',
      'DC R20 and base ampacity entered from the datasheet and installation method. Manual section suggestion uses an approximate inverse resistance/area scaling.',
      'R20 y capacidad base CC introducidos según ficha y método de instalación. La sugerencia de sección manual aproxima proporcionalidad inversa entre resistencia y área.'));
  fieldTable(['dcLength', 'dcSection', 'cableTemp', 'dcCorrection', 'dcGroup', 'dcDrop', 'acV', 'phases', 'pf', 'inverterAcA', 'acLength', 'acSection', 'acIz', 'acCorrection', 'acDrop']);
  heading(t('5. Pré-seleção das proteções', '5. Protection preselection', '5. Preselección de protecciones'));
  resultTable([
    [t('Fusível de string gPV', 'gPV string fuse', 'Fusible de cadena gPV'), (result.fuseA ?? '—') + ' A · ' + (result.fuseNeeded ? t('requerido pelo critério declarado', 'required by declared criterion', 'requerido por criterio declarado') : t('avaliar necessidade', 'verify requirement', 'evaluar necesidad'))],
    [t('Corrente reversa calculada', 'Calculated reverse current', 'Corriente inversa calculada'), n(result.reverseA) + ' A'],
    [t('Seccionamento CC por MPPT', 'DC disconnection per MPPT', 'Seccionamiento CC por MPPT'), '>= ' + n(result.mpptShortCircuit) + ' A · > ' + n(result.stringVoc) + ' V'],
    ['DPS CC · Ucpv', '> ' + n(result.stringVoc) + ' V'],
    [t('Disjuntor CA de referência', 'Reference AC circuit breaker', 'Interruptor CA de referencia'), (result.acBreakerA ?? '—') + ' A'],
    [t('Capacidade corrigida dos cabos CC / CA', 'Corrected DC / AC cable ampacity', 'Capacidad corregida de cables CC / CA'), n(result.dcIz) + ' / ' + n(result.acIz) + ' A']
  ]);
  paragraph(t('A pré-seleção gPV verifica 1,5 Isc < In < 2,4 Isc, o fator adotado e o máximo fusível do módulo. A necessidade depende da corrente reversa admissível e do retorno declarado pelo inversor. Conferir curvas, fatores do fusível, Icc e capacidade de interrupção.',
    'gPV preselection checks 1.5 Isc < In < 2.4 Isc, the adopted factor and the module maximum series fuse. Requirement depends on permissible reverse current and declared inverter backfeed. Verify curves, fuse derating, fault current and interrupting capacity.',
    'La preselección gPV verifica 1,5 Isc < In < 2,4 Isc, el factor adoptado y el fusible máximo del módulo. La necesidad depende de corriente inversa admisible y retorno del inversor. Verificar curvas, correcciones, Icc y poder de corte.'), 8);

  if (project.system !== 'ongrid') {
    heading(t('6. Armazenamento e saída autônoma', '6. Storage and stand-alone output', '6. Almacenamiento y salida autónoma'));
    paragraph(project.batteryName);
    fieldTable(['batteryV', 'unitV', 'batteryAh', 'dod', 'batteryDisEff', 'batteryRoundEff', 'batteryMaxA', 'batterySeriesMax',
      'autonomyDays', 'inverterEff', 'inverterSurgeKW', 'epsKW', 'batteryMinV', 'batteryMaxV', 'chargeA', 'batteryIz']);
    paragraph('C_banco,kWh = E_cargas,dia × autonomia / (DoD × eta_descarga × eta_inversor). Np = teto(C_banco / (Ns × V_unidade × Ah_unidade / 1000)).');
    resultTable([
      [t('Energia diária atendida em modo autônomo', 'Daily energy served in stand-alone mode', 'Energía diaria atendida en modo autónomo'), n(result.criticalDaily) + ' kWh'],
      [t('Demanda simultânea / pior partida individual', 'Simultaneous demand / worst individual start', 'Demanda simultánea / peor arranque individual'), n(result.peakKW) + ' / ' + n(result.surgeKW) + ' kW'],
      [t('Banco nominal necessário / selecionado', 'Required / selected nominal bank', 'Banco nominal necesario / seleccionado'), n(result.batteryNeededKwh) + ' / ' + n(result.batteryKwh) + ' kWh'],
      [t('Associação de baterias', 'Battery configuration', 'Asociación de baterías'), result.batteryUnits + ' · ' + result.batterySeries + 'S × ' + result.batteryParallel + 'P'],
      [t('Energia útil estimada em CA', 'Estimated usable AC energy', 'Energía útil estimada en CA'), n(result.batteryUsableKwh) + ' kWh'],
      [t('Corrente contínua máxima de referência', 'Reference maximum continuous current', 'Corriente continua máxima de referencia'), n(result.batteryCurrent) + ' A'],
      [t('Proteção principal de bateria preliminar', 'Preliminary main battery protection', 'Protección principal preliminar de batería'), (result.batteryFuseA ?? '—') + ' A'],
      [t('Corrente máxima de carga FV estimada', 'Estimated maximum PV charge current', 'Corriente máxima de carga FV estimada'), n(result.chargeCurrent) + ' A']
    ]);
    paragraph(t('A autonomia é energética, baseada em dias equivalentes das cargas declaradas. Verificar o perfil horário, SOC, descarga, corrente de pico, tempo de recarga, disponibilidade solar e fontes de apoio. O híbrido usa as cargas marcadas como críticas para dimensionar o backup.',
      'Energy autonomy uses equivalent days of declared loads. Verify hourly profile, SOC, discharge, peak current, recharge time, solar availability and backup supply. Hybrid backup uses loads marked critical.',
      'La autonomía energética usa días equivalentes de las cargas declaradas. Verificar perfil horario, SOC, descarga, picos, recarga, disponibilidad solar y fuentes de apoyo. El híbrido usa las cargas críticas para dimensionar respaldo.'));
  }
  newPage(true);
  heading(t('Diagrama unifilar do sistema', 'System single-line diagram', 'Diagrama unifilar del sistema'));
  const diagramHeight = Math.min(textWidth() * 570 / 1100, doc.internal.pageSize.getHeight() - y - 38);
  const diagramWidth = diagramHeight * 1100 / 570;
  doc.addImage(diagram, 'PNG', (doc.internal.pageSize.getWidth() - diagramWidth) / 2, y, diagramWidth, diagramHeight);
  y += diagramHeight + 6;
  paragraph(t('Topologia funcional preliminar. Dimensionar aterramento, condutores PE, dispositivos CA/EPS, Icc, DPS e intertravamentos conforme o local e o fabricante.',
    'Preliminary functional topology. Size earthing, PE conductors, AC/EPS devices, fault current, SPDs and interlocking for the site and equipment.',
    'Topología funcional preliminar. Dimensionar tierra, conductores PE, dispositivos CA/EPS, Icc, DPS e interbloqueos según lugar y fabricante.'), 9);
  newPage();
  heading(t('Verificações e pendências', 'Checks and review items', 'Verificaciones y pendientes'));
  table([t('Estado', 'Status', 'Estado'), t('Verificação', 'Check', 'Verificación'), t('Memória / critério', 'Record / criterion', 'Memoria / criterio')],
    result.checks.map(check => [
      check.kind === 'pass' ? 'OK' : check.kind === 'error' ? t('REVER', 'FAIL', 'REVISAR') : t('VALIDAR', 'REVIEW', 'VALIDAR'),
      tr(check.title, lang), check.detail || '—'
    ]), [22, 90, 68]);
  heading(t('Orientações técnicas de instalação', 'Installation guidance', 'Orientaciones técnicas de instalación'));
  installationGuidance.forEach((item, i) => paragraph(String(i + 1) + '. ' + tr(item, lang)));
  heading(t('Datasheets e rastreabilidade', 'Datasheets and traceability', 'Fichas técnicas y trazabilidad'));
  for (const [kind, label] of [['module', t('Módulo', 'Module', 'Módulo')], ['inverter', t('Inversor', 'Inverter', 'Inversor')]] as const) {
    const file = project.attachments[kind];
    paragraph(label + ' · ' + (file ? file.name + ' · ' + file.size + ' bytes' : t('Anexo não registrado', 'No attachment recorded', 'Anexo no registrado')));
  }
  paragraph(t('Os dados elétricos foram preenchidos e declarados pelo autor. Os PDFs anexados permanecem no dispositivo e são identificados acima.',
    'Electrical values were entered and declared by the author. Attached PDFs remain on the device and are identified above.',
    'Los datos eléctricos fueron introducidos y declarados por el autor. Los PDF adjuntos permanecen en el dispositivo y se identifican arriba.'));
  if (project.notes.trim()) {heading(t('Observações do autor', 'Author notes', 'Observaciones del autor'));paragraph(project.notes);}
  if (doc.internal.pageSize.getHeight() - 20 - y < 115) newPage();
  heading(t('Referências para consulta', 'References', 'Referencias'));
  pvReferences.forEach(reference => {
    room(22);paragraph(reference.name, 8);paragraph(reference.url, 7);
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(215, 226, 231);doc.line(15, height - 15, width - 15, height - 15);
    doc.setTextColor(...muted);doc.setFont('BioEnergiaReport', 'normal');doc.setFontSize(7);
    doc.text(pdfText(t('BioEnergia Academy · Estudo preliminar educacional', 'BioEnergia Academy · Preliminary educational study', 'BioEnergia Academy · Estudio educativo preliminar')), 15, height - 10);
    doc.text(String(page) + ' / ' + pages, width - 15, height - 10, {align: 'right'});
  }
  doc.setProperties({title: project.title + ' · BioEnergia Academy', author: project.designer || 'BioEnergia Academy',
    subject: 'Dimensionamento fotovoltaico preliminar', creator: 'BioEnergia Academy'});
  const stem = (project.client.name || 'Estudo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 70);
  return {doc, filename: 'BioEnergia_Memoria_FV_' + stem + '.pdf'};
}

export async function exportPVReport(project: PVProject, result: PVCalculation, lang: Language, svg: string) {
  const logo = await imageData(SENAI_HUB_LOGO, 504, 146);
  const diagram = await imageData('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), 3300, 1710);
  const report = await buildPVReport(project, result, lang, {logo, diagram});
  return {blob: report.doc.output('blob'), filename: report.filename};
}
