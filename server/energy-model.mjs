// src/content.js
var T = (pt, en, es) => ({ pt, en, es });
var UI = {
  lab3d: T("Laborat\xF3rio 3D", "3D Lab", "Laboratorio 3D"),
  amazon: T("Campus Amaz\xF4nia", "Amazon Campus", "Campus Amazon\xEDa"),
  home: T("Vis\xE3o geral", "Overview", "Vista general"),
  plants: T("Usinas por dentro", "Inside the plants", "Centrales por dentro"),
  sim: T("Laborat\xF3rio virtual", "Virtual laboratory", "Laboratorio virtual"),
  mentor: T("Orientador inteligente", "Smart guide", "Orientador inteligente"),
  activities: T("Miss\xF5es de aprendizagem", "Learning missions", "Misiones de aprendizaje"),
  sources: T("Biblioteca de fontes", "Source library", "Biblioteca de fuentes"),
  academy: T("APRENDER \u2022 EXPLORAR \u2022 TRANSFORMAR", "LEARN \u2022 EXPLORE \u2022 TRANSFORM", "APRENDER \u2022 EXPLORAR \u2022 TRANSFORMAR"),
  demo: T("VERS\xC3O DE TESTE \u2022 OFFLINE", "TEST VERSION \u2022 OFFLINE", "VERSI\xD3N DE PRUEBA \u2022 SIN CONEXI\xD3N"),
  menu: T("Abrir menu", "Open menu", "Abrir men\xFA"),
  close: T("Fechar", "Close", "Cerrar"),
  theme: T("Alternar tema claro/escuro", "Toggle light/dark theme", "Alternar tema claro/oscuro"),
  language: T("Idioma", "Language", "Idioma"),
  skip: T("Ir para o conte\xFAdo", "Skip to content", "Ir al contenido"),
  heroTag: T("SEU CAMPUS DE ENERGIAS RENOV\xC1VEIS", "YOUR RENEWABLE ENERGY CAMPUS", "TU CAMPUS DE ENERG\xCDAS RENOVABLES"),
  heroTitle: T("A energia do futuro, <em>por dentro.</em>", "The energy of tomorrow, <em>from the inside.</em>", "La energ\xEDa del futuro, <em>por dentro.</em>"),
  heroDesc: T("Explore usinas em corte, experimente os c\xE1lculos e transforme conceitos em decis\xF5es. Comece pela biomassa.", "Explore cutaway plants, experiment with calculations and turn concepts into decisions. Start with biomass.", "Explora centrales en corte, experimenta con c\xE1lculos y transforma conceptos en decisiones. Empieza por la biomasa."),
  start: T("Explorar biomassa", "Explore biomass", "Explorar biomasa"),
  openSim: T("Abrir simulador", "Open simulator", "Abrir simulador"),
  featured: T("EM FOCO \u2022 BIOENERGIA", "IN FOCUS \u2022 BIOENERGY", "EN FOCO \u2022 BIOENERG\xCDA"),
  cutaway: T("Ilustra\xE7\xE3o t\xE9cnica em corte \u2022 WebP", "Technical cutaway illustration \u2022 WebP", "Ilustraci\xF3n t\xE9cnica en corte \u2022 WebP"),
  illustration: T("Ilustra\xE7\xE3o did\xE1tica original, sem escala. Selecione os pontos ou a lista de componentes.", "Original educational illustration, not to scale. Select a point or a component in the list.", "Ilustraci\xF3n did\xE1ctica original, sin escala. Selecciona un punto o un componente de la lista."),
  five: T("fontes de energia", "energy sources", "fuentes de energ\xEDa"),
  thirty: T("componentes explor\xE1veis", "explorable components", "componentes explorables"),
  live: T("c\xE1lculos em tempo real", "real-time calculations", "c\xE1lculos en tiempo real"),
  three: T("idiomas dispon\xEDveis", "available languages", "idiomas disponibles"),
  journey: T("Escolha sua pr\xF3xima descoberta", "Choose your next discovery", "Elige tu pr\xF3ximo descubrimiento"),
  journeyDesc: T("Da mat\xE9ria org\xE2nica ao movimento dos oceanos. Entenda como cada fonte se transforma em eletricidade.", "From organic matter to the movement of the oceans. Learn how each resource becomes electricity.", "De la materia org\xE1nica al movimiento del oc\xE9ano. Comprende c\xF3mo cada recurso se convierte en electricidad."),
  explore: T("Explorar usina", "Explore plant", "Explorar central"),
  components: T("Componentes e funcionamento", "Components and operation", "Componentes y funcionamiento"),
  component: T("Componente", "Component", "Componente"),
  principle: T("Caminho da energia", "Energy pathway", "Recorrido de la energ\xEDa"),
  learn: T("O que voc\xEA vai aprender", "What you will learn", "Qu\xE9 vas a aprender"),
  model: T("Modelo e limites", "Model and limits", "Modelo y l\xEDmites"),
  sourceButton: T("Consultar refer\xEAncias", "View references", "Consultar referencias"),
  simTag: T("EXPERIMENTE. OBSERVE. COMPARE.", "EXPERIMENT. OBSERVE. COMPARE.", "EXPERIMENTA. OBSERVA. COMPARA."),
  simTitle: T("A teoria ganha movimento.", "Theory comes to life.", "La teor\xEDa cobra vida."),
  simDesc: T("Altere os par\xE2metros e acompanhe os resultados. Cada n\xFAmero revela uma rela\xE7\xE3o f\xEDsica.", "Change the parameters and follow the results. Every number reveals a physical relationship.", "Cambia los par\xE1metros y observa los resultados. Cada n\xFAmero revela una relaci\xF3n f\xEDsica."),
  parameters: T("Par\xE2metros de entrada", "Input parameters", "Par\xE1metros de entrada"),
  reset: T("Restaurar", "Reset", "Restablecer"),
  power: T("Pot\xEAncia el\xE9trica l\xEDquida", "Net electrical power", "Potencia el\xE9ctrica neta"),
  energy: T("Energia no per\xEDodo", "Energy over the period", "Energ\xEDa en el per\xEDodo"),
  metric3: T("Rendimento global", "Overall efficiency", "Rendimiento global"),
  formula: T("Da f\xF3rmula ao resultado", "From formula to result", "De la f\xF3rmula al resultado"),
  formulaDesc: T("Acompanhe as unidades e a substitui\xE7\xE3o dos valores. Percentuais s\xE3o convertidos em fra\xE7\xF5es no c\xE1lculo.", "Follow the units and substituted values. Percentages are converted to fractions in the calculation.", "Observa las unidades y la sustituci\xF3n de valores. Los porcentajes se convierten en fracciones en el c\xE1lculo."),
  symbol: T("S\xEDmbolo", "Symbol", "S\xEDmbolo"),
  meaning: T("Significado", "Meaning", "Significado"),
  value: T("Valor atual", "Current value", "Valor actual"),
  curve: T("Como o recurso muda a pot\xEAncia", "How the resource changes power", "C\xF3mo el recurso cambia la potencia"),
  curveNote: T("Curva param\xE9trica te\xF3rica. Os outros par\xE2metros permanecem constantes; n\xE3o \xE9 uma s\xE9rie medida.", "Theoretical parameter curve. Other parameters stay constant; this is not measured time-series data.", "Curva param\xE9trica te\xF3rica. Los dem\xE1s par\xE1metros permanecen constantes; no es una serie medida."),
  chartAlt: T("Gr\xE1fico da pot\xEAncia el\xE9trica em fun\xE7\xE3o do recurso", "Chart of electrical power versus resource", "Gr\xE1fico de potencia el\xE9ctrica frente al recurso"),
  balance: T("Balan\xE7o de energia", "Energy balance", "Balance de energ\xEDa"),
  inputEnergy: T("Entrada", "Input", "Entrada"),
  netEnergy: T("Eletricidade l\xEDquida", "Net electricity", "Electricidad neta"),
  otherEnergy: T("Outras sa\xEDdas e perdas", "Other outputs and losses", "Otras salidas y p\xE9rdidas"),
  otherNote: T("Inclui energia n\xE3o convertida em eletricidade; n\xE3o representa calor \xFAtil recuper\xE1vel.", "Includes energy not converted to electricity; this does not represent recoverable useful heat.", "Incluye energ\xEDa no convertida en electricidad; no representa calor \xFAtil recuperable."),
  save: T("Guardar cen\xE1rio", "Save scenario", "Guardar escenario"),
  export: T("Exportar CSV", "Export CSV", "Exportar CSV"),
  print: T("Imprimir relat\xF3rio", "Print report", "Imprimir informe"),
  scenarios: T("Meus cen\xE1rios", "My scenarios", "Mis escenarios"),
  noScenarios: T("Guarde uma simula\xE7\xE3o para comparar resultados. Os cen\xE1rios ficam neste navegador.", "Save a simulation to compare results. Scenarios are stored in this browser.", "Guarda una simulaci\xF3n para comparar resultados. Los escenarios se guardan en este navegador."),
  load: T("Carregar", "Load", "Cargar"),
  remove: T("Excluir cen\xE1rio", "Delete scenario", "Eliminar escenario"),
  saved: T("Cen\xE1rio guardado.", "Scenario saved.", "Escenario guardado."),
  memoryOnly: T("O navegador bloqueou o armazenamento. Os dados ficam apenas nesta sess\xE3o; exporte o CSV.", "The browser blocked storage. Data stays in this session only; export the CSV.", "El navegador bloque\xF3 el almacenamiento. Los datos solo se conservan en esta sesi\xF3n; exporta el CSV."),
  invalid: T("Informe um n\xFAmero dentro do intervalo indicado.", "Enter a number within the indicated range.", "Introduce un n\xFAmero dentro del intervalo indicado."),
  noInvalid: T("Corrija os campos destacados para atualizar os resultados.", "Fix the highlighted fields to update results.", "Corrige los campos resaltados para actualizar los resultados."),
  educational: T("Modelo did\xE1tico de regime permanente. Valores iniciais s\xE3o hip\xF3teses de exerc\xEDcio. N\xE3o dimensiona instala\xE7\xF5es, prote\xE7\xF5es, partida de motores ou sistemas reais.", "Steady-state educational model. Initial values are exercise assumptions. It does not size real installations, protection or motor starting.", "Modelo did\xE1ctico de r\xE9gimen permanente. Los valores iniciales son hip\xF3tesis de ejercicio. No dimensiona instalaciones, protecciones ni arranques de motores reales."),
  periodNote: T("E = P \xD7 t pressup\xF5e pot\xEAncia constante durante o per\xEDodo.", "E = P \xD7 t assumes constant power over the period.", "E = P \xD7 t supone potencia constante durante el per\xEDodo."),
  guideTag: T("APRENDIZAGEM COM FEEDBACK", "LEARNING WITH FEEDBACK", "APRENDIZAJE CON RETROALIMENTACI\xD3N"),
  guideTitle: T("Uma pista para cada descoberta.", "A hint for every discovery.", "Una pista para cada descubrimiento."),
  guideDesc: T("O orientador usa regras de engenharia e os par\xE2metros da sua simula\xE7\xE3o para sugerir o pr\xF3ximo experimento. Funciona offline; n\xE3o utiliza IA generativa.", "The guide uses engineering rules and your simulation parameters to suggest the next experiment. It works offline and does not use generative AI.", "El orientador usa reglas de ingenier\xEDa y los par\xE1metros de tu simulaci\xF3n para sugerir el pr\xF3ximo experimento. Funciona sin conexi\xF3n y no usa IA generativa."),
  guidePlaceholder: T("Pergunte sobre umidade, efici\xEAncia, pot\xEAncia, temperatura, vento, queda ou mar\xE9s\u2026", "Ask about moisture, efficiency, power, temperature, wind, head or tides\u2026", "Pregunta sobre humedad, eficiencia, potencia, temperatura, viento, altura o mareas\u2026"),
  ask: T("Consultar", "Ask", "Consultar"),
  context: T("Contexto da simula\xE7\xE3o", "Simulation context", "Contexto de simulaci\xF3n"),
  guideDefault: T("Escolha uma fonte e altere os par\xE2metros no laborat\xF3rio. Depois consulte um dos temas abaixo para interpretar o resultado.", "Choose a source and change parameters in the laboratory. Then select a topic below to interpret the result.", "Elige una fuente y cambia los par\xE1metros en el laboratorio. Despu\xE9s consulta uno de los temas siguientes para interpretar el resultado."),
  guided: T("Pr\xF3ximo experimento", "Next experiment", "Pr\xF3ximo experimento"),
  unsupported: T("Posso orientar sobre as f\xF3rmulas e os par\xE2metros das cinco fontes. Escolha um tema sugerido ou abra a biblioteca para aprofundar a pesquisa.", "I can guide you through the formulas and parameters of the five sources. Choose a suggested topic or open the library for further research.", "Puedo orientar sobre las f\xF3rmulas y los par\xE1metros de las cinco fuentes. Elige un tema sugerido o abre la biblioteca para investigar m\xE1s."),
  missionTag: T("APRENDER FAZENDO", "LEARN BY DOING", "APRENDER HACIENDO"),
  missionTitle: T("Da curiosidade \xE0 compet\xEAncia.", "From curiosity to competence.", "De la curiosidad a la competencia."),
  missionDesc: T("Investigue um problema, teste uma hip\xF3tese e registre o que mudou. As atividades usam os modelos simplificados do laborat\xF3rio.", "Investigate a problem, test a hypothesis and record what changed. Activities use the simplified laboratory models.", "Investiga un problema, prueba una hip\xF3tesis y registra qu\xE9 cambi\xF3. Las actividades usan los modelos simplificados del laboratorio."),
  objective: T("Objetivo", "Objective", "Objetivo"),
  challenge: T("Sua miss\xE3o", "Your mission", "Tu misi\xF3n"),
  goLab: T("Investigar no laborat\xF3rio", "Investigate in the lab", "Investigar en el laboratorio"),
  quickQuiz: T("Verifique sua compreens\xE3o", "Check your understanding", "Comprueba tu comprensi\xF3n"),
  quizChoose: T("Selecione uma alternativa para receber uma explica\xE7\xE3o.", "Select an answer to receive an explanation.", "Selecciona una respuesta para recibir una explicaci\xF3n."),
  correct: T("Correto.", "Correct.", "Correcto."),
  tryAgain: T("Revise o conceito.", "Review the concept.", "Revisa el concepto."),
  completed: T("miss\xF5es verificadas", "missions checked", "misiones comprobadas"),
  notes: T("Seu registro de aprendizagem", "Your learning notes", "Tu registro de aprendizaje"),
  notesPlaceholder: T("O que alterei? O que observei? Qual rela\xE7\xE3o f\xEDsica explica o resultado?", "What did I change? What did I observe? Which physical relationship explains the result?", "\xBFQu\xE9 cambi\xE9? \xBFQu\xE9 observ\xE9? \xBFQu\xE9 relaci\xF3n f\xEDsica explica el resultado?"),
  downloadNotes: T("Baixar registro", "Download notes", "Descargar registro"),
  refsTag: T("CONHECIMENTO COM RASTREABILIDADE", "TRACEABLE KNOWLEDGE", "CONOCIMIENTO CON TRAZABILIDAD"),
  refsTitle: T("A ci\xEAncia por tr\xE1s da experi\xEAncia.", "The science behind the experience.", "La ciencia detr\xE1s de la experiencia."),
  refsDesc: T("Refer\xEAncias brasileiras e internacionais para estudar os conceitos e modelos. Consulte o tipo, o idioma e o ano de cada material. Os c\xE1lculos s\xE3o adapta\xE7\xF5es did\xE1ticas.", "Brazilian and international references for studying concepts and models. Check each material\u2019s type, language and year. Calculations are educational adaptations.", "Referencias brasile\xF1as e internacionales para estudiar los conceptos y modelos. Consulta el tipo, idioma y a\xF1o de cada material. Los c\xE1lculos son adaptaciones did\xE1cticas."),
  search: T("Buscar fonte, tema ou institui\xE7\xE3o", "Search source, topic or institution", "Buscar fuente, tema o instituci\xF3n"),
  all: T("Todas as fontes", "All sources", "Todas las fuentes"),
  visit: T("Abrir fonte original", "Open original source", "Abrir fuente original"),
  accessed: T("Links revisados em 01/11/2026 \u2022 A abertura das refer\xEAncias precisa de internet. A disponibilidade pode mudar no site de origem.", "Links reviewed on 1 Nov 2026 \u2022 Opening references requires internet. Availability may change at the source.", "Enlaces revisados el 01/11/2026 \u2022 Abrir las referencias requiere internet. La disponibilidad puede cambiar en el sitio de origen."),
  noResults: T("Nenhuma fonte encontrada para esta busca.", "No sources found for this search.", "No se encontraron fuentes para esta b\xFAsqueda."),
  footer: T("Projeto inovador da turma do Curso T\xE9cnico em Sistemas de Energias Renov\xE1veis.", "An innovative project by the Renewable Energy Systems Technical Course class.", "Proyecto innovador del grupo del Curso T\xE9cnico en Sistemas de Energ\xEDas Renovables."),
  offline: T("Pronto para explorar offline", "Ready to explore offline", "Listo para explorar sin conexi\xF3n"),
  progress: T("Seu percurso", "Your journey", "Tu recorrido"),
  visited: T("usinas visitadas", "plants visited", "centrales visitadas"),
  begin: T("COME\xC7AR A EXPLORAR", "START EXPLORING", "EMPIEZA A EXPLORAR"),
  back: T("Voltar para as usinas", "Back to plants", "Volver a las centrales"),
  zoom: T("Ampliar ilustra\xE7\xE3o", "Enlarge illustration", "Ampliar ilustraci\xF3n"),
  fullscreen: T("Vista ampliada", "Enlarged view", "Vista ampliada"),
  observe: T("Observe na pr\xE1tica", "Observe in practice", "Observa en la pr\xE1ctica"),
  siteName: "BioEnergia Academy",
  duration: T("Per\xEDodo a pot\xEAncia constante", "Period at constant power", "Per\xEDodo a potencia constante"),
  thermal: T("Pot\xEAncia t\xE9rmica do combust\xEDvel", "Fuel thermal power", "Potencia t\xE9rmica del combustible"),
  available: T("Pot\xEAncia do recurso", "Resource power", "Potencia del recurso"),
  dc: T("Pot\xEAncia CC dispon\xEDvel", "Available DC power", "Potencia CC disponible"),
  nominal: T("Limite nominal de sa\xEDda", "Rated output limit", "L\xEDmite nominal de salida"),
  nominalLimit: T("A sa\xEDda atingiu o limite nominal: aumentar o recurso n\xE3o aumenta a pot\xEAncia el\xE9trica neste ponto.", "Output has reached the rated limit: more resource does not increase electrical power at this point.", "La salida alcanz\xF3 el l\xEDmite nominal: aumentar el recurso no aumenta la potencia el\xE9ctrica en este punto."),
  stopped: T("Fora da faixa de opera\xE7\xE3o: a sa\xEDda el\xE9trica \xE9 zero.", "Outside operating range: electrical output is zero.", "Fuera del intervalo de operaci\xF3n: la salida el\xE9ctrica es cero."),
  noHead: T("As perdas consumiram toda a queda dispon\xEDvel; n\xE3o h\xE1 gera\xE7\xE3o.", "Losses consume all available head; no power is generated.", "Las p\xE9rdidas consumen toda la altura disponible; no hay generaci\xF3n."),
  insight: T("Leitura do orientador", "Guide insight", "Lectura del orientador"),
  testLabel: T("PROT\xD3TIPO EDUCACIONAL", "EDUCATIONAL PROTOTYPE", "PROTOTIPO EDUCATIVO"),
  report: T("Relat\xF3rio de simula\xE7\xE3o", "Simulation report", "Informe de simulaci\xF3n"),
  stage: T("Etapa", "Step", "Etapa"),
  unit: T("Unidade", "Unit", "Unidad"),
  date: T("Data", "Date", "Fecha"),
  result: T("Resultado", "Result", "Resultado"),
  route: T("Rota de convers\xE3o", "Conversion route", "Ruta de conversi\xF3n"),
  selected: T("Selecionado", "Selected", "Seleccionado"),
  viewed: T("Visitada", "Visited", "Visitada"),
  lessonNote: T("Observe o desenho, explore os componentes e use o laborat\xF3rio para testar rela\xE7\xF5es f\xEDsicas.", "Observe the drawing, explore the components and use the laboratory to test physical relationships.", "Observa el dibujo, explora los componentes y usa el laboratorio para probar relaciones f\xEDsicas."),
  readMore: T("Aprofundar o estudo", "Study further", "Profundizar el estudio"),
  missionComplete: T("Progresso local: alternativas corretas registradas neste navegador.", "Local progress: correct answers recorded in this browser.", "Progreso local: respuestas correctas registradas en este navegador."),
  renameScenario: T("Cen\xE1rio", "Scenario", "Escenario"),
  percentage: T("Percentual", "Percentage", "Porcentaje")
};
var INPUTS = {
  mass: { label: T("Alimenta\xE7\xE3o de biomassa \xFAmida", "Wet biomass feed rate", "Alimentaci\xF3n de biomasa h\xFAmeda"), unit: "kg/h", min: 0, max: 500, step: 1, default: 60 },
  lhv: { label: T("PCI da biomassa seca", "Dry biomass LHV", "PCI de biomasa seca"), unit: "MJ/kg", min: 10, max: 25, step: 0.1, default: 18.5 },
  moisture: { label: T("Umidade em base \xFAmida", "Wet-basis moisture", "Humedad en base h\xFAmeda"), unit: "%", min: 0, max: 70, step: 1, default: 25 },
  etaBio: { label: T("Rendimento el\xE9trico bruto", "Gross electrical efficiency", "Rendimiento el\xE9ctrico bruto"), unit: "%", min: 5, max: 40, step: 1, default: 25 },
  aux: { label: T("Consumo auxiliar / gera\xE7\xE3o bruta", "Auxiliary use / gross generation", "Consumo auxiliar / generaci\xF3n bruta"), unit: "%", min: 0, max: 30, step: 1, default: 8 },
  hours: { label: UI.duration, unit: "h", min: 0, max: 24, step: 0.5, default: 10 },
  pv: { label: T("Pot\xEAncia fotovoltaica instalada", "Installed PV capacity", "Potencia fotovoltaica instalada"), unit: "kWp", min: 0.1, max: 1e3, step: 0.1, default: 10 },
  irradiance: { label: T("Irradi\xE2ncia no plano dos m\xF3dulos", "Plane-of-array irradiance", "Irradiancia en el plano de m\xF3dulos"), unit: "W/m\xB2", min: 0, max: 1200, step: 10, default: 800 },
  temp: { label: T("Temperatura das c\xE9lulas", "Cell temperature", "Temperatura de c\xE9lulas"), unit: "\xB0C", min: -10, max: 90, step: 1, default: 45 },
  gamma: { label: T("Coeficiente de pot\xEAncia / temperatura", "Power temperature coefficient", "Coeficiente de potencia / temperatura"), unit: "%/\xB0C", min: -0.6, max: -0.1, step: 0.01, default: -0.35 },
  lossesPV: { label: T("Outras perdas CC (sem temperatura)", "Other DC losses (excluding temperature)", "Otras p\xE9rdidas CC (sin temperatura)"), unit: "%", min: 0, max: 40, step: 1, default: 10 },
  etaInv: { label: T("Rendimento do inversor", "Inverter efficiency", "Rendimiento del inversor"), unit: "%", min: 80, max: 100, step: 1, default: 96 },
  ratedPV: { label: T("Pot\xEAncia nominal do inversor CA", "Inverter rated AC power", "Potencia nominal CA del inversor"), unit: "kW", min: 0.1, max: 1e3, step: 0.1, default: 8 },
  speed: { label: T("Velocidade do vento", "Wind speed", "Velocidad del viento"), unit: "m/s", min: 0, max: 30, step: 0.1, default: 8 },
  diameter: { label: T("Di\xE2metro do rotor", "Rotor diameter", "Di\xE1metro del rotor"), unit: "m", min: 1, max: 80, step: 0.5, default: 8 },
  rhoAir: { label: T("Densidade do ar", "Air density", "Densidad del aire"), unit: "kg/m\xB3", min: 0.8, max: 1.4, step: 5e-3, default: 1.225 },
  cp: { label: T("Coeficiente de pot\xEAncia Cp", "Power coefficient Cp", "Coeficiente de potencia Cp"), unit: "\u2014", min: 0.1, max: 0.59, step: 0.01, default: 0.42 },
  etaDrive: { label: T("Rendimento mec\xE2nico e el\xE9trico", "Mechanical and electrical efficiency", "Rendimiento mec\xE1nico y el\xE9ctrico"), unit: "%", min: 50, max: 100, step: 1, default: 90 },
  ratedWind: { label: UI.nominal, unit: "kW", min: 1, max: 5e3, step: 1, default: 20 },
  flow: { label: T("Vaz\xE3o turbinada dispon\xEDvel", "Available turbine flow", "Caudal disponible en turbina"), unit: "m\xB3/s", min: 0, max: 20, step: 0.01, default: 0.5 },
  head: { label: T("Queda bruta", "Gross head", "Altura bruta"), unit: "m", min: 0, max: 200, step: 0.5, default: 20 },
  lossHead: { label: T("Perda de carga hidr\xE1ulica", "Hydraulic head loss", "P\xE9rdida de carga hidr\xE1ulica"), unit: "m", min: 0, max: 100, step: 0.5, default: 2 },
  etaTurb: { label: T("Rendimento da turbina", "Turbine efficiency", "Rendimiento de la turbina"), unit: "%", min: 40, max: 95, step: 1, default: 85 },
  etaGen: { label: T("Rendimento do gerador", "Generator efficiency", "Rendimiento del generador"), unit: "%", min: 70, max: 99, step: 1, default: 95 },
  ratedHydro: { label: UI.nominal, unit: "kW", min: 1, max: 3e4, step: 1, default: 100 },
  tidalSpeed: { label: T("Velocidade da corrente de mar\xE9", "Tidal current speed", "Velocidad de corriente de marea"), unit: "m/s", min: 0, max: 5, step: 0.1, default: 2 },
  tidalDiameter: { label: T("Di\xE2metro do rotor submerso", "Submerged rotor diameter", "Di\xE1metro del rotor sumergido"), unit: "m", min: 1, max: 30, step: 0.5, default: 6 },
  rhoSea: { label: T("Densidade da \xE1gua do mar", "Seawater density", "Densidad del agua de mar"), unit: "kg/m\xB3", min: 1e3, max: 1030, step: 1, default: 1025 },
  cpTidal: { label: T("Coeficiente de pot\xEAncia Cp", "Power coefficient Cp", "Coeficiente de potencia Cp"), unit: "\u2014", min: 0.1, max: 0.59, step: 0.01, default: 0.4 },
  etaMarine: { label: T("Rendimento de convers\xE3o e exporta\xE7\xE3o", "Conversion and export efficiency", "Rendimiento de conversi\xF3n y exportaci\xF3n"), unit: "%", min: 50, max: 100, step: 1, default: 90 },
  ratedTidal: { label: UI.nominal, unit: "kW", min: 1, max: 5e3, step: 1, default: 100 }
};
var MODULES = {
  biomass: {
    name: T("Biomassa", "Biomass", "Biomasa"),
    icon: "leaf",
    color: "#49aa58",
    tag: T("MAT\xC9RIA QUE TRANSFORMA", "MATTER THAT TRANSFORMS", "MATERIA QUE TRANSFORMA"),
    short: T("Res\xEDduos, calor e bioeletricidade.", "Residues, heat and bioelectricity.", "Residuos, calor y bioelectricidad."),
    description: T("A energia qu\xEDmica dos res\xEDduos org\xE2nicos pode gerar calor, movimento e eletricidade. Explore uma usina a vapor e descubra como a umidade muda o aproveitamento do combust\xEDvel.", "Chemical energy in organic residues can produce heat, motion and electricity. Explore a steam plant and discover how moisture changes fuel performance.", "La energ\xEDa qu\xEDmica de los residuos org\xE1nicos puede producir calor, movimiento y electricidad. Explora una central de vapor y descubre c\xF3mo la humedad cambia el aprovechamiento del combustible."),
    path: T("Qu\xEDmica \u2192 t\xE9rmica \u2192 mec\xE2nica \u2192 el\xE9trica", "Chemical \u2192 thermal \u2192 mechanical \u2192 electrical", "Qu\xEDmica \u2192 t\xE9rmica \u2192 mec\xE1nica \u2192 el\xE9ctrica"),
    inputs: ["mass", "lhv", "moisture", "etaBio", "aux", "hours"],
    sourceIds: ["embrapa-moisture", "embrapa-biomass", "fao", "vtt"],
    primary: "moisture",
    xLabel: INPUTS.moisture.label,
    learn: T("Relacionar PCI, umidade, consumo de combust\xEDvel e pot\xEAncia l\xEDquida. Diferenciar a combust\xE3o, a gaseifica\xE7\xE3o e a produ\xE7\xE3o de biog\xE1s.", "Relate LHV, moisture, fuel consumption and net power. Distinguish combustion, gasification and biogas production.", "Relacionar PCI, humedad, consumo de combustible y potencia neta. Distinguir combusti\xF3n, gasificaci\xF3n y producci\xF3n de biog\xE1s."),
    limits: T("Balan\xE7o agregado para biomassa s\xF3lida. \u03B7 el\xE9trico bruto j\xE1 re\xFAne caldeira, ciclo e gerador; os auxiliares s\xE3o descontados depois. N\xE3o se calcula press\xE3o ou temperatura do vapor, estabilidade de chama ou rendimento por carga. PCI seco e efici\xEAncia devem ser medidos ou validados para cada combust\xEDvel e tecnologia.", "Aggregate balance for solid biomass. Gross electrical efficiency already includes boiler, cycle and generator; auxiliary use is deducted afterward. Steam conditions, flame stability and part-load efficiency are not calculated. Dry LHV and efficiency must be validated for the fuel and technology.", "Balance agregado para biomasa s\xF3lida. El rendimiento el\xE9ctrico bruto incluye caldera, ciclo y generador; los auxiliares se descuentan despu\xE9s. No se calculan condiciones del vapor, estabilidad de llama ni rendimiento con carga parcial. El PCI seco y el rendimiento deben validarse para el combustible y la tecnolog\xEDa."),
    extra: T("Outras rotas: a gaseifica\xE7\xE3o produz g\xE1s combust\xEDvel para motores; a digest\xE3o anaer\xF3bia produz biog\xE1s a partir de mat\xE9ria biodegrad\xE1vel \xFAmida. Elas exigem modelos pr\xF3prios. A biomassa n\xE3o \xE9 automaticamente neutra em carbono: origem, uso do solo, transporte e emiss\xF5es precisam ser avaliados.", "Other routes: gasification produces fuel gas for engines; anaerobic digestion produces biogas from wet biodegradable matter. They need separate models. Biomass is not automatically carbon neutral: sourcing, land use, transport and emissions must be assessed.", "Otras rutas: la gasificaci\xF3n produce gas combustible para motores; la digesti\xF3n anaerobia produce biog\xE1s a partir de materia h\xFAmeda biodegradable. Requieren modelos propios. La biomasa no es autom\xE1ticamente neutra en carbono: deben evaluarse origen, uso del suelo, transporte y emisiones."),
    components: [
      [T("Alimenta\xE7\xE3o e fornalha", "Fuel feed and furnace", "Alimentaci\xF3n y horno"), T("O silo e o transportador dosam os res\xEDduos at\xE9 a grelha. O ar de combust\xE3o permite liberar a energia qu\xEDmica; a alimenta\xE7\xE3o uniforme favorece a opera\xE7\xE3o est\xE1vel.", "The hopper and conveyor meter residues onto the grate. Combustion air releases chemical energy; uniform feed supports stable operation.", "El silo y el transportador dosifican residuos hacia la parrilla. El aire de combusti\xF3n permite liberar energ\xEDa qu\xEDmica; una alimentaci\xF3n uniforme favorece la estabilidad.")],
      [T("Caldeira aquatubular", "Water-tube boiler", "Caldera acuotubular"), T("O calor dos gases aquece a \xE1gua nos tubos e gera vapor. \xC1gua e gases de combust\xE3o circulam em caminhos separados.", "Heat from flue gases heats water in tubes and produces steam. Water and combustion gases follow separate paths.", "El calor de los gases calienta el agua de los tubos y produce vapor. El agua y los gases de combusti\xF3n recorren circuitos separados.")],
      [T("Linha de vapor", "Steam line", "L\xEDnea de vapor"), T("O vapor conduz energia at\xE9 a turbina. V\xE1lvulas, isolamento e instrumenta\xE7\xE3o s\xE3o necess\xE1rios; o desenho n\xE3o representa um projeto de tubula\xE7\xE3o.", "Steam carries energy to the turbine. Valves, insulation and instrumentation are required; the drawing is not a piping design.", "El vapor transporta energ\xEDa hasta la turbina. Se requieren v\xE1lvulas, aislamiento e instrumentaci\xF3n; el dibujo no constituye un dise\xF1o de tuber\xEDas.")],
      [T("Turbina e gerador", "Turbine and generator", "Turbina y generador"), T("A expans\xE3o do vapor produz torque. O eixo aciona o gerador, que converte pot\xEAncia mec\xE2nica em el\xE9trica.", "Steam expansion produces torque. The shaft drives the generator, converting mechanical into electrical power.", "La expansi\xF3n del vapor produce par. El eje acciona el generador y convierte potencia mec\xE1nica en el\xE9ctrica.")],
      [T("Condensa\xE7\xE3o e retorno", "Condensation and return", "Condensaci\xF3n y retorno"), T("O condensador rejeita calor e devolve o vapor \xE0 fase l\xEDquida. A bomba retorna \xE1gua \xE0 caldeira; o circuito de resfriamento \xE9 separado.", "The condenser rejects heat and turns steam back into liquid. The pump returns water to the boiler; the cooling circuit is separate.", "El condensador rechaza calor y devuelve el vapor a la fase l\xEDquida. La bomba retorna agua a la caldera; el circuito de refrigeraci\xF3n es independiente.")],
      [T("Gases, particulados e cinzas", "Flue gas, particles and ash", "Gases, part\xEDculas y cenizas"), T("O tratamento dos gases reduz particulados antes da chamin\xE9. Cinzas exigem manejo; origem sustent\xE1vel e controle de emiss\xF5es fazem parte da avalia\xE7\xE3o ambiental.", "Gas treatment reduces particles before the stack. Ash requires handling; sustainable sourcing and emission control are part of the environmental assessment.", "El tratamiento de gases reduce part\xEDculas antes de la chimenea. Las cenizas requieren gesti\xF3n; el origen sostenible y el control de emisiones forman parte de la evaluaci\xF3n ambiental.")]
    ],
    activity: T("Mantenha 60 kg/h, PCI seco de 18,5 MJ/kg, \u03B7 bruto de 25% e auxiliares de 8%. Compare umidades de 15% e 45%. Guarde os dois cen\xE1rios e explique a diferen\xE7a de pot\xEAncia sem alterar a massa alimentada.", "Keep 60 kg/h, dry LHV 18.5 MJ/kg, gross efficiency 25% and auxiliaries 8%. Compare moisture levels of 15% and 45%. Save both scenarios and explain the power difference at the same feed mass.", "Mant\xE9n 60 kg/h, PCI seco 18,5 MJ/kg, rendimiento bruto 25% y auxiliares 8%. Compara humedades de 15% y 45%. Guarda ambos escenarios y explica la diferencia de potencia con la misma masa alimentada."),
    quiz: { q: T("Com a mesma massa \xFAmida alimentada, aumentar a umidade tende a\u2026", "At the same wet fuel feed rate, increasing moisture tends to\u2026", "Con la misma masa h\xFAmeda alimentada, aumentar la humedad tiende a\u2026"), options: [T("Aumentar a pot\xEAncia l\xEDquida", "Increase net power", "Aumentar la potencia neta"), T("Reduzir o PCI recebido e a pot\xEAncia", "Reduce as-received LHV and power", "Reducir el PCI recibido y la potencia"), T("Manter o PCI inalterado", "Leave LHV unchanged", "Mantener el PCI sin cambios")], answer: 1, explain: T("H\xE1 menos mat\xE9ria seca por quilograma recebido e parte da energia evapora a \xE1gua. Por isso, o PCI em base \xFAmida diminui.", "There is less dry matter per kilogram received, and some energy evaporates water. As-received LHV therefore decreases.", "Hay menos materia seca por kilogramo recibido y parte de la energ\xEDa evapora el agua. Por eso disminuye el PCI en base h\xFAmeda.") }
  },
  solar: {
    name: T("Fotovoltaica", "Photovoltaic", "Fotovoltaica"),
    icon: "sun",
    color: "#e3a324",
    tag: T("LUZ QUE VIRA ELETRICIDADE", "LIGHT BECOMES ELECTRICITY", "LUZ QUE SE VUELVE ELECTRICIDAD"),
    short: T("Da c\xE9lula solar \xE0 rede el\xE9trica.", "From solar cell to the grid.", "De la c\xE9lula solar a la red."),
    description: T("As c\xE9lulas convertem luz diretamente em corrente cont\xEDnua. Acompanhe o caminho pelos m\xF3dulos, inversor e conex\xE3o CA, e observe o efeito da temperatura e da irradi\xE2ncia.", "Cells convert light directly into direct current. Follow the path through modules, the inverter and AC connection, and observe the effects of temperature and irradiance.", "Las c\xE9lulas convierten luz directamente en corriente continua. Sigue el recorrido por los m\xF3dulos, el inversor y la conexi\xF3n CA, y observa los efectos de temperatura e irradiancia."),
    path: T("Radiante \u2192 el\xE9trica CC \u2192 el\xE9trica CA", "Radiant \u2192 DC electrical \u2192 AC electrical", "Radiante \u2192 el\xE9ctrica CC \u2192 el\xE9ctrica CA"),
    inputs: ["pv", "irradiance", "temp", "gamma", "lossesPV", "etaInv", "ratedPV", "hours"],
    sourceIds: ["inpe-solar", "nrel", "sandia", "pvdoe"],
    primary: "irradiance",
    xLabel: INPUTS.irradiance.label,
    learn: T("Separar kW, kWp e kWh; relacionar irradi\xE2ncia, temperatura de c\xE9lula, perdas e limite do inversor.", "Distinguish kW, kWp and kWh; relate irradiance, cell temperature, losses and inverter limits.", "Distinguir kW, kWp y kWh; relacionar irradiancia, temperatura de c\xE9lula, p\xE9rdidas y l\xEDmite del inversor."),
    limits: T("Modelo CC linear inspirado no balan\xE7o de pot\xEAncia de modelos fotovoltaicos. A temperatura da c\xE9lula \xE9 informada, n\xE3o estimada do ar. As perdas CC n\xE3o incluem a temperatura nem o inversor. A pot\xEAncia kWp j\xE1 incorpora a efici\xEAncia nominal do m\xF3dulo. O tempo representa horas sob irradi\xE2ncia constante: n\xE3o \xE9 HSP nem previs\xE3o de gera\xE7\xE3o di\xE1ria.", "Linear DC educational model inspired by PV power models. Cell temperature is entered, not estimated from ambient air. DC losses exclude temperature and inverter loss. kWp already includes nominal module efficiency. Time means hours at constant irradiance: not peak sun hours or a daily forecast.", "Modelo CC lineal did\xE1ctico inspirado en modelos fotovoltaicos. La temperatura de c\xE9lula se introduce y no se estima del aire. Las p\xE9rdidas CC excluyen temperatura e inversor. Los kWp ya incluyen la eficiencia nominal del m\xF3dulo. El tiempo representa horas con irradiancia constante: no son HSP ni una previsi\xF3n diaria."),
    extra: T("O inversor conectado \xE0 rede exige prote\xE7\xF5es e fun\xE7\xF5es de seguran\xE7a. A figura \xE9 conceitual e n\xE3o define quantidade de strings, limites de tens\xE3o, corrente, cabos ou prote\xE7\xF5es.", "Grid-connected inverters require protection and safety functions. The conceptual figure does not determine strings, voltage/current limits, cables or protection sizing.", "El inversor conectado a red requiere protecciones y funciones de seguridad. La figura conceptual no determina strings, l\xEDmites de tensi\xF3n y corriente, cables ni protecciones."),
    components: [
      [T("M\xF3dulo e c\xE9lulas", "Module and cells", "M\xF3dulo y c\xE9lulas"), T("A luz absorvida nas c\xE9lulas semicondutoras produz eletricidade CC. Vidro e encapsulamento protegem as c\xE9lulas; aquecimento pode reduzir a pot\xEAncia.", "Light absorbed in semiconductor cells produces DC electricity. Glass and encapsulant protect the cells; heating can reduce power.", "La luz absorbida en c\xE9lulas semiconductoras produce electricidad CC. El vidrio y el encapsulante protegen las c\xE9lulas; el calentamiento puede reducir la potencia.")],
      [T("Strings e circuito CC", "Strings and DC circuit", "Strings y circuito CC"), T("M\xF3dulos em s\xE9rie formam strings; circuitos em paralelo elevam a corrente. A configura\xE7\xE3o deve respeitar as janelas el\xE9tricas do inversor.", "Series-connected modules form strings; parallel circuits increase current. The configuration must match the inverter operating window.", "Los m\xF3dulos en serie forman strings; los circuitos en paralelo elevan la corriente. La configuraci\xF3n debe respetar el intervalo el\xE9ctrico del inversor.")],
      [T("MPPT e inversor", "MPPT and inverter", "MPPT e inversor"), T("O rastreamento MPPT busca o ponto de m\xE1xima pot\xEAncia. A eletr\xF4nica converte CC em CA; a sa\xEDda \xE9 limitada pela capacidade do inversor.", "MPPT tracks the maximum power point. Power electronics convert DC to AC; output is limited by inverter capacity.", "El MPPT busca el punto de m\xE1xima potencia. La electr\xF3nica convierte CC en CA; la salida est\xE1 limitada por la capacidad del inversor.")],
      [T("Quadro CA e prote\xE7\xE3o", "AC switchboard and protection", "Cuadro CA y protecci\xF3n"), T("Re\xFAne seccionamento, prote\xE7\xE3o e medi\xE7\xE3o conforme o projeto. O simulador n\xE3o dimensiona disjuntores, DPS, aterramento ou fun\xE7\xF5es de prote\xE7\xE3o.", "Combines isolation, protection and metering according to the design. The simulator does not size breakers, surge protection, grounding or protection functions.", "Re\xFAne seccionamiento, protecci\xF3n y medici\xF3n seg\xFAn el proyecto. El simulador no dimensiona interruptores, protecci\xF3n contra sobretensi\xF3n ni puesta a tierra.")],
      [T("Transformador", "Transformer", "Transformador"), T("Quando necess\xE1rio, adequa a tens\xE3o CA ao n\xEDvel da conex\xE3o. N\xE3o est\xE1 presente em todo sistema fotovoltaico.", "When required, it matches AC voltage to the connection level. Not every PV system includes a transformer.", "Cuando es necesario, adapta la tensi\xF3n CA al nivel de conexi\xF3n. No todos los sistemas fotovoltaicos incluyen transformador.")],
      [T("Conex\xE3o e medi\xE7\xE3o", "Grid connection and metering", "Conexi\xF3n y medici\xF3n"), T("A interface com a rede mede o fluxo de energia. A opera\xE7\xE3o depende dos requisitos da distribuidora e da configura\xE7\xE3o do sistema.", "The grid interface meters energy flow. Operation depends on utility requirements and system configuration.", "La interfaz con la red mide el flujo de energ\xEDa. La operaci\xF3n depende de los requisitos de la distribuidora y la configuraci\xF3n del sistema.")]
    ],
    activity: T("Fixe 10 kWp e 1.000 W/m\xB2. Compare c\xE9lulas a 25 \xB0C e 65 \xB0C com \u03B3 = \u22120,35%/\xB0C. Depois reduza o inversor para 5 kW e observe o recorte da curva.", "Set 10 kWp and 1,000 W/m\xB2. Compare cells at 25\xB0C and 65\xB0C with \u03B3 = \u22120.35%/\xB0C. Then reduce inverter capacity to 5 kW and observe clipping.", "Fija 10 kWp y 1.000 W/m\xB2. Compara c\xE9lulas a 25 \xB0C y 65 \xB0C con \u03B3 = \u22120,35%/\xB0C. Despu\xE9s reduce el inversor a 5 kW y observa el recorte de la curva."),
    quiz: { q: T("Com \u03B3 negativo e mesma irradi\xE2ncia, aquecer a c\xE9lula acima de 25 \xB0C tende a\u2026", "With negative \u03B3 and constant irradiance, heating cells above 25\xB0C tends to\u2026", "Con \u03B3 negativo e igual irradiancia, calentar la c\xE9lula por encima de 25 \xB0C tiende a\u2026"), options: [T("Elevar a pot\xEAncia CC", "Increase DC power", "Elevar la potencia CC"), T("N\xE3o afetar a pot\xEAncia", "Leave power unchanged", "No afectar la potencia"), T("Reduzir a pot\xEAncia CC", "Reduce DC power", "Reducir la potencia CC")], answer: 2, explain: T("O fator 1 + \u03B3(Tc \u2212 25) diminui quando \u03B3 \xE9 negativo e a temperatura aumenta. Temperatura de c\xE9lula n\xE3o \xE9 temperatura ambiente.", "The factor 1 + \u03B3(Tc \u2212 25) decreases when \u03B3 is negative and temperature rises. Cell temperature differs from ambient temperature.", "El factor 1 + \u03B3(Tc \u2212 25) disminuye cuando \u03B3 es negativo y sube la temperatura. La temperatura de c\xE9lula no es la temperatura ambiente.") }
  },
  wind: {
    name: T("E\xF3lica", "Wind", "E\xF3lica"),
    icon: "wind",
    color: "#599986",
    tag: T("O MOVIMENTO DO AR", "THE MOVEMENT OF AIR", "EL MOVIMIENTO DEL AIRE"),
    short: T("Aerodin\xE2mica, transmiss\xE3o e gera\xE7\xE3o.", "Aerodynamics, drivetrain and generation.", "Aerodin\xE1mica, transmisi\xF3n y generaci\xF3n."),
    description: T("A sustenta\xE7\xE3o nas p\xE1s transforma a energia do vento em rota\xE7\xE3o. Entre na nacele e descubra como o trem de pot\xEAncia e os controles entregam eletricidade.", "Aerodynamic lift on the blades turns wind energy into rotation. Enter the nacelle and explore how the drivetrain and controls deliver electricity.", "La sustentaci\xF3n en las palas transforma la energ\xEDa del viento en rotaci\xF3n. Entra en la g\xF3ndola y descubre c\xF3mo la transmisi\xF3n y los controles entregan electricidad."),
    path: T("Cin\xE9tica do ar \u2192 mec\xE2nica \u2192 el\xE9trica", "Air kinetic \u2192 mechanical \u2192 electrical", "Cin\xE9tica del aire \u2192 mec\xE1nica \u2192 el\xE9ctrica"),
    inputs: ["speed", "diameter", "rhoAir", "cp", "etaDrive", "ratedWind", "hours"],
    sourceIds: ["cepel-wind", "sbai-resource", "winddoe", "windparts"],
    primary: "speed",
    xLabel: INPUTS.speed.label,
    learn: T("Interpretar a rela\xE7\xE3o c\xFAbica da velocidade, a \xE1rea do rotor, o coeficiente Cp e os limites de opera\xE7\xE3o.", "Interpret cubic speed dependence, rotor area, power coefficient Cp and operating limits.", "Interpretar la relaci\xF3n c\xFAbica de la velocidad, el \xE1rea del rotor, el coeficiente Cp y los l\xEDmites operativos."),
    limits: T("Curva idealizada com Cp e rendimento constantes. A sa\xEDda \xE9 zero abaixo de 3 m/s e a partir de 25 m/s; entre esses pontos \xE9 limitada pela pot\xEAncia nominal. Esses limiares s\xE3o hip\xF3teses de exerc\xEDcio, n\xE3o especifica\xE7\xF5es universais. N\xE3o estima produ\xE7\xE3o anual, turbul\xEAncia, esteiras ou cargas estruturais. Cp \xE9 limitado a 0,59, abaixo de 16/27.", "Idealized curve with constant Cp and efficiency. Output is zero below 3 m/s and at or above 25 m/s; otherwise it is capped at rated power. These thresholds are exercise assumptions, not universal specifications. Annual yield, turbulence, wakes and structural loads are excluded. Cp is capped at 0.59, below 16/27.", "Curva idealizada con Cp y rendimiento constantes. La salida es cero por debajo de 3 m/s y desde 25 m/s; entre ambos se limita a la potencia nominal. Estos umbrales son hip\xF3tesis de ejercicio, no especificaciones universales. Se excluyen producci\xF3n anual, turbulencia, estelas y cargas estructurales. Cp se limita a 0,59, menor que 16/27."),
    extra: T("A ilustra\xE7\xE3o mostra um aerogerador com caixa multiplicadora. Existem m\xE1quinas de acionamento direto sem essa caixa. O controle de passo e a orienta\xE7\xE3o da nacele n\xE3o s\xE3o calculados.", "The illustration shows a geared turbine. Direct-drive machines have no gearbox. Pitch and nacelle orientation controls are not calculated.", "La ilustraci\xF3n muestra un aerogenerador con multiplicadora. Las m\xE1quinas de accionamiento directo no tienen esta caja. No se calculan el control de paso ni la orientaci\xF3n."),
    components: [
      [T("P\xE1s e cubo", "Blades and hub", "Palas y buje"), T("Perfis aerodin\xE2micos produzem torque. O passo das p\xE1s controla a capta\xE7\xE3o e contribui para limitar esfor\xE7os e pot\xEAncia.", "Aerodynamic profiles produce torque. Blade pitch controls capture and helps limit loads and power.", "Los perfiles aerodin\xE1micos producen par. El paso de las palas controla la captaci\xF3n y ayuda a limitar esfuerzos y potencia.")],
      [T("Eixo de baixa rota\xE7\xE3o", "Low-speed shaft", "Eje de baja velocidad"), T("Transmite o torque elevado do rotor ao trem de pot\xEAncia. Mancais sustentam o conjunto e exigem monitoramento.", "Transmits high rotor torque to the drivetrain. Bearings support the assembly and require monitoring.", "Transmite el elevado par del rotor a la transmisi\xF3n. Los rodamientos soportan el conjunto y requieren supervisi\xF3n.")],
      [T("Caixa multiplicadora", "Gearbox", "Caja multiplicadora"), T("Eleva a rota\xE7\xE3o para o gerador em m\xE1quinas com engrenagens. Lubrifica\xE7\xE3o, temperatura e vibra\xE7\xE3o s\xE3o vari\xE1veis de manuten\xE7\xE3o.", "Increases speed for the generator in geared machines. Lubrication, temperature and vibration are maintenance variables.", "Eleva la velocidad para el generador en m\xE1quinas con engranajes. Lubricaci\xF3n, temperatura y vibraci\xF3n son variables de mantenimiento.")],
      [T("Gerador el\xE9trico", "Electrical generator", "Generador el\xE9ctrico"), T("Converte pot\xEAncia do eixo em el\xE9trica. A topologia do gerador e do conversor varia entre fabricantes e arquiteturas.", "Converts shaft power into electricity. Generator and converter topology vary with manufacturer and architecture.", "Convierte potencia del eje en electricidad. La topolog\xEDa del generador y del convertidor var\xEDa seg\xFAn fabricante y arquitectura.")],
      [T("Conversor e controle", "Converter and control", "Convertidor y control"), T("A eletr\xF4nica condiciona a energia. Sensores apoiam o controle de velocidade, prote\xE7\xE3o e orienta\xE7\xE3o da nacele.", "Power electronics condition the energy. Sensors support speed, protection and nacelle orientation control.", "La electr\xF3nica acondiciona la energ\xEDa. Los sensores apoyan el control de velocidad, protecci\xF3n y orientaci\xF3n de la g\xF3ndola.")],
      [T("Torre e conex\xE3o", "Tower and connection", "Torre y conexi\xF3n"), T("A torre sustenta o conjunto em altura. Cabos e transforma\xE7\xE3o de tens\xE3o conectam a m\xE1quina ao circuito de coleta.", "The tower supports the assembly at height. Cables and voltage transformation connect the machine to the collection circuit.", "La torre sostiene el conjunto en altura. Los cables y la transformaci\xF3n de tensi\xF3n conectan la m\xE1quina al circuito de recolecci\xF3n.")]
    ],
    activity: T("Compare 5 e 10 m/s, mantendo D = 8 m, Cp = 0,42 e \u03B7 = 90%. Ajuste o limite nominal para 100 kW. A pot\xEAncia cresce oito vezes antes de alcan\xE7ar o limite? Depois teste 2 e 25 m/s.", "Compare 5 and 10 m/s with D = 8 m, Cp = 0.42 and \u03B7 = 90%. Set rated power to 100 kW. Does power increase eightfold before clipping? Then test 2 and 25 m/s.", "Compara 5 y 10 m/s con D = 8 m, Cp = 0,42 y \u03B7 = 90%. Ajusta la potencia nominal a 100 kW. \xBFLa potencia aumenta ocho veces antes del l\xEDmite? Despu\xE9s prueba 2 y 25 m/s."),
    quiz: { q: T("Antes do limite nominal, dobrar a velocidade com Cp constante multiplica a pot\xEAncia por\u2026", "Before rated limiting, doubling speed at constant Cp multiplies power by\u2026", "Antes del l\xEDmite nominal, duplicar la velocidad con Cp constante multiplica la potencia por\u2026"), options: [T("2", "2", "2"), T("4", "4", "4"), T("8", "8", "8")], answer: 2, explain: T("A pot\xEAncia \xE9 proporcional a v\xB3: (2v)\xB3 = 8v\xB3. Essa rela\xE7\xE3o n\xE3o continua depois do limite nominal e fora da faixa de opera\xE7\xE3o.", "Power is proportional to v\xB3: (2v)\xB3 = 8v\xB3. This relation stops applying after rated limiting or outside the operating range.", "La potencia es proporcional a v\xB3: (2v)\xB3 = 8v\xB3. La relaci\xF3n no contin\xFAa despu\xE9s del l\xEDmite nominal ni fuera del intervalo operativo.") }
  },
  hydro: {
    name: T("Hidrel\xE9trica", "Hydropower", "Hidroel\xE9ctrica"),
    icon: "drop",
    color: "#2695ae",
    tag: T("A FOR\xC7A DA \xC1GUA", "THE POWER OF WATER", "LA FUERZA DEL AGUA"),
    short: T("Queda, vaz\xE3o e convers\xE3o hidr\xE1ulica.", "Head, flow and hydraulic conversion.", "Altura, caudal y conversi\xF3n hidr\xE1ulica."),
    description: T("A diferen\xE7a de n\xEDvel e a vaz\xE3o dispon\xEDvel determinam o potencial hidr\xE1ulico. Explore a passagem da \xE1gua pela tomada, turbina e canal de fuga.", "Head difference and available flow determine hydraulic potential. Explore water passing through the intake, turbine and tailrace.", "La diferencia de nivel y el caudal disponible determinan el potencial hidr\xE1ulico. Explora el paso del agua por la toma, la turbina y el canal de descarga."),
    path: T("Potencial gravitacional \u2192 cin\xE9tica \u2192 mec\xE2nica \u2192 el\xE9trica", "Gravitational potential \u2192 kinetic \u2192 mechanical \u2192 electrical", "Potencial gravitacional \u2192 cin\xE9tica \u2192 mec\xE1nica \u2192 el\xE9ctrica"),
    inputs: ["flow", "head", "lossHead", "etaTurb", "etaGen", "ratedHydro", "hours"],
    sourceIds: ["ana-hydro", "epe", "hydrodoe", "hydroturb", "hydroeq"],
    primary: "flow",
    xLabel: INPUTS.flow.label,
    learn: T("Calcular queda l\xEDquida e pot\xEAncia; distinguir perda de carga dos rendimentos da turbina e do gerador.", "Calculate net head and power; distinguish hydraulic head loss from turbine and generator efficiencies.", "Calcular altura neta y potencia; distinguir la p\xE9rdida de carga del rendimiento de turbina y generador."),
    limits: T("\xC1gua doce com \u03C1 = 1.000 kg/m\xB3 e g = 9,81 m/s\xB2. A vaz\xE3o informada j\xE1 deve estar dispon\xEDvel ap\xF3s restri\xE7\xF5es ambientais e operacionais. A perda de carga \xE9 uma entrada independente; n\xE3o \xE9 recalculada com Q\xB2. Rendimentos constantes e limite nominal idealizado. N\xE3o estima vaz\xE3o firme, cavita\xE7\xE3o ou transientes.", "Fresh water with \u03C1 = 1,000 kg/m\xB3 and g = 9.81 m/s\xB2. Entered flow must already account for environmental and operating restrictions. Head loss is an independent input, not recalculated with Q\xB2. Efficiencies are constant and rated limiting is idealized. Firm flow, cavitation and transients are excluded.", "Agua dulce con \u03C1 = 1.000 kg/m\xB3 y g = 9,81 m/s\xB2. El caudal introducido debe descontar restricciones ambientales y operativas. La p\xE9rdida de carga es independiente y no se recalcula con Q\xB2. Rendimientos constantes y l\xEDmite nominal idealizado. Se excluyen caudal firme, cavitaci\xF3n y transitorios."),
    extra: T("A figura mostra uma turbina de rea\xE7\xE3o em arranjo conceitual. A sele\xE7\xE3o entre Francis, Kaplan, Pelton e outras depende da queda, vaz\xE3o e condi\xE7\xF5es do local.", "The figure shows a conceptual reaction-turbine arrangement. Selection between Francis, Kaplan, Pelton and other turbines depends on head, flow and site conditions.", "La figura muestra una turbina de reacci\xF3n en un arreglo conceptual. La elecci\xF3n entre Francis, Kaplan, Pelton y otras depende de altura, caudal y condiciones del lugar."),
    components: [
      [T("Reservat\xF3rio e tomada", "Reservoir and intake", "Embalse y toma"), T("A tomada admite \xE1gua; grades ret\xEAm parte dos detritos. A diferen\xE7a entre n\xEDveis de montante e jusante define a queda bruta.", "The intake admits water and screens retain debris. The upstream-to-downstream level difference defines gross head.", "La toma admite agua y las rejas retienen residuos. La diferencia entre niveles aguas arriba y abajo define la altura bruta.")],
      [T("Conduto for\xE7ado", "Penstock", "Tuber\xEDa forzada"), T("Conduz \xE1gua sob press\xE3o at\xE9 a turbina. Atrito e singularidades consomem parte da queda dispon\xEDvel.", "Carries pressurized water to the turbine. Friction and fittings consume part of the available head.", "Conduce agua a presi\xF3n hacia la turbina. La fricci\xF3n y los accesorios consumen parte de la altura disponible.")],
      [T("Distribuidor e turbina", "Guide vanes and turbine", "Distribuidor y turbina"), T("O distribuidor regula a admiss\xE3o. A \xE1gua transfere energia ao rotor, produzindo torque no eixo.", "Guide vanes regulate admission. Water transfers energy to the runner and produces shaft torque.", "El distribuidor regula la admisi\xF3n. El agua transfiere energ\xEDa al rodete y produce par en el eje.")],
      [T("Eixo e gerador", "Shaft and generator", "Eje y generador"), T("O eixo transmite pot\xEAncia mec\xE2nica ao gerador. O sistema el\xE9trico controla e protege a entrega \xE0 rede.", "The shaft transmits mechanical power to the generator. The electrical system controls and protects delivery to the grid.", "El eje transmite potencia mec\xE1nica al generador. El sistema el\xE9ctrico controla y protege la entrega a la red.")],
      [T("Tubo de suc\xE7\xE3o e canal de fuga", "Draft tube and tailrace", "Tubo de aspiraci\xF3n y canal de descarga"), T("A sa\xEDda da turbina conduz \xE1gua ao n\xEDvel de jusante. Na turbina de rea\xE7\xE3o, o tubo de suc\xE7\xE3o ajuda a recuperar energia cin\xE9tica.", "The turbine outlet leads water downstream. In a reaction turbine, the draft tube helps recover kinetic energy.", "La salida de la turbina conduce agua aguas abajo. En una turbina de reacci\xF3n, el tubo de aspiraci\xF3n ayuda a recuperar energ\xEDa cin\xE9tica.")],
      [T("Transforma\xE7\xE3o e subesta\xE7\xE3o", "Transformer and substation", "Transformaci\xF3n y subestaci\xF3n"), T("Adequa a tens\xE3o para a conex\xE3o el\xE9trica. Prote\xE7\xE3o, manobra e medi\xE7\xE3o dependem do projeto da usina.", "Matches voltage to the electrical connection. Protection, switching and metering depend on the plant design.", "Adapta la tensi\xF3n a la conexi\xF3n el\xE9ctrica. Protecci\xF3n, maniobra y medici\xF3n dependen del dise\xF1o de la central.")]
    ],
    activity: T("Use Q = 0,5 m\xB3/s, queda bruta de 20 m e perdas de 2 m. Dobre a vaz\xE3o mantendo a perda informada constante. Em seguida, aumente a perda para 8 m e explique a queda de pot\xEAncia.", "Use Q = 0.5 m\xB3/s, gross head 20 m and losses 2 m. Double flow while keeping entered head loss constant. Then increase loss to 8 m and explain the power reduction.", "Usa Q = 0,5 m\xB3/s, altura bruta de 20 m y p\xE9rdidas de 2 m. Duplica el caudal manteniendo constante la p\xE9rdida introducida. Despu\xE9s aumenta la p\xE9rdida a 8 m y explica la reducci\xF3n de potencia."),
    quiz: { q: T("Para queda bruta de 20 m e perda de carga de 2 m, a queda l\xEDquida \xE9\u2026", "For 20 m gross head and 2 m head loss, net head is\u2026", "Para altura bruta de 20 m y p\xE9rdida de carga de 2 m, la altura neta es\u2026"), options: [T("22 m", "22 m", "22 m"), T("18 m", "18 m", "18 m"), T("10 m", "10 m", "10 m")], answer: 1, explain: T("A queda l\xEDquida \xE9 Hl\xEDq = Hbruta \u2212 hperda = 20 \u2212 2 = 18 m. A perda hidr\xE1ulica \xE9 descontada antes dos rendimentos eletromec\xE2nicos.", "Net head is Hnet = Hgross \u2212 hloss = 20 \u2212 2 = 18 m. Hydraulic loss is deducted before electromechanical efficiencies.", "La altura neta es Hneta = Hbruta \u2212 hp\xE9rdida = 20 \u2212 2 = 18 m. La p\xE9rdida hidr\xE1ulica se descuenta antes de los rendimientos electromec\xE1nicos.") }
  },
  tidal: {
    name: T("Mar\xE9s", "Tidal", "Mareas"),
    icon: "waves",
    color: "#4a8ab7",
    tag: T("O RITMO DOS OCEANOS", "THE RHYTHM OF THE OCEANS", "EL RITMO DE LOS OC\xC9ANOS"),
    short: T("Correntes de mar\xE9 e turbinas submersas.", "Tidal currents and submerged turbines.", "Corrientes de marea y turbinas sumergidas."),
    description: T("As correntes associadas \xE0s mar\xE9s podem acionar rotores submersos. Explore a convers\xE3o hidrocin\xE9tica e diferencie essa rota das barragens de mar\xE9.", "Tidal currents can drive submerged rotors. Explore hydrokinetic conversion and distinguish it from tidal barrage systems.", "Las corrientes de marea pueden accionar rotores sumergidos. Explora la conversi\xF3n hidrocin\xE9tica y dist\xEDnguela de las presas mareomotrices."),
    path: T("Cin\xE9tica da corrente \u2192 mec\xE2nica \u2192 el\xE9trica", "Current kinetic \u2192 mechanical \u2192 electrical", "Cin\xE9tica de la corriente \u2192 mec\xE1nica \u2192 el\xE9ctrica"),
    inputs: ["tidalSpeed", "tidalDiameter", "rhoSea", "cpTidal", "etaMarine", "ratedTidal", "hours"],
    sourceIds: ["ufma-tidal", "sbai-resource", "marine", "eia", "noaa", "tidalstudy"],
    primary: "tidalSpeed",
    xLabel: INPUTS.tidalSpeed.label,
    learn: T("Relacionar densidade da \xE1gua, velocidade e \xE1rea varrida; distinguir correntes de mar\xE9, amplitude de mar\xE9 e energia das ondas.", "Relate water density, speed and swept area; distinguish tidal currents, tidal range and wave energy.", "Relacionar densidad del agua, velocidad y \xE1rea barrida; distinguir corrientes de marea, amplitud de marea y energ\xEDa de las olas."),
    limits: T("Modelo de turbina de corrente livre, n\xE3o de barragem. Usa o m\xF3dulo da velocidade, Cp e rendimento constantes; a sa\xEDda \xE9 limitada pela pot\xEAncia nominal. N\xE3o modela estofa, invers\xE3o, disponibilidade, bioincrusta\xE7\xE3o, cavita\xE7\xE3o ou intera\xE7\xF5es entre turbinas. E = P \xD7 t s\xF3 vale no cen\xE1rio constante; n\xE3o representa um dia real de mar\xE9s.", "Free-stream turbine model, not a barrage. Uses speed magnitude, constant Cp and efficiency; output is capped at rated power. Slack water, reversal, availability, biofouling, cavitation and array interactions are excluded. E = P \xD7 t applies only to the constant scenario, not a real tidal day.", "Modelo de turbina de corriente libre, no de presa. Usa el m\xF3dulo de la velocidad, Cp y rendimiento constantes; la salida se limita a la potencia nominal. No modela calma, inversi\xF3n, disponibilidad, bioincrustaci\xF3n, cavitaci\xF3n ni interacci\xF3n entre turbinas. E = P \xD7 t solo vale en el escenario constante, no en un d\xEDa real de mareas."),
    extra: T("A implanta\xE7\xE3o depende de batimetria, velocidade medida, navega\xE7\xE3o, fauna e manuten\xE7\xE3o submarina. A op\xE7\xE3o \xE9 estudada como compara\xE7\xE3o tecnol\xF3gica; n\xE3o pressup\xF5e disponibilidade de mar\xE9 no Acre.", "Deployment depends on bathymetry, measured currents, navigation, wildlife and subsea maintenance. This option is studied for technology comparison and does not imply tidal availability in Acre.", "La implantaci\xF3n depende de batimetr\xEDa, corrientes medidas, navegaci\xF3n, fauna y mantenimiento submarino. Se estudia como comparaci\xF3n tecnol\xF3gica y no presupone disponibilidad de mareas en Acre."),
    components: [
      [T("Rotor hidrocin\xE9tico", "Hydrokinetic rotor", "Rotor hidrocin\xE9tico"), T("As p\xE1s extraem parte da energia cin\xE9tica da \xE1gua. A \xE1rea varrida e a velocidade influenciam fortemente a pot\xEAncia.", "Blades extract part of the water kinetic energy. Swept area and speed strongly affect power.", "Las palas extraen parte de la energ\xEDa cin\xE9tica del agua. El \xE1rea barrida y la velocidad influyen mucho en la potencia.")],
      [T("Nacele submersa", "Submerged nacelle", "G\xF3ndola sumergida"), T("Abriga o trem de pot\xEAncia e o gerador. Veda\xE7\xE3o, corros\xE3o e acesso para manuten\xE7\xE3o s\xE3o desafios do ambiente marinho.", "Houses the drivetrain and generator. Sealing, corrosion and maintenance access are marine-environment challenges.", "Aloja la transmisi\xF3n y el generador. La estanqueidad, la corrosi\xF3n y el acceso para mantenimiento son retos del ambiente marino.")],
      [T("Cabo submarino", "Subsea cable", "Cable submarino"), T("Transporta a energia at\xE9 a costa. A prote\xE7\xE3o mec\xE2nica e as perdas el\xE9tricas dependem do projeto e da rota.", "Transports power to shore. Mechanical protection and electrical losses depend on the design and cable route.", "Transporta energ\xEDa hasta la costa. La protecci\xF3n mec\xE1nica y las p\xE9rdidas el\xE9ctricas dependen del dise\xF1o y la ruta.")],
      [T("Funda\xE7\xE3o no leito", "Seabed foundation", "Cimentaci\xF3n en el lecho"), T("Resiste aos esfor\xE7os da corrente e da turbina. Outras arquiteturas usam plataformas flutuantes e ancoragens.", "Resists current and turbine loads. Other architectures use floating platforms and moorings.", "Resiste las cargas de la corriente y la turbina. Otras arquitecturas usan plataformas flotantes y amarres.")],
      [T("Convers\xE3o e conex\xE3o em terra", "Onshore conversion and connection", "Conversi\xF3n y conexi\xF3n en tierra"), T("A eletr\xF4nica e os equipamentos el\xE9tricos adequam a energia \xE0 rede. O arranjo varia conforme a tecnologia da turbina.", "Power electronics and electrical equipment match output to the grid. The arrangement varies with turbine technology.", "La electr\xF3nica y los equipos el\xE9ctricos adaptan la energ\xEDa a la red. El arreglo var\xEDa seg\xFAn la tecnolog\xEDa de la turbina.")],
      [T("Corrente de enchente e vazante", "Flood and ebb currents", "Corrientes de flujo y reflujo"), T("A velocidade e a dire\xE7\xE3o variam com o ciclo local. Perto da estofa, a corrente diminui e a gera\xE7\xE3o tamb\xE9m.", "Speed and direction vary with the local cycle. Near slack water the current weakens and generation falls.", "La velocidad y la direcci\xF3n cambian con el ciclo local. Cerca de la calma de marea, la corriente disminuye y la generaci\xF3n tambi\xE9n.")]
    ],
    activity: T("Compare 1 e 2 m/s para D = 6 m, Cp = 0,4 e \u03B7 = 90%. Eleve o limite para 200 kW para observar a rela\xE7\xE3o c\xFAbica. Depois fa\xE7a v = 0 e discuta por que mar\xE9 previs\xEDvel n\xE3o significa pot\xEAncia constante.", "Compare 1 and 2 m/s with D = 6 m, Cp = 0.4 and \u03B7 = 90%. Increase the rated limit to 200 kW to observe cubic dependence. Then set v = 0 and discuss why predictable tides do not mean constant power.", "Compara 1 y 2 m/s con D = 6 m, Cp = 0,4 y \u03B7 = 90%. Eleva el l\xEDmite a 200 kW para observar la relaci\xF3n c\xFAbica. Despu\xE9s fija v = 0 y explica por qu\xE9 una marea previsible no significa potencia constante."),
    quiz: { q: T("O simulador de mar\xE9s representa\u2026", "The tidal simulator represents\u2026", "El simulador de mareas representa\u2026"), options: [T("Uma turbina acionada pela corrente de \xE1gua", "A turbine driven by flowing water", "Una turbina accionada por corriente de agua"), T("Uma barragem calculada s\xF3 pela altura da mar\xE9", "A barrage calculated only from tidal range", "Una presa calculada solo con la altura de marea"), T("Um conversor de ondas", "A wave energy converter", "Un convertidor de olas")], answer: 0, explain: T("A equa\xE7\xE3o \xBD\u03C1Av\xB3Cp\u03B7 usa a velocidade da corrente. Barragens de mar\xE9 e conversores de ondas usam modelos diferentes.", "The equation \xBD\u03C1Av\xB3Cp\u03B7 uses current speed. Tidal barrages and wave converters use different models.", "La ecuaci\xF3n \xBD\u03C1Av\xB3Cp\u03B7 usa la velocidad de la corriente. Las presas mareomotrices y los convertidores de olas usan modelos diferentes.") }
  }
};

// src/energy.ts
var modules = MODULES;
var inputs = INPUTS;
function calculate(key, v) {
  let power = 0, resource = 0, gross = 0, details = {}, limited = false, stopped = false;
  const h = v.hours;
  if (key === "biomass") {
    const u = v.moisture / 100, lhv = Math.max(0, v.lhv * (1 - u) - 2.443 * u);
    resource = v.mass * lhv / 3.6;
    gross = resource * v.etaBio / 100;
    power = gross * (1 - v.aux / 100);
    details = { u, lhv, auxPower: gross - power, fuelMass: v.mass * h, specific: power > 0 ? v.mass / power : null };
  } else if (key === "solar") {
    const temperature = Math.max(0, 1 + v.gamma / 100 * (v.temp - 25));
    resource = v.pv * v.irradiance / 1e3;
    const dc = resource * temperature * (1 - v.lossesPV / 100);
    gross = dc * v.etaInv / 100;
    power = Math.min(v.ratedPV, gross);
    limited = gross > v.ratedPV;
    details = { temperature, dc, uncapped: gross };
  } else if (key === "wind" || key === "tidal") {
    const isWind = key === "wind", d = isWind ? v.diameter : v.tidalDiameter, speed = isWind ? v.speed : v.tidalSpeed, rho = isWind ? v.rhoAir : v.rhoSea, cp = isWind ? v.cp : v.cpTidal, eta = (isWind ? v.etaDrive : v.etaMarine) / 100, rated = isWind ? v.ratedWind : v.ratedTidal;
    const area = Math.PI * d * d / 4;
    resource = 0.5 * rho * area * speed ** 3 / 1e3;
    const shaft = resource * cp;
    gross = shaft * eta;
    stopped = isWind && (speed < 3 || speed >= 25);
    power = stopped ? 0 : Math.min(gross, rated);
    limited = !stopped && gross > rated;
    details = { area, speed, rho, cp, eta, rated, shaft, uncapped: gross };
  } else {
    const netHead = Math.max(0, v.head - v.lossHead);
    resource = 1e3 * 9.81 * v.flow * netHead / 1e3;
    gross = resource * v.etaTurb / 100 * v.etaGen / 100;
    power = Math.min(gross, v.ratedHydro);
    limited = gross > v.ratedHydro;
    details = { netHead, shaft: resource * v.etaTurb / 100, uncapped: gross, grossPotential: 1e3 * 9.81 * v.flow * v.head / 1e3 };
  }
  return { power: Math.max(0, power), energy: Math.max(0, power * h), resource, gross, efficiency: resource > 0 ? power / resource * 100 : 0, limited, stopped, details };
}
function defaultsFor(key) {
  const v = {};
  for (const k of modules[key].inputs) v[k] = inputs[k].default;
  if (key === "solar") v.hours = 5;
  if (["wind", "hydro", "tidal"].includes(key)) v.hours = 8;
  return v;
}
function validValues(key, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value;
  return modules[key].inputs.every((k) => typeof v[k] === "number" && Number.isFinite(v[k]) && v[k] >= inputs[k].min && v[k] <= inputs[k].max);
}
var sourceKeys = Object.keys(modules);
export {
  calculate,
  defaultsFor,
  sourceKeys,
  validValues
};
