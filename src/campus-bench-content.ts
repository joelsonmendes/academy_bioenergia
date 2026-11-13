import {T, format, tr} from './model';
import type {Language, Localized} from './types';
import type {BenchInput, BenchResult, BenchSource, Terminal} from './amazon-engine';
import type {BenchDevice} from './campus-bench-wiring';

export const campusBenchTitle = T('Bancada de montagem', 'Wiring bench', 'Banco de montaje');

export const terminalNames: Record<Terminal, Localized> = {
  'source+': T('Saída CC +', 'DC output +', 'Salida CC +'),
  'source-': T('Saída CC −', 'DC output −', 'Salida CC −'),
  'mpptPV+': T('Entrada CC +', 'DC input +', 'Entrada CC +'),
  'mpptPV-': T('Entrada CC −', 'DC input −', 'Entrada CC −'),
  'mpptBAT+': T('Bateria +', 'Battery +', 'Batería +'),
  'mpptBAT-': T('Bateria −', 'Battery −', 'Batería −'),
  'bat+': T('Barramento +', 'Bus +', 'Barra +'),
  'bat-': T('Barramento −', 'Bus −', 'Barra −'),
  'invDC+': T('Entrada CC +', 'DC input +', 'Entrada CC +'),
  'invDC-': T('Entrada CC −', 'DC input −', 'Entrada CC −'),
  invL: T('Saída CA · L', 'AC output · L', 'Salida CA · L'),
  invN: T('Saída CA · N', 'AC output · N', 'Salida CA · N'),
  loadL: T('Entrada CA · L', 'AC input · L', 'Entrada CA · L'),
  loadN: T('Entrada CA · N', 'AC input · N', 'Entrada CA · N')
};

const parts = {
  solar: {icon: 'sun', name: T('Arranjo FV', 'PV array', 'Arreglo FV'),
    description: T('Os módulos fornecem energia CC ao controlador. A ligação em série altera a tensão. As strings em paralelo alteram a corrente.',
      'The modules supply DC energy to the controller. Series modules change voltage. Parallel strings change current.',
      'Los módulos suministran energía CC al controlador. Los módulos en serie cambian la tensión. Las cadenas en paralelo cambian la corriente.')},
  wind: {icon: 'wind', name: T('Eólico + retificador', 'Wind + rectifier', 'Eólico + rectificador'),
    description: T('O aerogerador e o retificador representam uma fonte CC. Conecte a saída retificada ao controlador virtual.',
      'The turbine and rectifier represent a DC source. Connect the rectified output to the virtual controller.',
      'El aerogenerador y el rectificador representan una fuente CC. Conecta la salida rectificada al controlador virtual.')},
  controller: {icon: 'layers', name: T('Controlador MPPT', 'MPPT controller', 'Controlador MPPT'),
    description: T('O controlador recebe a energia da fonte e alimenta o barramento do banco de baterias. Observe o limite de corrente de carga.',
      'The controller receives energy from the source and supplies the battery bus. Observe the charging current limit.',
      'El controlador recibe la energía de la fuente y alimenta la barra de baterías. Observa el límite de corriente de carga.')},
  battery: {icon: 'bolt', name: T('Banco de baterias', 'Battery bank', 'Banco de baterías'),
    description: T('O banco recebe energia do controlador e sustenta a carga quando falta geração. Os bornes representam o banco completo.',
      'The bank receives energy from the controller and supports the load when generation is insufficient. The terminals represent the whole bank.',
      'El banco recibe energía del controlador y sostiene la carga cuando falta generación. Los bornes representan el banco completo.')},
  inverter: {icon: 'waves', name: T('Inversor', 'Inverter', 'Inversor'),
    description: T('O inversor converte a energia CC do barramento em CA. Compare a potência entregue com o limite nominal do ensaio.',
      'The inverter converts bus energy from DC to AC. Compare delivered power with the rated limit in this exercise.',
      'El inversor convierte la energía CC de la barra en CA. Compara la potencia entregada con el límite nominal del ensayo.')},
  protection: {icon: 'shield', name: T('Quadro de proteção', 'Protection panel', 'Cuadro de protección'),
    description: T('O quadro indica o bloqueio idealizado do ensaio. Use o seletor de falhas para observar o efeito na saída.',
      'The panel indicates idealized trips in the exercise. Use the fault selector to see the effect on output.',
      'El cuadro indica el bloqueo idealizado del ensayo. Usa el selector de fallos para observar el efecto en la salida.')},
  load: {icon: 'plant', name: T('Carga equivalente', 'Equivalent load', 'Carga equivalente'),
    description: T('A carga representa consumo resistivo com fator de potência unitário. A lâmpada acende quando o modelo entrega potência.',
      'The load represents resistive consumption at unity power factor. The lamp lights when the model delivers power.',
      'La carga representa un consumo resistivo con factor de potencia unitario. La lámpara se enciende cuando el modelo entrega potencia.')}
};

export function benchPart(id: BenchDevice, source: BenchSource) {
  return parts[id === 'source' ? source : id];
}

const available = T('Potência disponível', 'Available power', 'Potencia disponible');
const delivered = T('Potência entregue', 'Delivered power', 'Potencia entregada');
const voltage = T('Tensão', 'Voltage', 'Tensión');
const power = T('Potência CC', 'DC power', 'Potencia CC');

export function benchReadings(id: BenchDevice, input: BenchInput, result: BenchResult, lang: Language): [Localized, string][] {
  const n = (value: number, unit: string, digits = 2) => format(value, lang, digits) + ' ' + unit;
  switch (id) {
    case 'source':
      return [[available, n(result.sourceW / 1000, 'kW')],
        [T('Tensão de operação', 'Operating voltage', 'Tensión de operación'), n(result.sourceOperatingV, 'V', 1)],
        input.source === 'solar' ? [T('Série × paralelo', 'Series × parallel', 'Serie × paralelo'), input.series + ' × ' + input.parallel]
          : [T('Velocidade do vento', 'Wind speed', 'Velocidad del viento'), n(input.windSpeed, 'm/s', 1)]];
    case 'controller':
      return [[power, n(result.controllerW / 1000, 'kW')],
        [T('Tensão na entrada', 'Input voltage', 'Tensión de entrada'), result.sourceConnected ? n(result.mpptV, 'V', 1) : '—'],
        [T('Limite de carga', 'Charge limit', 'Límite de carga'), n(input.controllerA, 'A', 0)]];
    case 'battery':
      return [[voltage, n(result.batteryV, 'V', 1)], [T('Estado de carga', 'State of charge', 'Estado de carga'), n(input.soc, '%', 1)],
        [T('Potência líquida (+ carga / − descarga)', 'Net power (+ charge / − discharge)', 'Potencia neta (+ carga / − descarga)'),
          (result.batteryW > 0 ? '+' : '') + n(result.batteryW, 'W', 0)]];
    case 'inverter':
      return [[delivered, n(result.outputW / 1000, 'kW')], [T('Saída CA', 'AC output', 'Salida CA'), n(result.outputV, 'V', 0)],
        [T('Potência nominal', 'Rated power', 'Potencia nominal'), n(input.inverterW / 1000, 'kW')]];
    case 'load':
      return [[delivered, n(result.outputW / 1000, 'kW')], [T('Corrente', 'Current', 'Corriente'), n(result.outputA, 'A')],
        [T('Tensão na carga', 'Load voltage', 'Tensión en la carga'), result.loadConnected ? n(result.outputV, 'V', 0) : '—']];
    case 'protection':
      return [[T('Estado', 'Status', 'Estado'), tr(result.tripped
        ? T('Bloqueio ativo', 'Trip active', 'Bloqueo activo')
        : T('Sem bloqueio', 'No trip', 'Sin bloqueo'), lang)]];
  }
}
