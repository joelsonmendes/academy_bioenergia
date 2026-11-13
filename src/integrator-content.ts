import {T, format, tr} from './model';
import type {Language, Localized} from './types';
import type {IntegratorStep, ProjectChoice, ProjectLoad} from './integrator-schema';
import type {SchoolComparison} from './integrator-engine';

export const projectName = T('Projeto Integrador', 'Capstone Project', 'Proyecto Integrador');
export const schoolTitle = T('Energia para uma escola ribeirinha', 'Power for a riverside school', 'Energía para una escuela ribereña');
export const caseLabel = T('Estudo de caso fictício · Acre', 'Fictional case study · Acre', 'Estudio de caso ficticio · Acre');
export const projectBrief = T(
  'Uma escola de 30 alunos no Acre precisa de eletricidade para as aulas, a refrigeração e a comunicação. Projete uma microrrede, teste um dia de pouca insolação e defenda sua proposta.',
  'A school with 30 students in Acre needs power for classes, refrigeration and communications. Design a microgrid, test a low-sun day and defend your proposal.',
  'Una escuela de 30 estudiantes en Acre necesita electricidad para las clases, la refrigeración y la comunicación. Diseña una microrred, prueba un día de poca insolación y defiende tu propuesta.'
);
export const projectSteps: Record<IntegratorStep, {label: Localized; icon: string}> = {
  loads: {label: T('Inventário de cargas', 'Load inventory', 'Inventario de cargas'), icon: 'layers'},
  sizing: {label: T('Dimensionamento', 'Sizing', 'Dimensionamiento'), icon: 'sun'},
  compare: {label: T('Simulação A/B', 'A/B simulation', 'Simulación A/B'), icon: 'network'},
  delivery: {label: T('Entrega técnica', 'Technical submission', 'Entrega técnica'), icon: 'book'}
};
export const scenarios = {
  solar: T('Solar + baterias', 'Solar + batteries', 'Solar + baterías'),
  diesel: T('Solar + baterias + diesel', 'Solar + batteries + diesel', 'Solar + baterías + diésel')
};
export const choices: Record<ProjectChoice, Localized> = {
  ...scenarios,
  revise: T('Revisar o dimensionamento', 'Revise the sizing', 'Revisar el dimensionamiento')
};

const equipmentLabels: Record<string, ReturnType<typeof T>> = {
  light: T('Iluminação LED', 'LED lighting', 'Iluminación LED'),
  fans: T('Ventiladores', 'Fans', 'Ventiladores'),
  notebooks: T('Notebooks', 'Laptops', 'Portátiles'),
  cold: T('Refrigerador (ciclo médio)', 'Refrigerator (average cycle)', 'Refrigerador (ciclo medio)'),
  router: T('Roteador', 'Router', 'Enrutador'),
  pump: T('Bomba (potência ativa suposta)', 'Pump (assumed active power)', 'Bomba (potencia activa supuesta)')
};
export function equipmentName(row: ProjectLoad, lang: Language) {
  const label = equipmentLabels[row.id];
  return label && row.label === label.pt ? tr(label, lang) : row.label;
}

export const labels = {
  equipment: T('Equipamento', 'Appliance', 'Equipo'),
  quantity: T('Qtd.', 'Qty.', 'Cant.'),
  watts: T('Potência unitária', 'Unit power', 'Potencia unitaria'),
  start: T('Início', 'Start', 'Inicio'),
  end: T('Fim', 'End', 'Fin'),
  duty: T('Tempo ativo', 'Active time', 'Tiempo activo'),
  essential: T('Essencial', 'Essential', 'Esencial'),
  demand: T('Demanda diária', 'Daily demand', 'Demanda diaria'),
  essentialDemand: T('Demanda essencial', 'Essential demand', 'Demanda esencial'),
  peak: T('Pico horário médio', 'Peak hourly average', 'Pico horario medio'),
  hsp: T('Horas de sol pleno (HSP)', 'Peak sun hours (PSH)', 'Horas solares pico (HSP)'),
  moduleW: T('Potência do módulo', 'Module power', 'Potencia del módulo'),
  pr: T('Fator de desempenho (PR)', 'Performance factor (PR)', 'Factor de rendimiento (PR)'),
  autonomyDays: T('Autonomia de referência', 'Reference autonomy', 'Autonomía de referencia'),
  dod: T('Profundidade de descarga (DoD)', 'Depth of discharge (DoD)', 'Profundidad de descarga (DoD)'),
  modules: T('Módulos FV', 'PV modules', 'Módulos FV'),
  batteryKWh: T('Capacidade nominal do banco', 'Nominal battery capacity', 'Capacidad nominal del banco'),
  inverterKW: T('Potência ativa do inversor', 'Inverter active power', 'Potencia activa del inversor'),
  socStart: T('SOC inicial', 'Initial SOC', 'SOC inicial'),
  generatorKW: T('Potência do gerador (B)', 'Generator power (B)', 'Potencia del generador (B)'),
  fuelLiters: T('Diesel disponível (B)', 'Available diesel (B)', 'Diésel disponible (B)'),
  deficit: T('Energia não atendida', 'Unserved energy', 'Energía no suministrada'),
  author: T('Aluno ou equipe (opcional)', 'Student or team (optional)', 'Estudiante o equipo (opcional)'),
  rationale: T('Justificativa com evidências', 'Evidence-based justification', 'Justificación con evidencias'),
  maintenance: T('Plano de operação e manutenção', 'Operation and maintenance plan', 'Plan de operación y mantenimiento'),
  fieldData: T('Dados a verificar em campo', 'Data to verify in the field', 'Datos por verificar en campo'),
  rubric: T('Rubrica de avaliação', 'Assessment rubric', 'Rúbrica de evaluación'),
  references: T('Referências brasileiras', 'Brazilian references', 'Referencias brasileñas')
};

export const energyFormula = T('E = qtd. × P × horas equivalentes ÷ 1.000',
  'E = qty. × P × equivalent hours ÷ 1,000', 'E = cant. × P × horas equivalentes ÷ 1.000');
export const pvFormula = T('P FV = E diária ÷ (HSP × PR × η inversor × η ciclo)',
  'P PV = daily E ÷ (PSH × PR × η inverter × η cycle)', 'P FV = E diaria ÷ (HSP × PR × η inversor × η ciclo)');
export const batteryFormula = T('E banco = E diária × autonomia ÷ (DoD × η descarga × η inversor)',
  'E bank = daily E × autonomy ÷ (DoD × η discharge × η inverter)', 'E banco = E diaria × autonomía ÷ (DoD × η descarga × η inversor)');
export const simulationScope = T(
  'Balanço em intervalos de uma hora, com irradiância distribuída em uma curva diurna sintética. O despacho atende a demanda agregada sem corte seletivo de cargas essenciais.',
  'Energy balance in one-hour intervals, with irradiance distributed along a synthetic daytime curve. Dispatch serves aggregate demand without selective shedding of essential loads.',
  'Balance en intervalos de una hora, con irradiancia distribuida en una curva diurna sintética. El despacho atiende la demanda agregada sin desconexión selectiva de cargas esenciales.'
);
export const studyScope = T(
  'Estudo didático de um único dia. As premissas do caso são fictícias. Um projeto executivo exige medições locais, série climática, análise de partidas e seleção de proteções e equipamentos.',
  'Single-day educational study. The case assumptions are fictional. A detailed engineering design requires site measurements, weather series, startup analysis, and selection of protection and equipment.',
  'Estudio didáctico de un solo día. Los supuestos del caso son ficticios. Un proyecto ejecutivo requiere mediciones locales, series climáticas, análisis de arranques y selección de protecciones y equipos.'
);

export function dispatchAssumptions({input}: SchoolComparison, lang: Language) {
  const q = (pt: string, en: string, es: string) => tr(T(pt, en, es), lang);
  const n = (value: number, digits = 2) => format(value, lang, digits);
  return [
    q('Limite de carga e descarga do banco', 'Bank charge and discharge limit', 'Límite de carga y descarga del banco') + ' ' + n(input.batteryKW, 1) + ' kW',
    q('Eficiência por carga e descarga', 'Charge and discharge efficiency', 'Eficiencia de carga y descarga') + ' ' + n(input.etaCharge * 100, 0) + '% / ' + n(input.etaDischarge * 100, 0) + '%',
    q('Carga mínima do gerador', 'Minimum generator loading', 'Carga mínima del generador') + ' ' + n(input.generatorMin * 100, 0) + '%',
    q('Consumo horário de diesel em operação', 'Diesel use per operating hour', 'Consumo horario de diésel en funcionamiento') +
      ' ' + n(input.fuelIdle) + ' L/h + ' + n(input.fuelSlope) + ' L/kWh × ' +
      q('potência do gerador (kW)', 'generator output (kW)', 'potencia del generador (kW)')
  ];
}
export const caseReferences = [
  {name: 'INPE/LABREN · Atlas Brasileiro de Energia Solar', url: 'https://labren.ccst.inpe.br/atlas_2017.html'},
  {name: 'EPE e Itaipu Parquetec · Roadmap Microrredes para Sistemas Isolados no Brasil',
    url: 'https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/roadmap-microrredes-para-sistemas-isolados-no-brasil'}
];
export const rubric = [
  {title: T('Inventário', 'Inventory', 'Inventario'), weight: 25,
    evidence: T('Quantidades, potências e horários coerentes, com as cargas essenciais identificadas.',
      'Consistent quantities, power ratings and schedules, with essential loads identified.',
      'Cantidades, potencias y horarios coherentes, con las cargas esenciales identificadas.')},
  {title: T('Memória de cálculo', 'Calculation record', 'Memoria de cálculo'), weight: 25,
    evidence: T('Premissas declaradas, fórmulas com unidades e justificativa para o arredondamento dos módulos.',
      'Declared assumptions, formulas with units and justification for rounding the module count.',
      'Supuestos declarados, fórmulas con unidades y justificación del redondeo de módulos.')},
  {title: T('Comparação e decisão', 'Comparison and decision', 'Comparación y decisión'), weight: 30,
    evidence: T('Compara déficit, SOC final e diesel em condições equivalentes e justifica a escolha.',
      'Compares shortfall, final SOC and diesel on equal terms and justifies the decision.',
      'Compara déficit, SOC final y diésel en condiciones equivalentes y justifica la elección.')},
  {title: T('Manutenção e dados de campo', 'Maintenance and field data', 'Mantenimiento y datos de campo'), weight: 20,
    evidence: T('Propõe ações, frequência e responsáveis, considerando umidade, cheias e logística fluvial.',
      'Proposes actions, frequency and responsibilities, considering humidity, flooding and river transport.',
      'Propone acciones, frecuencia y responsables, considerando humedad, crecidas y logística fluvial.')}
];

export function comparisonRows(comparison: SchoolComparison, lang: Language) {
  const n = (value: number, digits = 2) => format(value, lang, digits);
  const {solar, diesel} = comparison;
  return [
    [tr(labels.demand, lang), n(solar.loadKWh, 3) + ' kWh', n(diesel.loadKWh, 3) + ' kWh'],
    [tr(T('Energia entregue', 'Delivered energy', 'Energía suministrada'), lang), n(solar.servedKWh, 3) + ' kWh', n(diesel.servedKWh, 3) + ' kWh'],
    [tr(labels.deficit, lang), n(solar.unservedKWh, 3) + ' kWh', n(diesel.unservedKWh, 3) + ' kWh'],
    [tr(T('SOC final', 'Final SOC', 'SOC final'), lang), n(solar.socFinal, 1) + '%', n(diesel.socFinal, 1) + '%'],
    [tr(T('Diesel consumido', 'Diesel used', 'Diésel consumido'), lang), n(solar.dieselLiters) + ' L', n(diesel.dieselLiters) + ' L'],
    [tr(T('Tempo de gerador', 'Generator runtime', 'Tiempo de generador'), lang), n(solar.generatorHours) + ' h', n(diesel.generatorHours) + ' h']
  ];
}
