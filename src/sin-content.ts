import {T} from './model';
import type {SinRegion, SinScenario} from './sin-engine';
import type {Localized} from './types';

export const sinRegionText: Record<SinRegion, {name: Localized; short: Localized; detail: Localized}> = {
  north: {
    name: T('Norte', 'North', 'Norte'), short: T('Norte', 'North', 'Norte'),
    detail: T('Usinas hidrelétricas são importantes no Norte. A geração disponível e a capacidade de transmissão determinam quanto excedente pode seguir para outros subsistemas.',
      'Hydropower is important in the North. Available generation and transmission capacity determine how much surplus can reach other subsystems.',
      'Las hidroeléctricas son importantes en el Norte. La generación disponible y la capacidad de transmisión determinan cuánto excedente puede llegar a otros subsistemas.')
  },
  northeast: {
    name: T('Nordeste', 'Northeast', 'Nordeste'), short: T('Nordeste', 'Northeast', 'Nordeste'),
    detail: T('A oferta eólica e solar varia com o vento e o sol. Compare a situação de referência com a queda de geração eólica para ver o efeito nos intercâmbios.',
      'Wind and solar output vary with weather and time of day. Compare the reference case with lower wind generation to see the effect on exchanges.',
      'La oferta eólica y solar varía con el viento y el sol. Compara el caso de referencia con la caída eólica para ver su efecto en los intercambios.')
  },
  central: {
    name: T('Sudeste/Centro-Oeste', 'Southeast/Central-West', 'Sudeste/Centro-Oeste'), short: T('SE/CO', 'SE/CW', 'SE/CO'),
    detail: T('O Sudeste/Centro-Oeste concentra grandes centros de carga. Ele pode consumir parte da energia recebida e transferir outra parte para o Sul, dentro dos limites da simulação.',
      'The Southeast/Central-West contains major load centers. It can use some imported power and pass some on to the South within the simulation limits.',
      'El Sudeste/Centro-Oeste concentra grandes centros de carga. Puede consumir parte de la energía recibida y transferir otra al Sur dentro de los límites del modelo.')
  },
  south: {
    name: T('Sul', 'South', 'Sur'), short: T('Sul', 'South', 'Sur'),
    detail: T('A ligação com o Sudeste/Centro-Oeste permite receber ou enviar energia. O sentido muda conforme o balanço dos subsistemas e a disponibilidade do corredor.',
      'The connection with the Southeast/Central-West allows power to flow in either direction. The direction depends on subsystem balances and corridor availability.',
      'El enlace con el Sudeste/Centro-Oeste permite recibir o enviar energía. El sentido cambia según el balance de los subsistemas y la disponibilidad del corredor.')
  }
};

export const sinScenarioText: Record<SinScenario, {name: Localized; detail: Localized}> = {
  reference: {
    name: T('Operação de referência', 'Reference operation', 'Operación de referencia'),
    detail: T('Os excedentes do Norte e Nordeste atendem parte da demanda do Sudeste/Centro-Oeste e do Sul.',
      'Surplus from the North and Northeast covers part of Southeast/Central-West and South demand.',
      'Los excedentes del Norte y Nordeste cubren parte de la demanda del Sudeste/Centro-Oeste y del Sur.')
  },
  peak: {
    name: T('Pico de demanda', 'Demand peak', 'Pico de demanda'),
    detail: T('A demanda cresce no Sudeste/Centro-Oeste e no Sul. Observe a parcela que fica sem atendimento.',
      'Demand rises in the Southeast/Central-West and South. Observe the share that remains unserved.',
      'Aumenta la demanda en el Sudeste/Centro-Oeste y el Sur. Observa la parte que queda sin atender.')
  },
  wind: {
    name: T('Queda de geração eólica', 'Lower wind output', 'Caída de generación eólica'),
    detail: T('A geração disponível do Nordeste diminui em 3.500 MW no cenário. Confira como o intercâmbio muda.',
      'Available generation in the Northeast falls by 3,500 MW in this scenario. Check how exchanges change.',
      'La generación disponible del Nordeste cae 3.500 MW en este escenario. Observa cómo cambia el intercambio.')
  },
  bottleneck: {
    name: T('Corredor no limite', 'Corridor at its limit', 'Corredor al límite'),
    detail: T('O SIN tem geração disponível igual à demanda total. Mesmo assim, o limite do corredor com o Sul deixa parte da carga sem atendimento.',
      'Total available generation equals total demand. The corridor limit to the South still leaves part of the load unserved.',
      'La generación disponible total iguala la demanda. El límite del corredor con el Sur deja parte de la carga sin atender.')
  },
  outage: {
    name: T('Interrupção do corredor com o Sul', 'South corridor outage', 'Interrupción del corredor con el Sur'),
    detail: T('O Sul perde o único corredor que o liga aos demais subsistemas neste modelo. Veja quanto a geração local consegue atender.',
      'The South loses the only corridor linking it to other subsystems in this model. Check how much demand local generation can serve.',
      'El Sur pierde el único corredor que lo conecta a los demás subsistemas en este modelo. Comprueba cuánto puede atender la generación local.')
  }
};

export const sinReferences = {
  overview: {name: 'ONS · O que é o SIN', url: 'https://www.ons.org.br/paginas/sobre-o-sin/o-que-e-o-sin'},
  balances: {name: 'ONS · Balanço dos subsistemas', url: 'https://dados.ons.org.br/dataset/balanco-energia-subsistema'},
  exchanges: {name: 'ONS · Intercâmbios horários', url: 'https://dados.ons.org.br/dataset/intercambio-nacional'},
  acre: {name: 'ONS · PEN 2024', url: 'https://www.ons.org.br/AcervoDigitalDocumentosEPublicacoes/NT-ONS%20DPL%200114-2024-%20PEN%202024%20-%20Condi%C3%A7%C3%B5es%20de%20Atendimento.pdf'},
  isolated: {name: 'ONS · PEN SISOL 2026', url: 'https://www.ons.org.br/AcervoDigitalDocumentosEPublicacoes/RT-ONS%20DPL%200437-2025%20-%20PEN%20SISOL%202026.pdf'}
};
