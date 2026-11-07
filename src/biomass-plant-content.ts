import {T} from './model';
import type {Localized} from './types';
import type {FlowFilter, PlantPart, PlantView, plantFlows} from './biomass-plant-viewer';

export const plantLessons: Record<PlantPart, {title: Localized; description: Localized}> = {
  yard: {
    title: T('Recepção e estoque', 'Receiving and storage', 'Recepción y almacenamiento'),
    description: T(
      'O galpão recebe cavacos e protege o estoque da chuva. O lote deve ser caracterizado quanto à umidade, à granulometria e à presença de contaminantes.',
      'The shed receives wood chips and protects the stock from rain. Each batch is characterized by moisture, particle size and contaminants.',
      'El galpón recibe astillas y protege el acopio de la lluvia. Se caracteriza cada lote por humedad, granulometría y contaminantes.')
  },
  feeder: {
    title: T('Esteira e dosagem', 'Conveyor and metering', 'Cinta y dosificación'),
    description: T(
      'A moega alimenta a esteira. O dosador regula a vazão mássica de combustível úmido que chega à fornalha.',
      'The hopper feeds the belt. The metering device sets the wet fuel mass flow rate into the furnace.',
      'La tolva alimenta la cinta. El dosificador regula el caudal másico de combustible húmedo hacia el hogar.')
  },
  boiler: {
    title: T('Caldeira em corte', 'Boiler cutaway', 'Caldera en corte'),
    description: T(
      'A biomassa queima sobre a grelha. O calor atravessa as paredes dos tubos da caldeira e aquece a água do circuito. O vapor segue à turbina e os gases saem por um duto separado.',
      'Biomass burns on the grate. Heat crosses the boiler tube walls and heats the water. Steam flows to the turbine and flue gas leaves through a separate duct.',
      'La biomasa se quema sobre la parrilla. El calor atraviesa la pared de los tubos y calienta el agua. El vapor va a la turbina y los gases salen por un conducto separado.')
  },
  turbine: {
    title: T('Turbina a vapor', 'Steam turbine', 'Turbina de vapor'),
    description: T(
      'O vapor se expande em estágios e aciona as pás móveis. O eixo transmite torque ao gerador e o vapor de escape segue para o condensador.',
      'Steam expands through stages and drives the moving blades. The shaft transfers torque to the generator and exhaust steam flows to the condenser.',
      'El vapor se expande en etapas y mueve los álabes. El eje transmite par al generador y el vapor de escape va al condensador.')
  },
  generator: {
    title: T('Gerador e acoplamento', 'Generator and coupling', 'Generador y acoplamiento'),
    description: T(
      'O acoplamento transmite a rotação do eixo. O campo magnético girante induz tensão alternada nos enrolamentos fixos do gerador.',
      'The coupling transmits shaft rotation. The rotating magnetic field induces alternating voltage in the generator’s stationary windings.',
      'El acoplamiento transmite el giro del eje. El campo magnético giratorio induce tensión alterna en los devanados fijos del generador.')
  },
  transformer: {
    title: T('Transformador e saída', 'Transformer and feeder', 'Transformador y salida'),
    description: T(
      'O transformador adequa a tensão alternada para a entrega da energia. A ligação em amarelo resume o percurso elétrico, incluindo a saída para a rede.',
      'The transformer adjusts AC voltage for delivery. The yellow line summarizes the electrical path, including the grid feeder.',
      'El transformador adapta la tensión alterna para la entrega. La línea amarilla resume el recorrido eléctrico, incluida la salida a la red.')
  },
  condenser: {
    title: T('Condensador', 'Condenser', 'Condensador'),
    description: T(
      'O vapor de escape cede calor à água de resfriamento e volta ao estado líquido. Os dois circuitos trocam calor pela parede dos tubos.',
      'Exhaust steam transfers heat to the cooling water and returns to a liquid state. The two circuits exchange heat through the tube walls.',
      'El vapor de escape cede calor al agua de refrigeración y vuelve al estado líquido. Los circuitos intercambian calor a través de la pared de los tubos.')
  },
  pump: {
    title: T('Bomba de alimentação', 'Feedwater pump', 'Bomba de alimentación'),
    description: T(
      'A bomba eleva a pressão da água para retornar à caldeira. Seu acionamento elétrico faz parte do consumo auxiliar da usina.',
      'The pump raises the water pressure for its return to the boiler. Its electric drive is part of the plant’s auxiliary use.',
      'La bomba eleva la presión del agua para volver a la caldera. Su accionamiento eléctrico forma parte del consumo auxiliar.')
  },
  cooling: {
    title: T('Torre de resfriamento', 'Cooling tower', 'Torre de refrigeración'),
    description: T(
      'A torre rejeita calor ao ambiente e devolve água mais fria ao condensador. É um circuito separado da água de alimentação da caldeira.',
      'The tower rejects heat to the environment and returns cooler water to the condenser. This circuit is separate from boiler feedwater.',
      'La torre cede calor al ambiente y devuelve agua más fría al condensador. El circuito es independiente del agua de alimentación de la caldera.')
  },
  filter: {
    title: T('Filtro de particulados', 'Particulate filter', 'Filtro de partículas'),
    description: T(
      'O filtro retém parte do material particulado arrastado pelos gases. As cinzas volantes capturadas saem pelas moegas inferiores.',
      'The filter captures part of the particulate matter carried by flue gas. Captured fly ash leaves through the lower hoppers.',
      'El filtro retiene parte del material particulado arrastrado por los gases. Las cenizas volantes capturadas salen por las tolvas inferiores.')
  },
  stack: {
    title: T('Chaminé', 'Stack', 'Chimenea'),
    description: T(
      'A chaminé conduz os gases do filtro até o ponto de descarga. O desempenho ambiental depende do combustível, da combustão e do tratamento dos gases.',
      'The stack carries flue gas from the filter to the discharge point. Environmental performance depends on fuel, combustion and gas treatment.',
      'La chimenea conduce los gases desde el filtro al punto de descarga. El desempeño ambiental depende del combustible, la combustión y el tratamiento de gases.')
  },
  ash: {
    title: T('Coleta de cinzas', 'Ash collection', 'Recogida de cenizas'),
    description: T(
      'A cinza de fundo sai sob a grelha. A cinza volante capturada sai do filtro. O modelo mostra recipientes distintos para as duas correntes.',
      'Bottom ash leaves below the grate. Captured fly ash leaves the filter. The model shows separate containers for both streams.',
      'La ceniza de fondo sale debajo de la parrilla. La ceniza volante capturada sale del filtro. El modelo muestra recipientes separados para ambas corrientes.')
  }
};

export const plantViewLabels: Record<PlantView, Localized> = {
  overview: T('Vista geral', 'Overview', 'Vista general'),
  boiler: T('Corte da caldeira', 'Boiler cutaway', 'Corte de la caldera'),
  generation: T('Ilha de geração', 'Power island', 'Isla de generación'),
  exhaust: T('Gases e cinzas', 'Flue gas and ash', 'Gases y cenizas')
};

export const filterLabels: Record<FlowFilter, Localized> = {
  all: T('Todos', 'All', 'Todos'),
  fuel: T('Combustível', 'Fuel', 'Combustible'),
  steam: T('Ciclo a vapor', 'Steam cycle', 'Ciclo de vapor'),
  cooling: T('Resfriamento', 'Cooling', 'Refrigeración'),
  gas: T('Gases', 'Flue gas', 'Gases'),
  ash: T('Cinzas', 'Ash', 'Cenizas'),
  electric: T('Eletricidade', 'Electricity', 'Electricidad')
};

export const flowLabels: Record<keyof typeof plantFlows, Localized> = {
  fuel: T('Biomassa', 'Biomass', 'Biomasa'),
  steam: T('Vapor vivo', 'Live steam', 'Vapor vivo'),
  exhaust: T('Vapor de escape', 'Exhaust steam', 'Vapor de escape'),
  water: T('Condensado e alimentação', 'Condensate and feedwater', 'Condensado y alimentación'),
  cooling: T('Água de resfriamento', 'Cooling water', 'Agua de refrigeración'),
  gas: T('Gases de combustão', 'Flue gas', 'Gases de combustión'),
  ash: T('Cinzas de fundo e volantes', 'Bottom and fly ash', 'Cenizas de fondo y volantes'),
  electric: T('Saída elétrica', 'Electrical output', 'Salida eléctrica')
};

export const plantReferences = [
  {
    label: T('EPE · Ciclo a vapor em usinas brasileiras', 'EPE · Steam cycles in Brazilian plants', 'EPE · Ciclo de vapor en plantas brasileñas'),
    url: 'https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-433/EPE-DEE-089-2019-r0%20-%20NT%20BIOMASSA%20LEILOES.pdf'
  },
  {
    label: T('Embrapa Florestas · Umidade e poder calorífico', 'Embrapa Florestas · Moisture and heating value', 'Embrapa Florestas · Humedad y poder calorífico'),
    url: 'https://www.infoteca.cnptia.embrapa.br/handle/doc/315901'
  },
  {
    label: T('U.S. EPA · Diagrama de uma usina a biomassa', 'U.S. EPA · Biomass plant flowsheet', 'U.S. EPA · Diagrama de una planta de biomasa'),
    url: 'https://www.epa.gov/sites/default/files/2015-07/documents/biomass_combined_heat_and_power_catalog_of_technologies_v.1.1.pdf'
  }
];
