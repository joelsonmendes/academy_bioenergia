import React, {useEffect, useRef, useState} from 'react';
import {Button, Heading, Icon} from './components';
import {calculate, defaultsFor, windSpeedLimits} from './energy';
import {format, T} from './model';
import {useApp} from './store';
import {LabParameterField} from './LabParameterField';
import {handleLabCameraKey} from './lab-viewer';
import {createWindViewer, windParts, windPartVisible} from './wind-viewer';
import type {WindPart, WindView} from './wind-viewer';
import type {Parameters} from './types';

const views = {
  overview: T('Vista geral', 'Overview', 'Vista general'),
  cutaway: T('Nacele em corte', 'Nacelle cutaway', 'Góndola en corte'),
  exploded: T('Vista explodida', 'Exploded view', 'Vista explosionada')
};
const viewIds = ['overview', 'cutaway', 'exploded'] as const;
const parts = {
  blades: {
    title: T('Pás', 'Blades', 'Palas'),
    text: T('Os perfis das três pás geram forças aerodinâmicas que produzem torque no rotor. A área varrida depende do diâmetro do rotor.',
      'The three blade profiles develop aerodynamic forces that produce rotor torque. Swept area depends on rotor diameter.',
      'Los perfiles de las tres palas desarrollan fuerzas aerodinámicas que producen par en el rotor. El área barrida depende del diámetro del rotor.')
  },
  pitch: {
    title: T('Cubo e passo das pás', 'Hub and blade pitch', 'Buje y paso de palas'),
    text: T('O cubo liga as pás ao eixo. O sistema de passo gira cada pá em torno do próprio eixo longitudinal. No ensaio de vento forte, observe as pás em bandeira.',
      'The hub connects the blades to the shaft. Pitch rotates each blade around its own longitudinal axis. In the high-wind test, observe the blades feathering.',
      'El buje conecta las palas al eje. El paso gira cada pala alrededor de su eje longitudinal. En el ensayo de viento fuerte, observa las palas en bandera.')
  },
  shaft: {
    title: T('Eixo lento e mancal', 'Low-speed shaft and bearing', 'Eje lento y cojinete'),
    text: T('O eixo lento transmite o torque do rotor à multiplicadora. O mancal sustenta o eixo e permite sua rotação.',
      'The low-speed shaft transmits rotor torque to the gearbox. The bearing supports the shaft while allowing it to rotate.',
      'El eje lento transmite el par del rotor a la multiplicadora. El cojinete sostiene el eje y permite su rotación.')
  },
  gearbox: {
    title: T('Caixa multiplicadora', 'Gearbox', 'Caja multiplicadora'),
    text: T('Os pares de engrenagens elevam a rotação do eixo que aciona o gerador. Observe o sentido de giro das engrenagens vizinhas e a diferença de velocidade.',
      'Gear pairs increase the speed of the shaft that drives the generator. Observe the direction of neighboring gears and the difference in speed.',
      'Los pares de engranajes elevan la velocidad del eje que acciona el generador. Observa el sentido de giro de engranajes vecinos y la diferencia de velocidad.')
  },
  brake: {
    title: T('Eixo rápido e freio', 'High-speed shaft and brake', 'Eje rápido y freno'),
    text: T('O eixo rápido aciona o gerador. O freio de disco integra o sistema de parada e imobilização previsto no projeto do aerogerador.',
      'The high-speed shaft drives the generator. The disc brake is part of the turbine’s engineered stopping and holding system.',
      'El eje rápido acciona el generador. El freno de disco forma parte del sistema de parada e inmovilización previsto en el diseño.')
  },
  generator: {
    title: T('Gerador elétrico', 'Electrical generator', 'Generador eléctrico'),
    text: T('Converte potência mecânica em elétrica por indução eletromagnética. O corte expõe um rotor interno e os enrolamentos fixos do estator.',
      'It converts mechanical power to electrical power through electromagnetic induction. The cutaway exposes an inner rotor and stationary stator windings.',
      'Convierte potencia mecánica en eléctrica por inducción electromagnética. El corte expone un rotor interno y los devanados fijos del estátor.')
  },
  converter: {
    title: T('Conversor e cabos', 'Converter and cables', 'Convertidor y cables'),
    text: T('A eletrônica de potência condiciona a energia do gerador para conexão elétrica. Os cabos conduzem a energia pela torre.',
      'Power electronics condition generator output for electrical connection. Cables carry energy down the tower.',
      'La electrónica de potencia acondiciona la energía del generador para la conexión eléctrica. Los cables conducen la energía por la torre.')
  },
  yaw: {
    title: T('Orientação da nacele', 'Nacelle yaw', 'Orientación de la góndola'),
    text: T('O sistema de orientação gira a nacele em torno do eixo vertical da torre para alinhar o rotor ao vento. Use Demonstrar yaw para ver esse movimento.',
      'The yaw system turns the nacelle around the tower’s vertical axis to align the rotor with the wind. Use Demonstrate yaw to see this motion.',
      'El sistema de orientación gira la góndola en torno al eje vertical de la torre para alinear el rotor con el viento. Usa Demostrar yaw para ver el movimiento.')
  },
  sensors: {
    title: T('Anemômetro e sensor de direção', 'Anemometer and wind vane', 'Anemómetro y veleta'),
    text: T('O anemômetro mede a velocidade do vento. O sensor de direção indica de onde ele sopra. O controlador usa essas informações para orientar a nacele e supervisionar a operação.',
      'The anemometer measures wind speed. The wind vane measures direction. The controller uses these readings to orient the nacelle and supervise operation.',
      'El anemómetro mide la velocidad del viento. La veleta mide la dirección. El controlador usa esos datos para orientar la góndola y supervisar la operación.')
  },
  tower: {
    title: T('Torre e acesso', 'Tower and access', 'Torre y acceso'),
    text: T('A torre sustenta a nacele e eleva o rotor. O corte apresenta o acesso interno e a passagem de cabos até a base.',
      'The tower supports the nacelle and raises the rotor. The cutaway shows internal access and the cable route to the base.',
      'La torre sostiene la góndola y eleva el rotor. El corte muestra el acceso interno y el paso de cables hasta la base.')
  },
  nacelle: {
    title: T('Carcaça da nacele', 'Nacelle enclosure', 'Carcasa de la góndola'),
    text: T('Abriga os componentes de transmissão, geração e controle. A abertura lateral do modelo permite inspecionar o conjunto.',
      'It houses drivetrain, generation and control components. The side opening in the model allows inspection of the assembly.',
      'Aloja los componentes de transmisión, generación y control. La apertura lateral del modelo permite inspeccionar el conjunto.')
  }
};

function WindDiagram({part}: {part: WindPart}) {
  const color = (id: WindPart) => id === part ? '#9aff9a' : '#7eb3cf';
  return (
    <svg className="lab3d-diagram" viewBox="0 0 600 340" aria-hidden="true">
      <path d="M276 295H348L337 185H291Z" fill="#20394c" stroke={color('tower')} strokeWidth="3"/>
      <path d="M190 182H477Q501 182 501 158V112Q501 89 475 89H184"
        fill="#223c54" stroke={color('nacelle')} strokeWidth="4"/>
      <path d="M145 136V40M145 136L61 211M145 136L192 248" stroke={color('blades')} strokeWidth="14" strokeLinecap="round"/>
      <circle cx="145" cy="136" r="23" fill="#527d96" stroke={color('pitch')} strokeWidth="4"/>
      <path d="M169 136H254" stroke={color('shaft')} strokeWidth="10"/>
      <rect x="250" y="105" width="61" height="62" rx="7" fill="#9a7950" stroke={color('gearbox')} strokeWidth="3"/>
      <path d="M312 136H355" stroke={color('brake')} strokeWidth="7"/>
      <rect x="348" y="114" width="74" height="46" rx="9" fill="#356584" stroke={color('generator')} strokeWidth="3"/>
      <rect x="440" y="112" width="31" height="46" rx="4" fill="#254960" stroke={color('converter')} strokeWidth="3"/>
      <path d="M286 183H345V193H286Z" stroke={color('yaw')} fill="#63859d" strokeWidth="3"/>
      <path d="M456 89V63M443 63H469" stroke={color('sensors')} strokeWidth="3"/>
    </svg>
  );
}

function WindCurve({input, output}: {input: Parameters; output: number}) {
  const {t, lang} = useApp();
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const {cutIn, cutOut} = windSpeedLimits;
  const points = [0, cutIn - .0001, ...Array.from({length: (cutOut - cutIn) * 4}, (_, i) => cutIn + i / 4), cutOut - .0001, cutOut, 30]
    .map(speed => ({speed, power: calculate('wind', {...input, speed}).power}));
  const max = Math.max(1, ...points.map(({power}) => power));
  const x = (speed: number) => 45 + speed * 505 / 30;
  const y = (power: number) => 167 - 132 * power / max;

  return (
    <section className="lab3d-card" aria-labelledby="wind3d-curve-title">
      <span className="lab3d-kicker">{q('CURVA DIDÁTICA', 'TEACHING POWER CURVE', 'CURVA DIDÁCTICA')}</span>
      <h2 id="wind3d-curve-title">{q('Potência elétrica × velocidade do vento', 'Electrical power × wind speed', 'Potencia eléctrica × velocidad del viento')}</h2>
      <svg className="wind3d-curve" viewBox="0 0 580 205" role="img"
        aria-label={q('Curva eólica com o ponto de operação atual', 'Wind power curve with current operating point', 'Curva eólica con el punto de operación actual')}>
        <rect x={x(0)} y="30" width={x(cutIn) - x(0)} height="137" className="wind3d-off-region"/>
        <rect x={x(cutOut)} y="30" width={x(30) - x(cutOut)} height="137" className="wind3d-off-region"/>
        {[0, .5, 1].map(ratio => <g key={ratio}>
          <path d={'M45 ' + y(max * ratio) + 'H550'} className="wind3d-grid"/>
          <text x="39" y={y(max * ratio) + 4} textAnchor="end">{format(max * ratio, lang, max < 10 ? 1 : 0)}</text>
        </g>)}
        {[0, cutIn, 10, 15, 20, cutOut, 30].map(v => <text key={v} x={x(v)} y="185" textAnchor="middle">{v}</text>)}
        {[cutIn, cutOut].map(v => <path key={v} d={'M' + x(v) + ' 30V167'} className="wind3d-threshold"/>)}
        <text x="12" y="21">kW</text><text x="550" y="201" textAnchor="end">m/s</text>
        <polyline fill="none" stroke="var(--accent)" strokeWidth="3"
          points={points.map(({speed, power}) => x(speed) + ',' + y(power)).join(' ')}/>
        <circle cx={x(input.speed)} cy={y(output)} r="5" fill="#e3ad60" stroke="var(--paper)" strokeWidth="2"/>
      </svg>
      <p>{q('Partida em 3 m/s e parada a partir de 25 m/s neste modelo. O ponto amarelo acompanha o ajuste de velocidade.',
        'This model cuts in at 3 m/s and cuts out at 25 m/s. The yellow marker follows the speed setting.',
        'En este modelo el arranque es a 3 m/s y la parada a partir de 25 m/s. El punto amarillo sigue el ajuste de velocidad.')}</p>
    </section>
  );
}

export default function WindLab3D() {
  const {t, lang, values, updateValues, navigate, notify} = useApp();
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const input = values.wind;
  const result = calculate('wind', input);
  const {cutOut} = windSpeedLimits;
  const feathered = input.speed >= cutOut;
  const generating = result.power > 0;
  const shaft = result.stopped ? 0 : result.details.shaft ?? 0;

  const [view, setView] = useState<WindView>('cutaway');
  const [selection, setSelection] = useState<WindPart>('gearbox');
  const [showWind, setShowWind] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [yawDemo, setYawDemo] = useState(false);
  const [renderMode, setRenderMode] = useState<'loading' | '3d' | 'lightweight' | 'diagram'>('loading');
  const [fullscreen, setFullscreen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const viewer = useRef<ReturnType<typeof createWindViewer>>(null);
  const part = windPartVisible(selection, view) ? selection : 'gearbox';
  const canOrbit = renderMode === '3d' || renderMode === 'lightweight';
  const assembled = view !== 'exploded';
  const animate = canOrbit && assembled && input.speed > 0;

  useEffect(() => {
    if (!surface.current) return;
    try {
      const instance = createWindViewer(surface.current, setSelection, () => {
        setRenderMode('diagram');
        setView('cutaway');
        setPlaying(false);
      });
      viewer.current = instance;
      setRenderMode(instance.lightweight ? 'lightweight' : '3d');
      return () => {
        instance.dispose();
        viewer.current = null;
      };
    } catch {
      setRenderMode('diagram');
    }
  }, []);

  useEffect(() => {
    viewer.current?.setState({view, selected: part, speed: input.speed, generating, feathered, showWind, playing, yawDemo});
  }, [view, part, input.speed, generating, feathered, showWind, playing, yawDemo]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === panel.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === panel.current) await document.exitFullscreen();
      else await panel.current?.requestFullscreen();
    } catch {
      notify(q('Tela cheia indisponível neste navegador.', 'Fullscreen is unavailable in this browser.', 'Pantalla completa no disponible en este navegador.'));
    }
  }

  const n = (value: number, digits = 2) => format(value, lang, digits);
  const setParameter = (id: string, value: number) => updateValues('wind', {...input, [id]: value});
  const status = feathered
    ? q('Parada por vento forte · pás em bandeira', 'High-wind shutdown · blades feathered', 'Parada por viento fuerte · palas en bandera')
    : result.stopped
      ? q('Abaixo da velocidade de partida', 'Below cut-in speed', 'Por debajo de la velocidad de arranque')
      : result.limited
        ? q('Potência no limite nominal', 'Power at rated limit', 'Potencia en el límite nominal')
        : q('Geração na faixa de operação', 'Generating within operating range', 'Generación en el rango de operación');
  const powers = [
    {label: q('Vento na área varrida', 'Wind across the swept area', 'Viento en el área barrida'), value: result.resource, kind: 'wind'},
    {label: q('Captada no rotor', 'Captured at the rotor', 'Captada en el rotor'), value: shaft, kind: 'rotor'},
    {label: q('Elétrica entregue', 'Electrical output', 'Eléctrica entregada'), value: result.power, kind: 'output'}
  ];
  const rendererLabel = {
    loading: q('CARREGANDO MODELO', 'LOADING MODEL', 'CARGANDO MODELO'),
    '3d': q('MODELO 3D DIDÁTICO', 'EDUCATIONAL 3D MODEL', 'MODELO 3D DIDÁCTICO'),
    lightweight: q('MODELO 3D LEVE', 'LIGHTWEIGHT 3D MODEL', 'MODELO 3D LIGERO'),
    diagram: q('ESQUEMA DIDÁTICO', 'EDUCATIONAL DIAGRAM', 'ESQUEMA DIDÁCTICO')
  };

  return (
    <section className="lab3d wind3d">
      <Heading eyebrow={T('LABORATÓRIO 3D  /  ENERGIA EÓLICA', '3D LAB  /  WIND ENERGY', 'LABORATORIO 3D  /  ENERGÍA EÓLICA')}
        title={T('Aerogerador de eixo horizontal', 'Horizontal-axis wind turbine', 'Aerogenerador de eje horizontal')}
        description={T('Explore uma nacele em corte e siga a conversão da energia do vento, das pás ao conversor.',
          'Explore a cutaway nacelle and follow wind energy conversion from the blades to the converter.',
          'Explora una góndola en corte y sigue la conversión de la energía del viento desde las palas hasta el convertidor.')}/>
      <div className="lab3d-layout">
        <div className="lab3d-workbench">
          <div className="lab3d-viewer" ref={panel}>
            <div className="lab3d-toolbar">
              {renderMode !== 'diagram' && <div className="lab3d-modes" role="group" aria-label={q('Vista do aerogerador', 'Turbine view', 'Vista del aerogenerador')}>
                {viewIds.map(id => <button type="button" key={id} aria-pressed={view === id}
                  onClick={() => {setView(id); if (id === 'exploded') setPlaying(false);}}>{t(views[id])}</button>)}
              </div>}
              <div className="lab3d-tools">
                {canOrbit && <>
                  <button type="button" aria-label={q('Aproximar aerogerador', 'Zoom in', 'Acercar aerogenerador')} onClick={() => viewer.current?.zoom(1.2)}>+</button>
                  <button type="button" aria-label={q('Afastar aerogerador', 'Zoom out', 'Alejar aerogenerador')} onClick={() => viewer.current?.zoom(1 / 1.2)}>−</button>
                  <button type="button" aria-label={q('Restaurar câmera', 'Reset camera', 'Restablecer cámara')} onClick={() => viewer.current?.reset()}><Icon name="reset"/></button>
                </>}
                {document.fullscreenEnabled && <button type="button" aria-pressed={fullscreen}
                  aria-label={q('Tela cheia', 'Fullscreen', 'Pantalla completa')} onClick={() => void toggleFullscreen()}><Icon name="zoom"/></button>}
              </div>
            </div>
            <div className="lab3d-stage wind3d-stage" role="group"
              aria-label={q('Modelo do aerogerador de eixo horizontal', 'Horizontal-axis wind turbine model', 'Modelo del aerogenerador de eje horizontal')}
              aria-describedby="wind3d-help" tabIndex={canOrbit ? 0 : undefined}
              onKeyDown={event => handleLabCameraKey(event, canOrbit ? viewer.current : null)}>
              <div ref={surface} className="lab3d-surface" hidden={renderMode === 'diagram'} aria-hidden="true"/>
              {renderMode === 'diagram' && <WindDiagram part={part}/>}
              <span className="lab3d-stage-label"><span className="lab3d-indicator"/>{rendererLabel[renderMode]}</span>
              <span className="wind3d-stage-part">{t(parts[part].title)}</span>
            </div>
            {canOrbit && <div className="wind3d-view-actions">
              <button type="button" disabled={!assembled} aria-pressed={showWind && assembled} onClick={() => setShowWind(value => !value)}>
                <Icon name="wind"/>{q('Direção do vento', 'Wind direction', 'Dirección del viento')}
              </button>
              <button type="button" disabled={!animate} aria-pressed={playing && animate} onClick={() => setPlaying(value => !value)}>
                <span aria-hidden="true">{playing && animate ? 'Ⅱ' : '▶'}</span>
                {playing && animate ? q('Pausar movimento', 'Pause motion', 'Pausar movimiento') : q('Animar operação', 'Animate operation', 'Animar operación')}
              </button>
              <button type="button" disabled={!assembled} aria-pressed={yawDemo && assembled}
                onClick={() => {setYawDemo(value => !value); setSelection('yaw');}}>
                <Icon name="reset"/>{q('Demonstrar yaw', 'Demonstrate yaw', 'Demostrar yaw')}
              </button>
            </div>}
            <p className="lab3d-help" id="wind3d-help">{yawDemo && assembled
              ? q('O yaw gira a nacele em torno da torre. A curva de potência usa vento alinhado ao rotor.',
                'Yaw turns the nacelle around the tower. The power curve assumes wind aligned with the rotor.',
                'El yaw gira la góndola alrededor de la torre. La curva de potencia supone viento alineado al rotor.')
              : canOrbit
                ? q('Arraste para girar e use roda ou pinça para ampliar. Selecione uma peça. Pelo teclado, use setas e +/−.',
                  'Drag to rotate and scroll or pinch to zoom. Select a part. On a keyboard, use arrows and +/−.',
                  'Arrastra para girar y usa la rueda o pellizco para ampliar. Selecciona una pieza. Con teclado usa flechas y +/−.')
                : q('Selecione uma peça na lista para explorar a unidade.', 'Select a part from the list to explore the unit.', 'Selecciona una pieza de la lista para explorar la unidad.')}</p>
          </div>

          <section className="lab3d-card wind3d-parts" aria-labelledby="wind3d-parts">
            <h2 id="wind3d-parts">{q('Componentes do aerogerador', 'Wind turbine components', 'Componentes del aerogenerador')}</h2>
            <div className="lab3d-parts">
              {windParts.map((id, i) => windPartVisible(id, view) &&
                <button type="button" key={id} aria-pressed={part === id} aria-controls="wind3d-part-detail" onClick={() => setSelection(id)}>
                  <span>{String(i + 1).padStart(2, '0')}</span>{t(parts[id].title)}
                </button>)}
            </div>
            <div className="lab3d-part-detail" id="wind3d-part-detail" aria-live="polite">
              <strong>{t(parts[part].title)}</strong><p>{t(parts[part].text)}</p>
            </div>
          </section>
        </div>

        <div className="lab3d-side">
          <section className="lab3d-card" aria-labelledby="wind3d-controls">
            <span className="lab3d-kicker">{q('CONDIÇÕES DO ENSAIO', 'TEST CONDITIONS', 'CONDICIONES DEL ENSAYO')}</span>
            <h2 id="wind3d-controls">{q('Ajustar operação', 'Set operating conditions', 'Ajustar operación')}</h2>
            <div className="lab3d-inputs wind3d-inputs">
              {['speed', 'diameter'].map(id => <LabParameterField key={id} id={id} value={input[id]} onValue={value => setParameter(id, value)}/>)}
            </div>
            <div className="wind3d-presets" role="group" aria-label={q('Velocidades de ensaio', 'Test wind speeds', 'Velocidades de ensayo')}>
              {[2, 8, 14, 25].map(speed => <button key={speed} type="button" aria-pressed={input.speed === speed}
                onClick={() => setParameter('speed', speed)}>{speed} m/s</button>)}
            </div>
            <div className="wind3d-net">
              <span>{q('Área varrida', 'Swept area', 'Área barrida')}</span><strong>{n(result.details.area ?? 0)} m²</strong>
            </div>
            <details className="wind3d-details">
              <summary>{q('Densidade, rendimento e potência nominal', 'Density, efficiency and rated power', 'Densidad, rendimiento y potencia nominal')}</summary>
              <div className="lab3d-inputs wind3d-inputs">
                {['rhoAir', 'cp', 'etaDrive', 'ratedWind', 'hours'].map(id => <LabParameterField key={id} id={id} value={input[id]}
                  onValue={value => setParameter(id, value)} slider={false}/>)}
              </div>
            </details>
            <button type="button" className="wind3d-reset" onClick={() => {
              updateValues('wind', defaultsFor('wind'));
              setPlaying(false);
              setYawDemo(false);
            }}><Icon name="reset"/>{q('Restaurar cenário inicial', 'Restore initial scenario', 'Restaurar escenario inicial')}</button>
          </section>

          <section className="lab3d-card" aria-labelledby="wind3d-power">
            <span className="lab3d-kicker">{q('CONVERSÃO DE ENERGIA', 'ENERGY CONVERSION', 'CONVERSIÓN DE ENERGÍA')}</span>
            <h2 id="wind3d-power">{q('Balanço de potência', 'Power balance', 'Balance de potencia')}</h2>
            <p className="wind3d-status" data-stopped={result.stopped} role="status">{status}</p>
            <dl className="lab3d-metrics wind3d-powers">
              {powers.map(({label, value, kind}) => <div key={kind} data-power={kind}>
                <dt>{label}</dt><dd>{n(value)} <small>kW</small></dd>
                <div className="lab3d-meter" aria-hidden="true"><span style={{width: result.resource > 0 ? (100 * value / result.resource) + '%' : '0%'}}/></div>
              </div>)}
            </dl>
            <div className="wind3d-net wind3d-energy">
              <span>{q('Energia em', 'Energy in', 'Energía en')} {n(input.hours, 1)} h</span><strong>{n(result.energy)} kWh</strong>
            </div>
            <Button className="wind3d-simulator" icon="flask" onClick={() => navigate('sim', 'wind')}>
              {q('Abrir simulador eólico', 'Open wind simulator', 'Abrir simulador eólico')}
            </Button>
          </section>
        </div>
      </div>

      <div className="wind3d-lower">
        <WindCurve input={input} output={result.power}/>
        <section className="lab3d-card wind3d-lesson" aria-labelledby="wind3d-lesson">
          <span className="lab3d-kicker">{q('ROTEIRO DE AULA', 'LESSON GUIDE', 'GUÍA DE CLASE')}</span>
          <h2 id="wind3d-lesson">{q('Do vento fraco à parada por proteção', 'From low wind to protective shutdown', 'Del viento débil a la parada de protección')}</h2>
          <ol>
            <li>{q('Restaure o cenário inicial e compare 8 e 10 m/s. Mantenha o diâmetro e os demais parâmetros.',
              'Restore the initial scenario and compare 8 and 10 m/s. Keep diameter and other parameters fixed.',
              'Restaura el escenario inicial y compara 8 y 10 m/s. Mantén el diámetro y los demás parámetros.')}</li>
            <li>{q('Compare 14 e 25 m/s com a animação ligada. Observe a potência elétrica, a posição das pás e o movimento do anemômetro.',
              'Compare 14 and 25 m/s with animation on. Observe electrical power, blade position and anemometer motion.',
              'Compara 14 y 25 m/s con animación activa. Observa la potencia eléctrica, la posición de las palas y el movimiento del anemómetro.')}</li>
          </ol>
          <details className="wind3d-details">
            <summary>{q('Memória de cálculo', 'Calculation notes', 'Memoria de cálculo')}</summary>
            <p>A = πD²/4 · P<sub>vento</sub> = ½ρAv³ / {n(1000, 0)}</p>
            <p>P<sub>rotor</sub> = P<sub>vento</sub> × C<sub>p</sub> · P<sub>e</sub> = min(P<sub>rotor</sub> × η, P<sub>nom</sub>)</p>
            <p>{q('Use D em m, v em m/s, ρ em kg/m³ e η em fração. A potência fica em kW. Fora da faixa de operação, a saída elétrica é zero.',
              'Use D in m, v in m/s, ρ in kg/m³ and η as a fraction. Power is in kW. Outside the operating range, electrical output is zero.',
              'Usa D en m, v en m/s, ρ en kg/m³ y η como fracción. La potencia queda en kW. Fuera del rango de operación, la salida eléctrica es cero.')}</p>
          </details>
          <p>{q('Geometria, passo e velocidade de giro ilustrativos. O diâmetro ajustado alimenta o cálculo. Os ajustes são compartilhados com o simulador eólico.',
            'Illustrative geometry, pitch and rotation. The adjusted diameter feeds the calculation. Settings are shared with the wind simulator.',
            'Geometría, paso y giro ilustrativos. El diámetro ajustado alimenta el cálculo. Los ajustes se comparten con el simulador eólico.')}</p>
          <a href="https://www.energy.gov/cmei/systems/explore-wind-turbine-text-version" target="_blank" rel="noreferrer">
            {q('Componentes do aerogerador · U.S. DOE', 'Wind turbine components · U.S. DOE', 'Componentes del aerogenerador · U.S. DOE')}<Icon name="external"/>
          </a>
          <a href="https://www.epe.gov.br/pt/abcdenergia/fontes-de-energia" target="_blank" rel="noreferrer">
            {q('Energia eólica · EPE', 'Wind energy · EPE', 'Energía eólica · EPE')}<Icon name="external"/>
          </a>
        </section>
      </div>
    </section>
  );
}
