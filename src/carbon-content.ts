import {T} from './model';
import type {CarbonCase, EmissionsBand} from './carbon-engine';
import type {Localized} from './types';

export const carbonReviewedOn = '2026-11-12';

export const carbonSources = {
  law: {name: 'Lei nº 15.042/2024', url: 'https://www2.camara.leg.br/legin/fed/lei/2024/lei-15042-11-dezembro-2024-796690-normaatualizada-pl.html'},
  schedule: {name: 'Ministério da Fazenda · Portaria SEMC/MF nº 3.199/2026', url: 'https://www.gov.br/fazenda/pt-br/assuntos/noticias/2026/outubro/mercado-regulado-de-carbono-define-cronograma-para-que-setores-da-industria-comecem-a-medir-emissoes/'},
  implementation: {name: 'Ministério da Fazenda · Implementação do SBCE', url: 'https://www.gov.br/fazenda/pt-br/composicao/orgaos/mercado-de-carbono/entenda-o-sbce/implementacao-e-setores-regulados'},
  guidelines: {name: 'Ministério da Fazenda · Diretrizes do CIM', url: 'https://www.gov.br/fazenda/pt-br/assuntos/noticias/2026/novembro/comite-interministerial-sobre-mudanca-do-clima-aprova-diretrizes-do-mercado-de-carbono-no-brasil'},
  cbio: {name: 'ANP · RenovaBio e CBIO', url: 'https://www.gov.br/anp/pt-br/assuntos/renovabio/credito-de-descarbonizacao-cbio'},
  scopes: {name: 'GHG Protocol · Corporate Standard', url: 'https://ghgprotocol.org/sites/default/files/ghgp/standards/ghg-protocol-revised.pdf'},
  electricity: {name: 'MCTI/SIRENE · Fatores de emissão do SIN', url: 'https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sirene/dados-e-ferramentas/fatores-de-emissao'},
  fuel: {name: 'IPCC · Combustão estacionária', url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf'},
  calorific: {name: 'IPCC · Poder calorífico por combustível', url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_1_Ch1_Introduction.pdf'}
};
export type CarbonSource = keyof typeof carbonSources;

export const scopes = [
  {icon: 'plant', name: T('Escopo 1 · Fontes próprias', 'Scope 1 · Owned sources', 'Alcance 1 · Fuentes propias'),
    detail: T('Emissões diretas de fontes que a organização possui ou controla, como a combustão no seu gerador a diesel.',
      'Direct emissions from sources the organization owns or controls, such as combustion in its diesel generator.',
      'Emisiones directas de fuentes que la organización posee o controla, como la combustión en su generador diésel.')},
  {icon: 'bolt', name: T('Escopo 2 · Energia comprada', 'Scope 2 · Purchased energy', 'Alcance 2 · Energía comprada'),
    detail: T('Emissões indiretas da geração da eletricidade, do vapor, do calor ou do frio que a organização adquire e consome.',
      'Indirect emissions from generating the electricity, steam, heat or cooling purchased and consumed by the organization.',
      'Emisiones indirectas de la generación de electricidad, vapor, calor o frío adquiridos y consumidos por la organización.')},
  {icon: 'layers', name: T('Escopo 3 · Cadeia de valor', 'Scope 3 · Value chain', 'Alcance 3 · Cadena de valor'),
    detail: T('Outras emissões indiretas da cadeia de valor, como a produção de insumos comprados e o frete contratado.',
      'Other indirect emissions along the value chain, such as producing purchased inputs and contracted freight.',
      'Otras emisiones indirectas de la cadena de valor, como la producción de insumos comprados y el transporte contratado.')}
];

export type CarbonImage = 'carbon-cover' | 'carbon-microgrid' | 'carbon-industry';
export const carbonCases: Record<CarbonCase, {title: Localized; short: Localized; description: Localized; image: CarbonImage; alt: Localized}> = {
  microgrid: {
    title: T('Microrrede solar e diesel', 'Solar and diesel microgrid', 'Microrred solar y diésel'),
    short: T('Microrrede', 'Microgrid', 'Microrred'),
    description: T('Uma comunidade ribeirinha usa solar e baterias para reduzir o consumo do gerador, mantendo a energia entregue. Compare os litros por ano antes e depois.',
      'A riverside community uses solar and batteries to cut generator fuel while maintaining delivered energy. Compare annual litres before and after.',
      'Una comunidad ribereña usa energía solar y baterías para reducir el consumo del generador con el mismo suministro. Compara los litros anuales antes y después.'),
    image: 'carbon-microgrid',
    alt: T('Cena ilustrativa de módulos solares, abrigo elétrico e gerador em comunidade ribeirinha', 'Illustrative scene of solar modules, an electrical enclosure and a generator in a riverside community', 'Escena ilustrativa de módulos solares, caseta eléctrica y generador en una comunidad ribereña')
  },
  industry: {
    title: T('Eficiência na caldeira', 'Boiler efficiency', 'Eficiencia en la caldera'),
    short: T('Caldeira industrial', 'Industrial boiler', 'Caldera industrial'),
    description: T('Uma fábrica de alimentos recupera calor e reduz o combustível da caldeira. Compare os dois cenários com a mesma produção anual.',
      'A food plant recovers heat and uses less boiler fuel. Compare both scenarios at the same annual output.',
      'Una planta de alimentos recupera calor y reduce el combustible de la caldera. Compara ambos escenarios con la misma producción anual.'),
    image: 'carbon-industry',
    alt: T('Cena ilustrativa de uma caldeira industrial com tubulações isoladas e passarela', 'Illustrative scene of an industrial boiler with insulated pipes and a walkway', 'Escena ilustrativa de una caldera industrial con tuberías aisladas y pasarela')
  },
  electricity: {
    title: T('Eletricidade comprada', 'Purchased electricity', 'Electricidad comprada'),
    short: T('Eletricidade comprada', 'Purchased electricity', 'Electricidad comprada'),
    description: T('Uma fábrica melhora a eficiência de motores e compressores. Estime a diferença nas emissões associadas à eletricidade comprada da rede.',
      'A factory improves motor and compressor efficiency. Estimate the change in emissions associated with its purchased grid electricity.',
      'Una planta mejora la eficiencia de motores y compresores. Estima la diferencia en las emisiones asociadas a la electricidad comprada de la red.'),
    image: 'carbon-cover',
    alt: T('Cena ilustrativa de uma unidade agroindustrial às margens de um rio amazônico', 'Illustrative scene of an agro-industrial facility by an Amazonian river', 'Escena ilustrativa de una instalación agroindustrial junto a un río amazónico')
  }
};

export const sbceProcess = [
  {icon: 'target', title: T('Fixar o teto', 'Set the cap', 'Fijar el límite'), article: 'Art. 21',
    text: T('O Plano Nacional de Alocação (PNA) define o limite do sistema no período, a quantidade e a alocação de cotas, além do percentual máximo de CRVEs admitido na conciliação.',
      'The National Allocation Plan (PNA) sets the system-wide cap, the quantity and allocation of allowances, and the maximum CRVE share allowed for reconciliation.',
      'El Plan Nacional de Asignación (PNA) define el límite del sistema, la cantidad y asignación de cuotas y el porcentaje máximo de CRVE admitido en la conciliación.')},
  {icon: 'flask', title: T('Planejar e medir', 'Plan and measure', 'Planificar y medir'), article: 'Arts. 29 e 31',
    text: T('O operador identifica fontes, gases e dados de atividade, como combustível consumido. Submete um plano de monitoramento e aplica os métodos aprovados pelo órgão gestor.',
      'The operator identifies sources, gases and activity data such as fuel use. It submits a monitoring plan and follows the methods approved by the system administrator.',
      'El operador identifica fuentes, gases y datos de actividad, como combustible consumido. Presenta un plan de seguimiento y aplica los métodos aprobados.')},
  {icon: 'shield', title: T('Verificar e relatar', 'Verify and report', 'Verificar e informar'), article: 'Arts. 32 e 33',
    text: T('O relato anual reúne emissões e remoções no recorte regulado. Um organismo acreditado avalia a conformidade, e os dados apresentados são inseridos no Registro Central.',
      'The annual report covers emissions and removals within the regulated boundary. An accredited body checks conformity and the submitted data enter the Central Registry.',
      'El informe anual reúne emisiones y remociones del ámbito regulado. Un organismo acreditado evalúa la conformidad y los datos presentados ingresan en el Registro Central.')},
  {icon: 'check', title: T('Conciliar obrigações', 'Reconcile obligations', 'Conciliar obligaciones'), article: 'Arts. 2º, 12 e 34',
    text: T('Na etapa aplicável, o operador concilia as emissões líquidas do período com ativos do SBCE. Pode usar CBEs e CRVEs elegíveis, observados o PNA e as regras do órgão gestor.',
      'At the applicable stage, the operator reconciles net emissions for the period with SBCE assets. It may use allowances and eligible CRVEs within the PNA and regulatory rules.',
      'En la etapa aplicable, el operador concilia sus emisiones netas con activos del SBCE. Puede utilizar cuotas y CRVE elegibles según el PNA y las reglas aplicables.')}
];

export const sectorTimeline = [
  {year: T('2027', '2027', '2027'), title: T('Etapa 1', 'Stage 1', 'Etapa 1'),
    detail: T('Alumínio, siderurgia integrada, cimento, exploração e produção de petróleo e gás, química selecionada, mineração de ferro e bauxita, papel e celulose e vidro.',
      'Aluminium, integrated steel, cement, oil and gas production, selected chemicals, iron ore and bauxite mining, pulp and paper, and glass.',
      'Aluminio, siderurgia integrada, cemento, producción de petróleo y gas, química seleccionada, minería de hierro y bauxita, papel y celulosa, y vidrio.')},
  {year: T('Até 2029', 'By 2029', 'Hasta 2029'), title: T('Etapa 2', 'Stage 2', 'Etapa 2'),
    detail: T('Cerâmica, siderurgia semi-integrada, demais produtos químicos e minérios, alimentos e bebidas, refino de petróleo e setor elétrico.',
      'Ceramics, semi-integrated steel, other chemicals and minerals, food and beverage, oil refining, and electricity.',
      'Cerámica, siderurgia semiintegrada, otros productos químicos y minerales, alimentos y bebidas, refino de petróleo y sector eléctrico.')},
  {year: T('Até 2031', 'By 2031', 'Hasta 2031'), title: T('Etapa 3', 'Stage 3', 'Etapa 3'),
    detail: T('Transporte rodoviário, ferroviário e aquaviário. A aviação tem via própria de MRV, articulada com a ANAC e o ProBioQAV.',
      'Road, rail and water transport. Aviation has a separate MRV pathway coordinated with ANAC and ProBioQAV.',
      'Transporte por carretera, ferrocarril y vías navegables. La aviación tiene su propia vía de MRV, coordinada con ANAC y ProBioQAV.')}
];

export const marketInstruments = [
  {name: 'CBE', body: T('Cota do SBCE que representa o direito de emitir 1 tCO₂e, outorgada conforme as regras de alocação.',
    'SBCE allowance granting the right to emit 1 tCO₂e under the allocation rules.',
    'Cuota del SBCE que representa el derecho a emitir 1 tCO₂e conforme a las reglas de asignación.'), source: 'law'},
  {name: 'CRVE', body: T('Ativo do SBCE de 1 tCO₂e de redução ou remoção verificada, com metodologia credenciada e registro no sistema.',
    'SBCE asset for 1 tCO₂e of verified reduction or removal, with an accredited methodology and registration.',
    'Activo del SBCE de 1 tCO₂e de reducción o remoción verificada, con metodología acreditada y registro.'), source: 'law'},
  {name: 'CBIO', body: T('Crédito do RenovaBio, ligado à eficiência ambiental e ao volume elegível de biocombustível. Distribuidores o aposentam para comprovar metas individuais.',
    'RenovaBio credit linked to environmental efficiency and eligible biofuel volume. Fuel distributors retire it to meet individual targets.',
    'Crédito de RenovaBio vinculado a la eficiencia ambiental y al volumen elegible de biocombustible. Los distribuidores lo retiran para cumplir metas individuales.'), source: 'cbio'},
  {name: T('Crédito voluntário', 'Voluntary credit', 'Crédito voluntario'), body: T('Origina-se em projeto ou programa com metodologia própria. Para integrar o SBCE como CRVE, deve cumprir os requisitos do art. 44.',
    'Originates in a project or programme under its own methodology. Recognition as a CRVE requires meeting Article 44.',
    'Surge de un proyecto o programa con metodología propia. Su reconocimiento como CRVE exige cumplir el art. 44.'), source: 'law'}
] as const;

export const sectorCases = {
  cement: {name: T('Fábrica de cimento', 'Cement plant', 'Fábrica de cemento'), emissions: 32000, stage: 1},
  food: {name: T('Indústria de alimentos', 'Food processing plant', 'Industria alimentaria'), emissions: 18000, stage: 2},
  power: {name: T('Geração elétrica', 'Power generation', 'Generación eléctrica'), emissions: 6000, stage: 2},
  road: {name: T('Transporte rodoviário', 'Road transport', 'Transporte por carretera'), emissions: 27000, stage: 3},
  agriculture: {name: T('Produção primária agropecuária', 'Primary agricultural production', 'Producción agropecuaria primaria'), emissions: 40000, stage: 0},
  aviation: {name: T('Transporte aéreo', 'Air transport', 'Transporte aéreo'), emissions: 27000, stage: 0},
  waste: {name: T('Tratamento de resíduos ou efluentes', 'Waste or effluent treatment', 'Tratamiento de residuos o efluentes'), emissions: 27000, stage: 0},
  unknown: {name: T('Outro caso / recorte indefinido', 'Other case / undefined boundary', 'Otro caso / ámbito indefinido'), emissions: null, stage: 0}
} as const;
export type CarbonSector = keyof typeof sectorCases;

export const bandText: Record<EmissionsBand, {title: Localized; detail: Localized}> = {
  under: {title: T('Patamar de relato não ultrapassado', 'Reporting threshold not exceeded', 'Umbral de informe no superado'),
    detail: T('O valor chega, no máximo, a 10.000 tCO₂e por ano. Neste recorte, os patamares do art. 30 não foram ultrapassados.',
      'The value is at most 10,000 tCO₂e per year. In this boundary, the Article 30 thresholds have not been exceeded.',
      'El valor alcanza como máximo 10.000 tCO₂e anuales. En este ámbito no se superan los umbrales del art. 30.')},
  report: {title: T('Faixa de plano e relato', 'Monitoring and reporting band', 'Franja de plan e informe'),
    detail: T('Para fonte abrangida, a faixa prevê plano de monitoramento, relato anual e demais obrigações dos atos aplicáveis. A conciliação entra na faixa acima de 25.000.',
      'For a covered source, this band calls for a monitoring plan, annual reporting and other applicable duties. Reconciliation enters above 25,000.',
      'Para una fuente regulada, esta franja prevé plan de seguimiento, informe anual y otras obligaciones aplicables. La conciliación entra por encima de 25.000.')},
  reconcile: {title: T('Faixa de relato e conciliação', 'Reporting and reconciliation band', 'Franja de informe y conciliación'),
    detail: T('Para fonte abrangida, esta faixa acrescenta a conciliação periódica ao plano, ao relato e às demais obrigações. A conciliação depende da fase do sistema e do PNA aplicável.',
      'For a covered source, this band adds periodic reconciliation to planning, reporting and other duties. Reconciliation depends on the system phase and applicable PNA.',
      'Para una fuente regulada, esta franja añade conciliación periódica al plan, al informe y a las demás obligaciones. La conciliación depende de la fase y del PNA aplicable.')}
};

export const sectorSpecial = {
  agriculture: T('O art. 1º, § 2º, exclui a produção primária agropecuária e os bens, benfeitorias e infraestrutura diretamente associados no interior do imóvel rural. O processamento industrial é analisado por sua própria atividade.',
    'Article 1(2) excludes primary agricultural production and the directly associated assets, improvements and infrastructure within the rural property. Industrial processing is assessed by its own activity.',
    'El art. 1, § 2, excluye la producción agropecuaria primaria y los bienes, mejoras e infraestructura directamente asociados dentro del predio rural. El procesamiento industrial se evalúa por su propia actividad.'),
  waste: T('O art. 30, § 3º, prevê exceção condicionada para unidades de tratamento e destinação ambientalmente adequada de resíduos sólidos e efluentes líquidos, mediante comprovação de sistemas e tecnologias de neutralização. Confira os critérios do órgão gestor.',
    'Article 30(3) sets a conditional exception for environmentally sound treatment and final disposal of solid waste and liquid effluents, with evidence of neutralization systems and technologies. Check the regulator’s criteria.',
    'El art. 30, § 3, prevé una excepción condicionada para unidades de tratamiento y disposición ambientalmente adecuada de residuos sólidos y efluentes líquidos que acrediten sistemas y tecnologías de neutralización. Consulta los criterios del regulador.'),
  aviation: T('O art. 4º da Portaria 3.199 articula o MRV da aviação com a regulamentação da ANAC para o ProBioQAV, observados os requisitos da Lei nº 15.042 e do SBCE.',
    'Article 4 of Ordinance 3,199 coordinates aviation MRV with ANAC’s ProBioQAV rules, subject to the requirements of Law 15,042 and the SBCE.',
    'El art. 4 de la Portaria 3.199 coordina el MRV de la aviación con la regulación de ANAC para ProBioQAV, conforme a los requisitos de la Ley 15.042 y del SBCE.'),
  unknown: T('Identifique a atividade, a fonte, a instalação, os gases e a metodologia aplicável antes de usar os patamares. O valor isolado não determina a incidência do SBCE.',
    'Identify the activity, source, installation, gases and applicable methodology before using the thresholds. The number alone does not establish SBCE coverage.',
    'Identifica la actividad, fuente, instalación, gases y metodología aplicable antes de usar los umbrales. El valor aislado no determina la aplicación del SBCE.')
};

export const carbonQuiz = [
  {question: T('Uma fonte emite exatamente 25.000 tCO₂e por ano. Qual faixa legal foi ultrapassada?', 'A source emits exactly 25,000 tCO₂e per year. Which legal threshold was exceeded?', 'Una fuente emite exactamente 25.000 tCO₂e al año. ¿Qué umbral legal superó?'),
    answers: [T('A de relato, acima de 10.000', 'Reporting, above 10,000', 'La de informe, por encima de 10.000'), T('A de conciliação, acima de 25.000', 'Reconciliation, above 25,000', 'La de conciliación, por encima de 25.000'), T('Nenhuma das duas', 'Neither', 'Ninguno')],
    correct: 0, feedback: T('O art. 30 usa “acima de”. O valor exato de 25.000 supera 10.000 e fica no limite superior da faixa de relato.', 'Article 30 uses “above.” Exactly 25,000 exceeds 10,000 and is the upper boundary of the reporting band.', 'El art. 30 usa “por encima de”. Exactamente 25.000 supera 10.000 y queda en el límite superior de la franja de informe.')},
  {question: T('Em qual escopo entra o CO₂ do gerador a diesel controlado pela própria fábrica?', 'Which scope includes CO₂ from the factory’s own controlled diesel generator?', '¿En qué alcance entra el CO₂ del generador diésel controlado por la fábrica?'),
    answers: [T('Escopo 2', 'Scope 2', 'Alcance 2'), T('Escopo 1', 'Scope 1', 'Alcance 1'), T('Escopo 3', 'Scope 3', 'Alcance 3')],
    correct: 1, feedback: T('A combustão ocorre em fonte sob controle da fábrica, portanto é emissão direta no escopo 1.', 'Combustion occurs in a source the factory controls, so the emissions are direct and in scope 1.', 'La combustión ocurre en una fuente controlada por la fábrica, por lo que es emisión directa del alcance 1.')},
  {question: T('Qual ativo está associado às metas dos distribuidores de combustíveis no RenovaBio?', 'Which asset is used for fuel distributor targets under RenovaBio?', '¿Qué activo está asociado a las metas de los distribuidores de combustibles de RenovaBio?'),
    answers: ['CBE', 'CRVE', 'CBIO'],
    correct: 2, feedback: T('O CBIO é o instrumento de comprovação das metas individuais do RenovaBio. CBE e CRVE são ativos do SBCE.', 'CBIOs are used to demonstrate compliance with individual RenovaBio targets. CBEs and CRVEs are SBCE assets.', 'El CBIO acredita el cumplimiento de metas individuales de RenovaBio. CBE y CRVE son activos del SBCE.')},
  {question: T('A microrrede economizou 2.400 L de diesel com fator de 2,68 kg CO₂/L. Quanto CO₂ da combustão foi evitado?', 'A microgrid saved 2,400 L of diesel with a factor of 2.68 kg CO₂/L. How much combustion CO₂ was avoided?', 'La microrred ahorró 2.400 L de diésel con un factor de 2,68 kg CO₂/L. ¿Cuánto CO₂ de combustión evitó?'),
    answers: [T('6,432 t CO₂', '6.432 t CO₂', '6,432 t CO₂'), T('64,32 t CO₂', '64.32 t CO₂', '64,32 t CO₂'), T('2.400 t CO₂', '2,400 t CO₂', '2.400 t CO₂')],
    correct: 0, feedback: T('Multiplique os litros economizados pelo fator. O resultado é 6.432 kg de CO₂, equivalentes a 6,432 toneladas.', 'Multiply litres saved by the factor. The result is 6,432 kg CO₂, or 6.432 tonnes.', 'Multiplica los litros ahorrados por el factor. El resultado es 6.432 kg de CO₂, equivalentes a 6,432 toneladas.')}
];
