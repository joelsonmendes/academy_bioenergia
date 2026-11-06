import React, {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';
import {Button, Download, Heading, Icon} from './components';
import {format, T} from './model';
import {useApp} from './store';
import {advanceBench, benchLimits, evaluateRenewableBench, initialBenchState, renewableDefaults} from './renewable-bench';
import type {BenchMode, BenchMix, BenchRun, BenchSample, RenewableInput} from './renewable-bench';
import {createRenewableViewer, visibleBenchParts} from './renewable-viewer';
import type {BenchPart} from './renewable-viewer';

const modes = {
  grid: T('On-grid', 'Grid-tied', 'Conectado a red'),
  island: T('Off-grid', 'Off-grid', 'Aislado'),
  pump: T('Bombeamento solar', 'Solar pumping', 'Bombeo solar')
};
const mixNames = {
  solar: T('Fotovoltaica', 'Photovoltaic', 'Fotovoltaica'),
  wind: T('Eólica', 'Wind', 'Eólica'),
  hybrid: T('Solar + eólica', 'Solar + wind', 'Solar + eólica')
};
const modeIds = ['grid', 'island', 'pump'] as const;

const parts = {
  pv: {
    name: T('Módulos FV', 'PV modules', 'Módulos FV'),
    detail: T('Em série, somam-se as tensões dos módulos. Em paralelo, somam-se as correntes dos ramais idênticos. Compare as leituras no ponto de máxima potência (PMP).',
      'In series, module voltages add. In parallel, currents from identical strings add. Compare the readings at the maximum power point (MPP).',
      'En serie se suman las tensiones de los módulos. En paralelo se suman las corrientes de ramas idénticas. Compara las lecturas en el punto de máxima potencia (PMP).')
  },
  wind: {
    name: T('Aerogerador', 'Wind turbine', 'Aerogenerador'),
    detail: T('As pás extraem energia do vento. O modelo representa a potência CC disponível após a conversão elétrica e a retificação.',
      'The blades extract energy from the wind. The model shows DC power available after electrical conversion and rectification.',
      'Las palas extraen energía del viento. El modelo muestra la potencia CC disponible tras la conversión eléctrica y la rectificación.')
  },
  control: {
    name: T('Conversão CC', 'DC conversion', 'Conversión CC'),
    detail: T('Este estágio representa a eletrônica que condiciona a energia das fontes para o barramento CC ou para o acionamento da bomba.',
      'This stage represents power electronics that condition the sources for the DC bus or pump drive.',
      'Esta etapa representa la electrónica que acondiciona la energía de las fuentes para el bus CC o el accionamiento de la bomba.')
  },
  meter: {
    name: T('Aquisição de dados', 'Data acquisition', 'Adquisición de datos'),
    detail: T('A cada minuto simulado, o supervisório registra os ajustes e os resultados da bancada. Exporte as amostras em CSV para comparar ensaios.',
      'Each simulated minute, the monitor records the settings and readings. Export samples as CSV to compare trials.',
      'Cada minuto simulado, el monitor registra los ajustes y las lecturas. Exporta las muestras en CSV para comparar ensayos.')
  },
  inverter: {
    name: T('Inversor', 'Inverter', 'Inversor'),
    detail: T('Converte CC em CA. No modo on-grid o modelo depende da referência da rede. No modo off-grid, o inversor forma a alimentação CA da carga.',
      'It converts DC to AC. The grid-tied model relies on a grid reference. In off-grid mode the inverter establishes the AC supply.',
      'Convierte CC en CA. El modelo conectado depende de la referencia de la red. En modo aislado el inversor establece la alimentación CA.')
  },
  battery: {
    name: T('Bateria', 'Battery', 'Batería'),
    detail: T('O banco virtual absorve excedentes e complementa a geração quando falta potência. Corrente positiva indica carga. Corrente negativa indica descarga.',
      'The virtual bank absorbs surplus and supplements generation during shortfalls. Positive current indicates charging. Negative current indicates discharging.',
      'El banco virtual absorbe excedentes y complementa la generación ante déficits. La corriente positiva indica carga. La negativa indica descarga.')
  },
  load: {
    name: T('Carga CA', 'AC load', 'Carga CA'),
    detail: T('A carga representa uma demanda ajustável com fator de potência unitário. O painel separa a potência solicitada da que o sistema consegue atender.',
      'This adjustable load assumes unity power factor. The dashboard separates demand from the power the system can serve.',
      'La carga ajustable supone factor de potencia unitario. El panel distingue la demanda de la potencia atendida.')
  },
  grid: {
    name: T('Rede e medidor', 'Grid and meter', 'Red y medidor'),
    detail: T('O medidor separa a potência importada e a exportada. Ao retirar a rede simulada, a geração CA do inversor conectado é interrompida.',
      'The meter separates imported and exported power. Removing the simulated grid stops AC generation from the grid-tied inverter.',
      'El medidor separa potencia importada y exportada. Al retirar la red simulada, se interrumpe la generación CA del inversor conectado.')
  },
  pump: {
    name: T('Bomba CC', 'DC pump', 'Bomba CC'),
    detail: T('A bomba transforma parte da potência elétrica em potência hidráulica. Compare a vazão para diferentes alturas manométricas com a mesma irradiância.',
      'The pump converts part of the electrical power to hydraulic power. Compare flow at different total dynamic heads with the same irradiance.',
      'La bomba convierte parte de la potencia eléctrica en potencia hidráulica. Compara el caudal a distintas alturas manométricas con igual irradiancia.')
  },
  tanks: {
    name: T('Tanques e sensor', 'Tanks and sensor', 'Depósitos y sensor'),
    detail: T('A água sai do tanque inferior e eleva o nível do superior. O sensor ultrassônico virtual mede a distância até a superfície. O enchimento para em 20 L.',
      'Water moves from the lower tank to the upper tank. The virtual ultrasonic sensor measures the distance to the surface. Filling stops at 20 L.',
      'El agua pasa del depósito inferior al superior. El sensor ultrasónico virtual mide la distancia a la superficie. El llenado se detiene en 20 L.')
  }
};

const practices = {
  grid: {
    title: T('Da exportação à importação', 'From export to import', 'De la exportación a la importación'),
    steps: [
      T('Use fonte fotovoltaica, 2 módulos em série, 1 ramal, célula a 25 °C e carga de 100 W. Registre um minuto com 800 W/m².',
        'Use PV, 2 modules in series, 1 string, 25 °C cells and a 100 W load. Record one minute at 800 W/m².',
        'Usa FV, 2 módulos en serie, 1 ramal, células a 25 °C y carga de 100 W. Registra un minuto a 800 W/m².'),
      T('Reduza a irradiância a 250 W/m², registre novamente e compare os sentidos da troca com a rede. Desmarque a rede e observe a saída CA.',
        'Reduce irradiance to 250 W/m², record again and compare the direction of grid exchange. Disconnect the grid and observe the AC output.',
        'Reduce la irradiancia a 250 W/m², registra de nuevo y compara el sentido del intercambio con la red. Retira la red y observa la salida CA.')
    ],
    answer: T('Com os ajustes indicados, o sistema exporta 50,4 W a 800 W/m² e importa 53 W a 250 W/m². Sem rede, o inversor on-grid modelado deixa de gerar em CA.',
      'With those settings the system exports 50.4 W at 800 W/m² and imports 53 W at 250 W/m². Without the grid, the modeled inverter stops AC generation.',
      'Con esos ajustes el sistema exporta 50,4 W a 800 W/m² e importa 53 W a 250 W/m². Sin red, el inversor modelado deja de generar en CA.')
  },
  island: {
    title: T('A bateria após o pôr do sol', 'The battery after sunset', 'La batería al anochecer'),
    steps: [
      T('Selecione Solar + eólica, use 800 W/m² e 7 m/s, ajuste a carga para 100 W e registre um minuto. Observe a corrente da bateria.',
        'Select Solar + wind, use 800 W/m² and 7 m/s, set a 100 W load and record one minute. Observe battery current.',
        'Selecciona Solar + eólica, usa 800 W/m² y 7 m/s, ajusta la carga a 100 W y registra un minuto. Observa la corriente de la batería.'),
      T('Zere a irradiância e registre. Em seguida reduza o vento a 0 m/s e compare o estado de carga ao longo de vários minutos.',
        'Set irradiance to zero and record. Then reduce the wind to 0 m/s and compare state of charge over several minutes.',
        'Pon la irradiancia en cero y registra. Luego reduce el viento a 0 m/s y compara el estado de carga durante varios minutos.')
    ],
    answer: T('Sem sol nem vento, a bateria atende a carga enquanto houver energia acima da reserva e capacidade de descarga. A potência que faltar aparece como demanda não atendida.',
      'With neither sun nor wind, the battery serves the load while energy above the reserve and discharge capacity remain. Any shortfall is shown as unmet demand.',
      'Sin sol ni viento, la batería atiende la carga mientras quede energía sobre la reserva y capacidad de descarga. El déficit aparece como demanda no atendida.')
  },
  pump: {
    title: T('Vazão e altura manométrica', 'Flow and total dynamic head', 'Caudal y altura manométrica'),
    steps: [
      T('Com 800 W/m², 2 módulos em série e 1 ramal, compare a vazão prevista para 5 m e 10 m antes de avançar o tempo.',
        'With 800 W/m², 2 modules in series and 1 string, compare the predicted flow at 5 m and 10 m before advancing time.',
        'Con 800 W/m², 2 módulos en serie y 1 ramal, compara el caudal previsto a 5 m y 10 m antes de avanzar el tiempo.'),
      T('Registre alguns minutos e observe o volume superior e a distância do sensor. Explique o que faz a bomba parar.',
        'Record several minutes and observe the upper volume and sensor distance. Explain what stops the pump.',
        'Registra varios minutos y observa el volumen superior y la distancia del sensor. Explica qué detiene la bomba.')
    ],
    answer: T('À mesma potência hidráulica, dobrar a altura reduz a vazão à metade. A distância medida diminui conforme a água sobe. O limite de nível interrompe a transferência.',
      'At the same hydraulic power, doubling head halves the flow. Measured distance decreases as water rises. The level limit stops the transfer.',
      'Con la misma potencia hidráulica, duplicar la altura reduce el caudal a la mitad. La distancia medida disminuye al subir el agua. El límite de nivel detiene la transferencia.')
  }
};

function exportSamples(samples: BenchSample[], decimalComma: boolean) {
  const fields = [
    ['minute', 'min'], ['mode', 'modo'], ['mix', 'fontes'], ['series', 'modulos_serie'], ['parallel', 'ramais_paralelo'],
    ['irradiance', 'G_W_m2'], ['cellTemp', 'T_celula_C'], ['windSpeed', 'vento_m_s'], ['gridPresent', 'rede_presente'],
    ['loadW', 'demanda_W'], ['headM', 'altura_m'], ['solarV', 'FV_PMP_V'], ['solarA', 'FV_PMP_A'],
    ['solarW', 'FV_PMP_W'], ['windW', 'eolica_CC_W'], ['acV', 'saida_CA_V'], ['acA', 'carga_CA_A'],
    ['generationW', 'saida_inversor_W'], ['servedW', 'carga_atendida_W'], ['unmetW', 'deficit_W'],
    ['importW', 'rede_importacao_W'], ['exportW', 'rede_exportacao_W'], ['batteryA', 'bateria_A'],
    ['batteryW', 'bateria_W'], ['soc', 'SOC_pct'], ['pumpW', 'bomba_CC_W'], ['hydraulicW', 'hidraulica_W'],
    ['flowLpm', 'vazao_L_min'], ['upperL', 'tanque_superior_L'], ['lowerL', 'tanque_inferior_L'], ['distanceCm', 'distancia_cm']
  ] as const;
  const rows = samples.map(s => fields.map(([key]) => {
    const value = s[key];
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value !== 'number') return value;
    const number = Number(value.toFixed(4)).toString();
    return decimalComma ? number.replace('.', ',') : number;
  }).join(';'));
  Download('bioenergia-bancada-3d.csv', '\ufeff' + [fields.map(([, label]) => label).join(';'), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
}

function History({mode, samples}: {mode: BenchMode; samples: BenchSample[]}) {
  const {t, lang} = useApp();
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const rows = samples.filter(s => s.mode === mode);
  const pump = mode === 'pump';
  const lines = [
    {key: 'solarW', name: q('FV no PMP', 'PV at MPP', 'FV en PMP'), color: '#e5ad56'},
    {key: 'windW', name: q('Eólica CC', 'Wind DC', 'Eólica CC'), color: '#44cdbb'},
    {key: pump ? 'pumpW' : 'servedW', name: pump ? q('Bomba CC', 'DC pump', 'Bomba CC') : q('Carga CA', 'AC load', 'Carga CA'), color: '#58a9ef'}
  ] as const;
  const shown = pump ? lines.filter(line => line.key !== 'windW') : lines;
  const maximum = Math.max(10, ...rows.flatMap(s => shown.map(line => s[line.key])));
  const first = rows[0]?.minute ?? 0;
  const last = rows.at(-1)?.minute ?? 0;
  const x = (minute: number) => 49 + 495 * (minute - first) / Math.max(1, last - first);
  const y = (watts: number) => 121 - 99 * watts / maximum;

  return (
    <section className="lab3d-card exxer-history" aria-labelledby="exxer-history-title">
      <div className="exxer-history-head">
        <div>
          <span className="lab3d-kicker">{q('SUPERVISÓRIO VIRTUAL', 'VIRTUAL MONITOR', 'MONITOR VIRTUAL')}</span>
          <h2 id="exxer-history-title">{q('Histórico de medições', 'Measurement history', 'Historial de mediciones')}</h2>
          <p>{q('Até 120 amostras da sessão. O gráfico mostra o modo atual e o CSV reúne todos os modos.',
            'Up to 120 samples per session. The chart shows the current mode and the CSV includes all modes.',
            'Hasta 120 muestras de la sesión. El gráfico muestra el modo actual y el CSV reúne todos los modos.')}</p>
        </div>
        <Button icon="download" disabled={samples.length === 0} onClick={() => exportSamples(samples, lang !== 'en')}>
          {q('Exportar CSV', 'Export CSV', 'Exportar CSV')}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="exxer-empty">{q('Avance um minuto ou inicie a coleta para registrar as primeiras medições deste modo.',
          'Advance one minute or start recording to capture the first measurements in this mode.',
          'Avanza un minuto o inicia la captura para registrar las primeras mediciones de este modo.')}</p>
      ) : (
        <>
          <div className="exxer-chart-legend">{shown.map(line => <span key={line.key}><i style={{background: line.color}}/>{line.name}</span>)}</div>
          <svg className="exxer-chart" viewBox="0 0 580 150" role="img" aria-label={q('Série temporal de potência em watts', 'Power time series in watts', 'Serie temporal de potencia en vatios')}>
            {[0, .5, 1].map(f => <g key={f}>
              <path d={'M49 ' + y(f * maximum) + 'H544'}/>
              <text x="43" y={y(f * maximum) + 3} textAnchor="end">{format(f * maximum, lang, 0)}</text>
            </g>)}
            <text x="49" y="13">W</text><text x="49" y="142">{first} min</text>
            {last > first && <text x="544" y="142" textAnchor="end">{last} min</text>}
            {shown.map(line => rows.length === 1
              ? <circle key={line.key} cx={x(first)} cy={y(rows[0][line.key])} r="4" fill={line.color}/>
              : <polyline key={line.key} fill="none" stroke={line.color} strokeWidth="2.4"
                points={rows.map(s => x(s.minute) + ',' + y(s[line.key])).join(' ')}/>)}
          </svg>
          <div className="exxer-table-scroll">
            <table>
              <thead><tr><th scope="col">min</th>{shown.map(line => <th key={line.key} scope="col">{line.name} · W</th>)}
                <th scope="col">{pump ? q('Vazão · L/min', 'Flow · L/min', 'Caudal · L/min') : q('Demanda não atendida · W', 'Unmet demand · W', 'Demanda no atendida · W')}</th></tr></thead>
              <tbody>{rows.slice(-6).map(s => (
                <tr key={s.minute}>
                  <th scope="row">{s.minute}</th>
                  {shown.map(line => <td key={line.key}>{format(s[line.key], lang, 1)}</td>)}
                  <td>{format(pump ? s.flowLpm : s.unmetW, lang, 1)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function newRun(): BenchRun {
  return {state: initialBenchState(), samples: []};
}

export default function RenewableBench3D() {
  const {t, lang, navigate} = useApp();
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const [input, setInput] = useState(renewableDefaults);
  const [run, setRun] = useState<BenchRun>(newRun);
  const [running, setRunning] = useState(false);
  const [selection, setSelection] = useState<BenchPart>('pv');
  const [view, setView] = useState<'loading' | '3d' | 'lightweight' | 'diagram'>('loading');
  const surface = useRef<HTMLDivElement>(null);
  const viewer = useRef<ReturnType<typeof createRenewableViewer>>(null);
  const visible = visibleBenchParts(input);
  const part = visible.includes(selection) ? selection : visible[0];
  const canOrbit = view === '3d' || view === 'lightweight';
  const pump = input.mode === 'pump';
  const grid = input.mode === 'grid';
  const showPV = visible.includes('pv');
  const showWind = visible.includes('wind');
  const reading = evaluateRenewableBench(input, run.state);
  const exercise = practices[input.mode];

  useEffect(() => {
    if (!surface.current) return;
    try {
      const instance = createRenewableViewer(surface.current, setSelection, () => setView('diagram'));
      viewer.current = instance;
      setView(instance.lightweight ? 'lightweight' : '3d');
      return () => {
        instance.dispose();
        viewer.current = null;
      };
    } catch {
      setView('diagram');
    }
  }, []);

  useEffect(() => {
    viewer.current?.update(input, evaluateRenewableBench(input, run.state), part, running);
  }, [input, run.state, part, running]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setRun(prev => advanceBench(input, prev)), 1000);
    return () => window.clearInterval(timer);
  }, [running, input]);

  function range(key: keyof Pick<RenewableInput, 'irradiance' | 'cellTemp' | 'series' | 'parallel' | 'windSpeed' | 'loadW' | 'headM'>,
    label: string, unit: string, min: number, max: number, step: number, digits = 0) {
    return (
      <label>
        <span>{label} <strong aria-hidden="true">{format(input[key], lang, digits)} {unit}</strong></span>
        <input type="range" min={min} max={max} step={step} value={input[key]}
          onChange={event => setInput(prev => ({...prev, [key]: Number(event.target.value)}))}/>
      </label>
    );
  }

  function cameraKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!canOrbit || event.altKey || event.ctrlKey || event.metaKey) return;
    const camera = viewer.current;
    switch (event.key) {
      case 'ArrowLeft': camera?.rotate(-.18, 0); break;
      case 'ArrowRight': camera?.rotate(.18, 0); break;
      case 'ArrowUp': camera?.rotate(0, -.14); break;
      case 'ArrowDown': camera?.rotate(0, .14); break;
      case '+':
      case '=': camera?.zoom(1.2); break;
      case '-': camera?.zoom(1 / 1.2); break;
      case 'Home': camera?.reset(); break;
      default: return;
    }
    event.preventDefault();
  }

  const notice = grid && !input.gridPresent
    ? q('Rede ausente. A saída CA do inversor está interrompida.', 'Grid unavailable. Inverter AC output is off.', 'Red ausente. La salida CA del inversor está interrumpida.')
    : pump && reading.upperL >= benchLimits.upperCapacityL
      ? q('Tanque superior cheio. Bombeamento interrompido.', 'Upper tank full. Pumping stopped.', 'Depósito superior lleno. Bombeo interrumpido.')
      : null;
  const fvLabel = q('FV no PMP', 'PV at MPP', 'FV en PMP');
  const acLabel = q('Carga CA atendida', 'AC load served', 'Carga CA atendida');
  const readings = [
    ...(showPV ? [{label: fvLabel, value: reading.solarW, unit: 'W', detail: format(reading.solarV, lang, 1) + ' V · ' + format(reading.solarA, lang, 2) + ' A'}] : []),
    ...(showWind ? [{label: q('Eólica CC', 'Wind DC', 'Eólica CC'), value: reading.windW, unit: 'W'}] : []),
    ...(pump ? [
      {label: q('Vazão média', 'Mean flow', 'Caudal medio'), value: reading.flowLpm, unit: 'L/min'},
      {label: q('Bomba CC', 'DC pump', 'Bomba CC'), value: reading.pumpW, unit: 'W', detail: format(reading.hydraulicW, lang, 1) + ' W ' + q('hidráulicos', 'hydraulic', 'hidráulicos')},
      {label: q('Tanque superior', 'Upper tank', 'Depósito superior'), value: reading.upperL, unit: 'L', detail: q('Inferior', 'Lower', 'Inferior') + ' · ' + format(reading.lowerL, lang, 1) + ' L'},
      {label: q('Distância do sensor', 'Sensor distance', 'Distancia del sensor'), value: reading.distanceCm, unit: 'cm'}
    ] : [
      {label: acLabel, value: reading.servedW, unit: 'W', detail: format(reading.acV, lang, 0) + ' V · ' + format(reading.acA, lang, 2) + ' A'},
      ...(grid ? [
        {label: q('Saída do inversor', 'Inverter output', 'Salida del inversor'), value: reading.generationW, unit: 'W'},
        {label: q('Importação da rede', 'Grid import', 'Importación de red'), value: reading.importW, unit: 'W'},
        {label: q('Exportação à rede', 'Grid export', 'Exportación a red'), value: reading.exportW, unit: 'W'}
      ] : [
        {label: q('Carga da bateria (SOC)', 'Battery charge (SOC)', 'Carga de batería (SOC)'), value: reading.soc, unit: '%',
          detail: (reading.batteryA > 0 ? '+' : '') + format(reading.batteryA, lang, 2) + ' A · ' + benchLimits.batteryV + ' Vcc'}
      ]),
      {label: q('Demanda não atendida', 'Unmet demand', 'Demanda no atendida'), value: reading.unmetW, unit: 'W'}
    ])
  ];

  return (
    <section className="lab3d exxer">
      <Heading eyebrow={T('LABORATÓRIO 3D  /  PRÁTICAS ERN100', '3D LAB  /  ERN100 PRACTICE', 'LABORATORIO 3D  /  PRÁCTICAS ERN100')}
        title={T('Bancada de energias renováveis', 'Renewable energy bench', 'Banco de energías renovables')}
        description={T('Explore os módulos em 3D, varie as fontes e compare medições em práticas inspiradas na bancada EXXER.',
          'Explore the 3D modules, vary the energy sources and compare readings in exercises inspired by the EXXER bench.',
          'Explora los módulos 3D, varía las fuentes y compara lecturas en prácticas inspiradas en el banco EXXER.')}/>
      <div className="lab3d-layout">
        <div className="lab3d-workbench">
          <div className="lab3d-viewer">
            <div className="lab3d-toolbar">
              <div className="lab3d-modes" role="group" aria-label={q('Modo da bancada', 'Bench mode', 'Modo del banco')}>
                {modeIds.map(mode => (
                  <button key={mode} type="button" aria-pressed={input.mode === mode}
                    onClick={() => {setRunning(false); setInput(prev => ({...prev, mode}));}}>{t(modes[mode])}</button>
                ))}
              </div>
              {canOrbit && <div className="lab3d-tools">
                <button type="button" aria-label={q('Aproximar bancada', 'Zoom in', 'Acercar banco')} onClick={() => viewer.current?.zoom(1.2)}>+</button>
                <button type="button" aria-label={q('Afastar bancada', 'Zoom out', 'Alejar banco')} onClick={() => viewer.current?.zoom(1 / 1.2)}>−</button>
                <button type="button" aria-label={q('Restaurar câmera da bancada', 'Reset bench camera', 'Restablecer cámara del banco')} onClick={() => viewer.current?.reset()}><Icon name="reset"/></button>
              </div>}
            </div>
            <div className="lab3d-stage exxer-stage" role="group"
              aria-label={q('Modelo da bancada de energias renováveis', 'Renewable energy bench model', 'Modelo del banco de energías renovables')}
              aria-describedby="exxer-orbit" tabIndex={canOrbit ? 0 : undefined} onKeyDown={cameraKey}>
              <div ref={surface} className="lab3d-surface" aria-hidden="true" hidden={view === 'diagram'}/>
              {view === 'diagram' && <div className="exxer-schematic">
                {visible.map(id => <button type="button" key={id} aria-pressed={id === part} onClick={() => setSelection(id)}>{t(parts[id].name)}</button>)}
              </div>}
              <span className="lab3d-stage-label"><span className="lab3d-indicator"/>
                {view === '3d' ? q('MODELO 3D', '3D MODEL', 'MODELO 3D')
                  : view === 'lightweight' ? q('MODELO 3D LEVE', 'LIGHTWEIGHT 3D MODEL', 'MODELO 3D LIGERO')
                  : view === 'diagram' ? q('MÓDULOS DA BANCADA', 'BENCH MODULES', 'MÓDULOS DEL BANCO')
                  : q('CARREGANDO MODELO', 'LOADING MODEL', 'CARGANDO MODELO')}
              </span>
              <span className="exxer-clock">{q('Tempo', 'Time', 'Tiempo')} · {run.state.minute} min</span>
            </div>
            <p className="lab3d-help" id="exxer-orbit">{canOrbit
              ? q('Arraste para girar, amplie com roda ou pinça e selecione um módulo. Pelo teclado, use setas e +/−.',
                'Drag to rotate, scroll or pinch to zoom and select a module. On a keyboard use arrows and +/−.',
                'Arrastra para girar, amplía con la rueda o pellizco y selecciona un módulo. Con teclado usa flechas y +/−.')
              : q('Selecione um módulo para ver sua função.', 'Select a module to inspect its role.', 'Selecciona un módulo para ver su función.')}</p>
          </div>

          <section className="lab3d-card" aria-labelledby="exxer-parts">
            <h2 id="exxer-parts">{q('Módulos da bancada', 'Bench modules', 'Módulos del banco')}</h2>
            <div className="lab3d-parts">
              {visible.map((id, i) => <button type="button" key={id} aria-pressed={part === id} aria-controls="exxer-part"
                onClick={() => setSelection(id)}><span className="exxer-part-number">{String(i + 1).padStart(2, '0')}</span>{t(parts[id].name)}</button>)}
            </div>
            <div id="exxer-part" className="lab3d-part-detail" aria-live="polite"><strong>{t(parts[part].name)}</strong><p>{t(parts[part].detail)}</p></div>
          </section>
        </div>

        <div className="lab3d-side">
          <section className="lab3d-card" aria-labelledby="exxer-controls">
            <span className="lab3d-kicker">{q('CONDIÇÕES DO ENSAIO', 'TEST CONDITIONS', 'CONDICIONES DEL ENSAYO')}</span>
            <h2 id="exxer-controls">{q('Ajustar bancada', 'Configure bench', 'Configurar banco')}</h2>
            {!pump && <label className="exxer-select">{q('Fonte de geração', 'Generation source', 'Fuente de generación')}
              <select value={input.mix} onChange={event => setInput(prev => ({...prev, mix: event.target.value as BenchMix}))}>
                {(['solar', 'wind', 'hybrid'] as const).map(mix => <option key={mix} value={mix}>{t(mixNames[mix])}</option>)}
              </select>
            </label>}
            <div className="lab3d-inputs exxer-inputs">
              {showPV && <>
                {range('irradiance', q('Irradiância', 'Irradiance', 'Irradiancia'), 'W/m²', 0, 1200, 25)}
                {range('cellTemp', q('Temperatura da célula', 'Cell temperature', 'Temperatura de célula'), '°C', 0, 75, 1)}
                <div className="exxer-split">
                  {range('series', q('Módulos em série', 'Modules in series', 'Módulos en serie'), '', 1, 3, 1)}
                  {range('parallel', q('Ramais em paralelo', 'Parallel strings', 'Ramales en paralelo'), '', 1, 2, 1)}
                </div>
              </>}
              {showWind && range('windSpeed', q('Velocidade do vento', 'Wind speed', 'Velocidad del viento'), 'm/s', 0, 25, .5, 1)}
              {pump ? range('headM', q('Altura manométrica', 'Total dynamic head', 'Altura manométrica'), 'm', 2, 12, .5, 1)
                : range('loadW', q('Demanda da carga CA', 'AC load demand', 'Demanda de carga CA'), 'W', 0, 200, 5)}
            </div>
            {grid && <label className="exxer-check">
              <input type="checkbox" checked={input.gridPresent} onChange={event => setInput(prev => ({...prev, gridPresent: event.target.checked}))}/>
              {q('Rede externa presente', 'External grid available', 'Red externa presente')}
            </label>}
            <div className="exxer-actions">
              <Button icon="plus" disabled={running} onClick={() => setRun(prev => advanceBench(input, prev))}>
                {q('Avançar 1 min', 'Advance 1 min', 'Avanzar 1 min')}
              </Button>
              <Button icon={running ? 'close' : 'clock'} onClick={() => setRunning(prev => !prev)}>
                {running ? q('Pausar coleta', 'Pause recording', 'Pausar captura') : q('Iniciar coleta', 'Start recording', 'Iniciar captura')}
              </Button>
            </div>
            <p>{q('Na coleta automática, 1 segundo equivale a 1 minuto simulado.',
              'When recording, 1 second equals 1 simulated minute.', 'En captura automática, 1 segundo equivale a 1 minuto simulado.')}</p>
            <button className="exxer-reset" type="button" disabled={run.state.minute === 0 && !running}
              onClick={() => {setRunning(false); setRun(newRun());}}>
              <Icon name="reset"/>{q('Reiniciar sessão e limpar medições', 'Reset session and clear readings', 'Reiniciar sesión y borrar mediciones')}
            </button>
          </section>

          <section className="lab3d-card" aria-labelledby="exxer-readings">
            <span className="lab3d-kicker">{q('INSTRUMENTAÇÃO VIRTUAL', 'VIRTUAL INSTRUMENTATION', 'INSTRUMENTACIÓN VIRTUAL')}</span>
            <h2 id="exxer-readings">{q('Leituras do ensaio', 'Test readings', 'Lecturas del ensayo')}</h2>
            <dl className="exxer-meters">
              {readings.map(item => <div key={item.label}>
                <dt>{item.label}</dt><dd>{format(item.value, lang, item.unit === 'L/min' ? 2 : 1)} <small>{item.unit}</small></dd>
                {item.detail && <p>{item.detail}</p>}
              </div>)}
            </dl>
            {notice && <p className="exxer-notice" role="status">{notice}</p>}
            <p>{pump ? q('A vazão é a média prevista no próximo minuto. Os volumes e a distância mostram o estado atual.',
              'Flow is the predicted mean for the next minute. Volumes and distance show the current state.',
              'El caudal es el promedio previsto para el próximo minuto. Los volúmenes y la distancia muestran el estado actual.')
              : q('O PMP indica a potência disponível no arranjo. O inversor e a bateria determinam o aproveitamento.',
                'MPP shows the array’s available power. The inverter and battery determine how much is used.',
                'El PMP muestra la potencia disponible del arreglo. El inversor y la batería determinan su aprovechamiento.')}</p>
          </section>
        </div>
      </div>

      <div className="exxer-lower">
        <History mode={input.mode} samples={run.samples}/>
        <section className="lab3d-card exxer-practice">
          <span className="lab3d-kicker">{q('ROTEIRO DE AULA', 'LESSON GUIDE', 'GUÍA DE CLASE')}</span>
          <h2>{t(exercise.title)}</h2>
          <ol>{exercise.steps.map(step => <li key={step.pt}>{t(step)}</li>)}</ol>
          <details><summary>{q('Conferir a hipótese', 'Check the hypothesis', 'Comprobar la hipótesis')}</summary><p>{t(exercise.answer)}</p></details>
          <details>
            <summary>{q('Memória de cálculo', 'Calculation notes', 'Memoria de cálculo')}</summary>
            <p>{pump ? q('Pₕ = ρ × g × Q × H. Use Q em m³/s e H em m. Multiplique Q por 60.000 para obter L/min.',
              'Pₕ = ρ × g × Q × H. Use Q in m³/s and H in m. Multiply Q by 60,000 for L/min.',
              'Pₕ = ρ × g × Q × H. Usa Q en m³/s y H en m. Multiplica Q por 60.000 para obtener L/min.')
              : grid ? q('Potência de troca = potência do inversor − potência da carga, em W. Valor positivo indica exportação.',
                'Grid exchange = inverter output − load power, in W. A positive result indicates export.',
                'Intercambio = potencia del inversor − potencia de la carga, en W. Un valor positivo indica exportación.')
              : q('ΔE (Wh) = (0,95 × P de carga − P de descarga/0,95)/60 a cada minuto. Use as potências da bateria em W.',
                'ΔE (Wh) = (0.95 × charge power − discharge power/0.95)/60 each minute. Use battery power in W.',
                'ΔE (Wh) = (0,95 × P de carga − P de descarga/0,95)/60 por minuto. Usa las potencias de batería en W.')}</p>
          </details>
          <p>{q('Modelo didático com valores e geometrias ilustrativos. O histórico fica nesta sessão e pode ser guardado em CSV.',
            'Teaching model with illustrative parameters and geometry. The session history can be saved as CSV.',
            'Modelo didáctico con valores y geometrías ilustrativos. El historial de la sesión puede guardarse en CSV.')}</p>
          {pump
            ? <a href="https://cresesb.cepel.br/publicacoes/download/Manual_de_Engenharia_FV_2014.pdf" target="_blank" rel="noreferrer">
              {q('Manual fotovoltaico · CEPEL/CRESESB', 'PV engineering manual · CEPEL/CRESESB', 'Manual fotovoltaico · CEPEL/CRESESB')}<Icon name="external"/>
            </a>
            : <a href="https://www.energy.gov/cmei/systems/solar-integration-inverters-and-grid-services-basics" target="_blank" rel="noreferrer">
              {q('Inversores e rede · U.S. DOE', 'Inverters and grid services · U.S. DOE', 'Inversores y red · U.S. DOE')}<Icon name="external"/>
            </a>}
          <button className="exxer-reset" type="button" onClick={() => navigate('amazon')}>
            <Icon name="arrow"/>{q('Praticar ligações no Campus Amazônia', 'Practice wiring in Amazon Campus', 'Practicar conexiones en el Campus Amazonía')}
          </button>
        </section>
      </div>
    </section>
  );
}
