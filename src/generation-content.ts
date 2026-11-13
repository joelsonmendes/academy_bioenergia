import {T} from './model';
import type {Connection, GenerationBand, GenerationInput, GenerationSource, CogenerationSource} from './generation-engine';
import type {Localized} from './types';

export const generationSources = {
  law: {name: 'Lei 14.300/2022 · Câmara dos Deputados', url: 'https://www2.camara.leg.br/legin/fed/lei/2022/lei-14300-6-janeiro-2022-792217-normaatualizada-pl.html'},
  mmgd: {name: 'ANEEL · Micro e minigeração distribuída', url: 'https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida/'},
  connection: {name: 'ANEEL · REN 1.000/2021', url: 'https://www2.aneel.gov.br/cedoc/ren20211000.pdf'},
  scee: {name: 'ANEEL · REN 1.059/2023', url: 'https://www2.aneel.gov.br/cedoc/ren20231059.pdf'},
  energisaBt: {name: 'Energisa · NDU 013 (baixa tensão)', url: 'https://www.energisa.com.br/sites/energisa/files/media/documents/2025-12/NDU%20013%20-%20Crit%C3%A9rios%20para%20a%20Conex%C3%A3o%20em%20Baixa%20Tens%C3%A3o%20de%20Acessantes%20de%20Gera%C3%A7%C3%A3o%20Distribu%C3%ADda%20ao%20Sistema%20de%20Distribui%C3%A7%C3%A3o.pdf'},
  energisaMt: {name: 'Energisa · NDU 015 (média tensão)', url: 'https://www.energisa.com.br/sites/energisa/files/media/documents/2025-12/NDU%20015%20-%20Crit%C3%A9rios%20para%20a%20Conex%C3%A3o%20em%20M%C3%A9dia%20Tens%C3%A3o%20de%20Acessantes%20de%20Gera%C3%A7%C3%A3o%20Distribu%C3%ADda%20ao%20Sistema%20de%20Distribui%C3%A7%C3%A3o.pdf'},
  cogeneration: {name: 'ANEEL · REN 1.031/2022', url: 'https://www2.aneel.gov.br/cedoc/ren20221031.pdf'},
  bioelectricity: {name: 'Embrapa · Estudo sobre bioeletricidade da cana', url: 'https://www.alice.cnptia.embrapa.br/handle/doc/1011565'},
  grants: {name: 'ANEEL · Outorgas de geração', url: 'https://www.gov.br/aneel/pt-br/assuntos/geracao/outorgas'},
  plants: {name: 'ANEEL · Registro e autorização de EOL, UFV e UTE', url: 'https://www.gov.br/aneel/pt-br/centrais-de-conteudos/manuais-modelos-e-instrucoes/geracao/registro-autorizacao-e-concessao-de-empreendimentos-de-geracao/centrais-geradoras-eolicas-eol-fotovoltaicas-ufv-e-termeletricas-ute'},
  grid: {name: 'ONS · Sistema Interligado Nacional', url: 'https://www.ons.org.br/paginas/sobre-o-sin/o-que-e-o-sin'},
  contracts: {name: 'CCEE · Contratos de energia', url: 'https://www.ccee.org.br/mercado/contratos'}
};
export type GenerationReference = keyof typeof generationSources;
export const generationReviewedOn = '2026-11-13';

export const connectionLabels: Record<Connection, Localized> = {
  consumer: T('Distribuição via unidade consumidora', 'Distribution via a consumer unit', 'Distribución mediante una unidad consumidora'),
  isolated: T('Autônoma, sem rede da distribuidora', 'Standalone, with no distributor grid', 'Autónoma, sin red de la distribuidora'),
  plant: T('Central com acesso próprio, fora do SCEE', 'Plant with its own connection, outside the SCEE', 'Central con acceso propio, fuera del SCEE')
};

export const generationSourceLabels: Record<GenerationSource, Localized> = {
  solar: T('Solar fotovoltaica', 'Solar PV', 'Solar fotovoltaica'),
  wind: T('Eólica', 'Wind', 'Eólica'),
  hydro: T('Hidrelétrica a fio d’água sem controle variável', 'Run-of-river hydro without variable output control', 'Hidroeléctrica de pasada sin control variable'),
  controlledHydro: T('Hidrelétrica com controle variável', 'Hydropower with variable output control', 'Hidroeléctrica con control variable'),
  biomass: T('Biomassa', 'Biomass', 'Biomasa'),
  biogas: T('Biogás', 'Biogas', 'Biogás'),
  otherRenewable: T('Outra renovável não despachável', 'Other non-dispatchable renewable', 'Otra renovable no despachable'),
  qualifiedChp: T('Cogeração qualificada', 'Qualified cogeneration', 'Cogeneración calificada'),
  other: T('Fonte fóssil sem cogeração qualificada', 'Fossil source without qualified cogeneration', 'Fuente fósil sin cogeneración calificada')
};

export const cogenerationSourceLabels: Record<CogenerationSource, Localized> = {
  otherFuel: T('Demais combustíveis, incluindo biomassa', 'Other fuels, including biomass', 'Demás combustibles, incluida biomasa'),
  fossil: T('Derivados de petróleo, gás natural ou carvão', 'Petroleum products, natural gas or coal', 'Derivados del petróleo, gas natural o carbón'),
  recovered: T('Calor recuperado de processo', 'Recovered process heat', 'Calor recuperado del proceso')
};

export const bandLabels: Record<GenerationBand, Localized> = {
  micro: T('Microgeração distribuída', 'Distributed microgeneration', 'Microgeneración distribuida'),
  mini: T('Minigeração distribuída', 'Distributed minigeneration', 'Minigeneración distribuida'),
  above: T('Acima do limite geral da MMGD', 'Above the general MMGD limit', 'Por encima del límite general de MMGD'),
  isolated: T('Geração autônoma', 'Standalone generation', 'Generación autónoma'),
  otherRegime: T('Geração em outro regime', 'Generation under another regime', 'Generación bajo otro régimen'),
  ineligible: T('Fonte fora dos critérios da MMGD', 'Source outside the MMGD criteria', 'Fuente fuera de los criterios de MMGD')
};

export const bandDetails: Record<GenerationBand, Localized> = {
  micro: T('A fonte, o tipo de conexão e a potência do cenário atendem à definição geral de microgeração. Verifique a modalidade e as condições de conexão para adesão ao SCEE.',
    'The source, connection and power in this scenario meet the general definition of microgeneration. Check the arrangement and connection conditions for SCEE participation.',
    'La fuente, la conexión y la potencia del escenario cumplen la definición general de microgeneración. Comprueba la modalidad y las condiciones de conexión para ingresar al SCEE.'),
  mini: T('A potência ultrapassa 75 kW CA e está dentro do teto geral da fonte selecionada. Avalie o acesso à rede e as condições da modalidade de compensação.',
    'Capacity exceeds 75 kW AC and is within the general ceiling for the selected source. Assess grid access and the conditions of the compensation arrangement.',
    'La potencia supera 75 kW CA y está dentro del límite general de la fuente seleccionada. Evalúa el acceso a la red y las condiciones de la modalidad de compensación.'),
  above: T('O cenário ultrapassa o teto geral da fonte. Confira eventual direito de transição e o regime de geração e conexão aplicável ao empreendimento.',
    'The scenario exceeds the general ceiling for the source. Check transitional rights and the generation and connection regime applicable to the project.',
    'El escenario supera el límite general de la fuente. Comprueba los derechos de transición y el régimen de generación y conexión aplicable al proyecto.'),
  isolated: T('Sem conexão à distribuidora, o balanço é local. A escola ou comunidade administra a geração, a demanda e o armazenamento sem compensação pela rede.',
    'With no connection to the distributor, the balance is local. The school or community manages generation, demand and storage without grid compensation.',
    'Sin conexión a la distribuidora, el balance es local. La escuela o comunidad gestiona la generación, la demanda y el almacenamiento sin compensación por red.'),
  otherRegime: T('A central opera fora do SCEE neste cenário. Acesse as regras da fonte e do modelo de operação para analisar outorga, acesso e comercialização.',
    'The plant operates outside the SCEE in this scenario. Check the rules for the source and business model to assess grants, grid access and commercialization.',
    'La central opera fuera del SCEE en este escenario. Consulta las reglas de la fuente y del modelo para evaluar la habilitación, el acceso y la comercialización.'),
  ineligible: T('A Lei 14.300 enquadra fontes renováveis e cogeração qualificada na MMGD. Para o caso selecionado, consulte o regime aplicável à geração e à conexão.',
    'Law 14,300 covers renewable sources and qualified cogeneration under MMGD. Check the generation and connection regime for the selected case.',
    'La Ley 14.300 incluye fuentes renovables y cogeneración calificada en MMGD. Consulta el régimen de generación y conexión para el caso seleccionado.')
};

export const generationCases: ReadonlyArray<{name: Localized; input: GenerationInput}> = [
  {name: T('Escola do Acre · 75 kW', 'Acre school · 75 kW', 'Escuela de Acre · 75 kW'),
    input: {powerKw: 75, connection: 'consumer', source: 'solar', dispatchControl: false}},
  {name: T('Cooperativa solar · 180 kW', 'Solar cooperative · 180 kW', 'Cooperativa solar · 180 kW'),
    input: {powerKw: 180, connection: 'consumer', source: 'solar', dispatchControl: false}},
  {name: T('Agroindústria · 4 MW', 'Agroindustry · 4 MW', 'Agroindustria · 4 MW'),
    input: {powerKw: 4000, connection: 'consumer', source: 'biomass', dispatchControl: true}},
  {name: T('Comunidade autônoma · 30 kW', 'Standalone community · 30 kW', 'Comunidad autónoma · 30 kW'),
    input: {powerKw: 30, connection: 'isolated', source: 'solar', dispatchControl: false}},
  {name: T('Parque solar · 20 MW', 'Solar farm · 20 MW', 'Parque solar · 20 MW'),
    input: {powerKw: 20000, connection: 'plant', source: 'solar', dispatchControl: false}}
];

export const generationConcepts = [
  {
    section: 'classification', icon: 'sun',
    title: T('Microgeração', 'Microgeneration', 'Microgeneración'),
    metric: T('Até 75 kW CA', 'Up to 75 kW AC', 'Hasta 75 kW CA'),
    detail: T('Uma escola com painéis solares e conexão pela sua unidade consumidora pode atender parte da demanda no horário das aulas.',
      'A school with PV panels connected via its consumer unit can cover part of its demand during classes.',
      'Una escuela con paneles solares conectados por su unidad consumidora puede cubrir parte de su demanda durante las clases.')
  },
  {
    section: 'classification', icon: 'grid',
    title: T('Minigeração', 'Minigeneration', 'Minigeneración'),
    metric: T('Acima de 75 kW CA', 'Above 75 kW AC', 'Más de 75 kW CA'),
    detail: T('O teto geral é 3 MW para fontes não despacháveis e 5 MW para despacháveis. Estude o caso de uma cooperativa solar.',
      'The general ceiling is 3 MW for non-dispatchable sources and 5 MW for dispatchable sources. Study a solar cooperative.',
      'El límite general es de 3 MW para fuentes no despachables y 5 MW para las despachables. Estudia una cooperativa solar.')
  },
  {
    section: 'cogeneration', icon: 'leaf',
    title: T('Cogeração', 'Cogeneration', 'Cogeneración'),
    metric: T('Eletricidade + calor útil', 'Electricity + useful heat', 'Electricidad + calor útil'),
    detail: T('Uma agroindústria pode gerar eletricidade com biomassa e aproveitar o vapor no processo, como na secagem de produtos.',
      'An agroindustry can generate electricity from biomass and use steam in a process such as product drying.',
      'Una agroindustria puede generar electricidad con biomasa y aprovechar el vapor en procesos como el secado.')
  },
  {
    section: 'utility', icon: 'plant',
    title: T('Geração de grande porte', 'Large-scale generation', 'Generación a gran escala'),
    metric: T('Usinas e acesso à rede', 'Power plants and grid access', 'Centrales y acceso a red'),
    detail: T('Uma usina pode gerar para comercialização ou autoprodução. A fonte, a potência e o regime do empreendimento orientam a análise.',
      'A plant can generate for the market or self-production. Its source, capacity and business regime guide the assessment.',
      'Una central puede generar para comercialización o autoproducción. La fuente, la potencia y el régimen orientan el análisis.')
  }
] as const;

export const compensationArrangements = [
  {name: T('Autoconsumo local', 'Local self-consumption', 'Autoconsumo local'),
    detail: T('A geração e a compensação ocorrem na mesma unidade consumidora. Exemplo didático de uma escola com painéis no próprio telhado.',
      'Generation and compensation occur at the same consumer unit. An example is a school with its own rooftop PV.',
      'La generación y la compensación ocurren en la misma unidad consumidora. Un ejemplo es una escuela con paneles en su propio techo.')},
  {name: T('Autoconsumo remoto', 'Remote self-consumption', 'Autoconsumo remoto'),
    detail: T('As unidades beneficiárias têm o mesmo titular e são atendidas pela mesma distribuidora. Exemplo didático de uma empresa que aloca excedentes entre matriz e filial.',
      'Beneficiary units have the same holder and distributor. An example is a business allocating surplus between its headquarters and branch.',
      'Las unidades beneficiarias tienen el mismo titular y distribuidora. Un ejemplo es una empresa que asigna excedentes entre sede y sucursal.')},
  {name: T('Geração compartilhada', 'Shared generation', 'Generación compartida'),
    detail: T('Consumidores atendidos pela mesma distribuidora se associam em uma forma prevista em lei, como cooperativa ou consórcio, e repartem os excedentes.',
      'Consumers served by the same distributor form a legally recognized association, such as a cooperative or consortium, and allocate the surplus.',
      'Consumidores de la misma distribuidora se asocian en una forma prevista por ley, como una cooperativa o consorcio, y reparten los excedentes.')},
  {name: T('Múltiplas unidades consumidoras (EMUC)', 'Multiple consumer units (EMUC)', 'Múltiples unidades consumidoras (EMUC)'),
    detail: T('Em um empreendimento elegível, a geração se conecta à unidade das áreas comuns. Os excedentes são repartidos entre as unidades conforme a regra de alocação.',
      'In an eligible development, generation connects to the common-area unit. Surplus is allocated among units according to the allocation rule.',
      'En un conjunto elegible, la generación se conecta a la unidad de áreas comunes. Los excedentes se reparten según la regla de asignación.')}
];

export const connectionSteps: ReadonlyArray<[Localized, Localized]> = [
  [T('Definir a modalidade', 'Choose an arrangement', 'Definir la modalidad'),
    T('Identifique a unidade consumidora, a titularidade, a potência em CA, a distribuidora e os beneficiários do excedente.',
      'Identify the consumer unit, holder, AC capacity, distributor and surplus beneficiaries.',
      'Identifica la unidad consumidora, el titular, la potencia en CA, la distribuidora y los beneficiarios del excedente.')],
  [T('Preparar o projeto', 'Prepare the design', 'Preparar el proyecto'),
    T('Reúna unifilar, especificações, proteções e responsabilidade técnica conforme o padrão vigente da distribuidora.',
      'Gather the single-line diagram, specifications, protections and technical responsibility documents under the distributor’s current standards.',
      'Reúne unifilar, especificaciones, protecciones y responsabilidad técnica según el estándar vigente de la distribuidora.')],
  [T('Solicitar orçamento de conexão', 'Request a connection quote', 'Solicitar presupuesto de conexión'),
    T('Protocole a solicitação. A distribuidora avalia o ponto de conexão, a capacidade da rede e eventuais obras ou condições de injeção.',
      'Submit the request. The distributor assesses the connection point, grid capacity and any works or injection conditions.',
      'Presenta la solicitud. La distribuidora evalúa el punto de conexión, la capacidad de red y las eventuales obras o condiciones de inyección.')],
  [T('Vistoriar, medir e liberar', 'Inspect, meter and authorize', 'Inspeccionar, medir y autorizar'),
    T('Cumpra as condições de acesso e as etapas de vistoria, medição e liberação da distribuidora aplicáveis ao projeto antes de operar em paralelo.',
      'Meet the access conditions and applicable inspection, metering and distributor clearance steps before parallel operation.',
      'Cumple las condiciones de acceso y las etapas aplicables de inspección, medición y autorización de la distribuidora antes de operar en paralelo.')]
];

export const generationQuiz = [
  {
    question: T('Uma escola tem 75 kW CA de geração solar conectada à distribuição pela unidade consumidora. Qual é o porte pela regra geral?',
      'A school has 75 kW AC of PV connected to distribution through its consumer unit. What is its general size band?',
      'Una escuela tiene 75 kW CA solares conectados a la distribución por su unidad consumidora. ¿Cuál es su categoría general?'),
    options: [T('Microgeração', 'Microgeneration', 'Microgeneración'), T('Minigeração', 'Minigeneration', 'Minigeneración'), T('Grande porte', 'Large-scale', 'Gran escala')],
    correct: 0,
    feedback: T('O limite de 75 kW CA é inclusivo para a microgeração.', 'The 75 kW AC microgeneration limit is inclusive.', 'El límite de 75 kW CA para microgeneración es inclusivo.')
  },
  {
    question: T('Uma central fotovoltaica nova tem 4 MW CA. Como ela fica na regra geral da minigeração?',
      'A new PV plant has 4 MW AC. How does it fit the general minigeneration rule?',
      'Una central fotovoltaica nueva tiene 4 MW CA. ¿Cómo encaja en la regla general de minigeneración?'),
    options: [T('Dentro do limite de 5 MW, se instalar qualquer bateria', 'Within the 5 MW ceiling with any battery', 'Dentro de 5 MW con cualquier batería'),
      T('Acima do teto geral de 3 MW para fotovoltaica', 'Above the general PV ceiling of 3 MW', 'Por encima del límite general fotovoltaico de 3 MW'),
      T('Dentro do limite, por ser renovável', 'Within the ceiling because it is renewable', 'Dentro del límite por ser renovable')],
    correct: 1,
    feedback: T('A definição de fonte fotovoltaica despachável também limita a potência a 3 MW e exige modulação por armazenamento conforme a lei.',
      'The dispatchable PV definition also caps capacity at 3 MW and requires modulation by storage under the law.',
      'La definición de fuente fotovoltaica despachable también limita la potencia a 3 MW y exige modulación por almacenamiento según la ley.')
  },
  {
    question: T('Uma escola gerou 550 kWh, consumiu 600 kWh e usou 250 kWh diretamente. Quanto ela ainda importa sem compensação no modelo simplificado?',
      'A school generated 550 kWh, used 600 kWh and directly used 250 kWh. How much import remains uncompensated in the simplified model?',
      'Una escuela generó 550 kWh, consumió 600 kWh y utilizó 250 kWh directamente. ¿Cuánta importación queda sin compensar en el modelo simplificado?'),
    options: ['350 kWh', '300 kWh', '50 kWh'],
    correct: 2,
    feedback: T('A importação é 350 kWh e a injeção é 300 kWh. Após a compensação, restam 50 kWh importados.', 'Import is 350 kWh and injection is 300 kWh. After offsetting, 50 kWh of import remains.', 'Se importan 350 kWh y se inyectan 300 kWh. Tras compensar, quedan 50 kWh importados.')
  },
  {
    question: T('Com 1.000 kWh de entrada, 300 kWh elétricos líquidos e 450 kWh de calor útil, qual é o rendimento global?',
      'With 1,000 kWh of input, 300 kWh of net electricity and 450 kWh of useful heat, what is the overall efficiency?',
      'Con 1.000 kWh de entrada, 300 kWh eléctricos netos y 450 kWh de calor útil, ¿cuál es el rendimiento global?'),
    options: ['75%', '45%', '30%'],
    correct: 0,
    feedback: T('Some eletricidade líquida e calor efetivamente usado e divida pela energia de entrada. O rendimento elétrico é 30%.',
      'Add net electricity and heat actually used and divide by the energy input. Electrical efficiency is 30%.',
      'Suma la electricidad neta y el calor efectivamente utilizado y divide por la energía de entrada. El rendimiento eléctrico es del 30%.')
  },
  {
    question: T('Uma comunidade tem uma microrrede solar-diesel privada sem ligação à distribuidora. Como é compensada a geração solar?',
      'A community has a private solar-diesel microgrid with no distributor connection. How is PV generation compensated?',
      'Una comunidad tiene una microrred solar-diésel privada sin conexión a la distribuidora. ¿Cómo se compensa la generación solar?'),
    options: [T('Com créditos da distribuidora', 'With distributor credits', 'Con créditos de la distribuidora'),
      T('O atendimento e o balanço de energia são locais, fora do SCEE', 'Supply and energy balancing are local, outside the SCEE', 'El suministro y el balance son locales, fuera del SCEE'),
      T('Por alocação automática no SIN', 'By automatic allocation in the SIN', 'Por asignación automática en el SIN')],
    correct: 1,
    feedback: T('O SCEE depende de conexão com a distribuidora e de adesão ao sistema. Nesse exemplo, o controle local coordena painéis, baterias, gerador e cargas.',
      'The SCEE requires a distributor connection and participation. In this example, local control coordinates PV, batteries, the generator and loads.',
      'El SCEE depende de conexión a la distribuidora y de adhesión. En este ejemplo, el control local coordina paneles, baterías, generador y cargas.')
  }
] as const;
