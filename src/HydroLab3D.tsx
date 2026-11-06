import React, {useEffect, useRef, useState} from 'react';
import {Button, Heading, Icon} from './components';
import {calculate, defaultsFor} from './energy';
import {format, T} from './model';
import {LabParameterField} from './LabParameterField';
import {handleLabCameraKey} from './lab-viewer';
import {useApp} from './store';
import {createHydroViewer} from './hydro-viewer';
import type {HydroPart, HydroView} from './hydro-viewer';

const views = {
  plant: T('Casa de força', 'Powerhouse', 'Casa de máquinas'),
  machine: T('Conjunto em corte', 'Unit cutaway', 'Conjunto en corte'),
  exploded: T('Vista explodida', 'Exploded view', 'Vista explosionada')
};
const viewIds = ['plant', 'machine', 'exploded'] as const;
const waterRoute = ['penstock', 'spiral', 'gates', 'runner', 'draft'] as const;
const machineParts = ['shaft', 'rotor', 'stator'] as const;

const parts = {
  penstock: {
    title: T('Conduto forçado', 'Penstock', 'Conducto forzado'),
    text: T('Conduz a água pressurizada até a turbina. As perdas hidráulicas no percurso reduzem a queda disponível na máquina.',
      'It carries pressurized water to the turbine. Hydraulic losses along the way reduce the head available at the unit.',
      'Conduce el agua presurizada hasta la turbina. Las pérdidas hidráulicas del recorrido reducen la altura disponible en la máquina.')
  },
  spiral: {
    title: T('Caixa espiral', 'Spiral case', 'Cámara espiral'),
    text: T('Recebe água do conduto e a distribui ao redor da turbina. Sua seção diminui à medida que o fluxo entra no distribuidor.',
      'It receives water from the penstock and distributes it around the turbine. Its section decreases as water enters the distributor.',
      'Recibe agua del conducto y la distribuye alrededor de la turbina. Su sección disminuye a medida que el flujo entra al distribuidor.')
  },
  gates: {
    title: T('Distribuidor', 'Wicket gates', 'Distribuidor'),
    text: T('As palhetas diretrizes orientam a entrada de água e regulam a vazão que passa pelo rotor.',
      'The adjustable wicket gates direct the incoming water and regulate flow through the runner.',
      'Los álabes directrices orientan la entrada de agua y regulan el caudal que atraviesa el rodete.')
  },
  runner: {
    title: T('Rotor Francis', 'Francis runner', 'Rodete Francis'),
    text: T('A água entra pelo contorno, transfere energia às pás fixas do rotor e sai na direção do eixo. A força sobre as pás produz torque.',
      'Water enters around the perimeter, transfers energy to the fixed runner blades and leaves along the axis. The force on the blades produces torque.',
      'El agua entra por el contorno, transfiere energía a los álabes fijos del rodete y sale en dirección axial. La fuerza sobre los álabes produce par.')
  },
  shaft: {
    title: T('Eixo vertical', 'Vertical shaft', 'Eje vertical'),
    text: T('Transmite o torque da turbina ao rotor do gerador. Os mancais sustentam e guiam o conjunto girante.',
      'It transfers turbine torque to the generator rotor. Bearings support and guide the rotating assembly.',
      'Transmite el par de la turbina al rotor del generador. Los cojinetes soportan y guían el conjunto giratorio.')
  },
  rotor: {
    title: T('Rotor do gerador', 'Generator rotor', 'Rotor del generador'),
    text: T('O rotor de polos salientes gira com o eixo. Seu campo magnético atravessa o entreferro e varia em relação aos enrolamentos fixos.',
      'The salient-pole rotor turns with the shaft. Its magnetic field crosses the air gap and varies relative to the fixed windings.',
      'El rotor de polos salientes gira con el eje. Su campo magnético atraviesa el entrehierro y varía con respecto a los devanados fijos.')
  },
  stator: {
    title: T('Estator', 'Stator', 'Estátor'),
    text: T('Os enrolamentos permanecem fixos. O campo magnético girante induz tensão alternada nesses enrolamentos.',
      'Its windings remain stationary. The rotating magnetic field induces alternating voltage in them.',
      'Sus devanados permanecen fijos. El campo magnético giratorio induce tensión alterna en ellos.')
  },
  draft: {
    title: T('Tubo de sucção', 'Draft tube', 'Tubo de aspiración'),
    text: T('Conduz a água da saída do rotor ao canal de fuga. A expansão reduz a velocidade e permite recuperar parte da energia cinética como pressão.',
      'It carries water from the runner to the tailrace. Expansion reduces velocity and recovers part of the kinetic energy as pressure.',
      'Conduce el agua desde la salida del rodete al canal de descarga. La expansión reduce la velocidad y recupera parte de la energía cinética como presión.')
  },
  powerhouse: {
    title: T('Galerias e ponte rolante', 'Galleries and overhead crane', 'Galerías y puente grúa'),
    text: T('A estrutura abriga a unidade e dá acesso aos equipamentos. A ponte rolante movimenta componentes nas atividades de montagem e manutenção.',
      'The structure houses the unit and gives access to equipment. The overhead crane moves components during assembly and maintenance.',
      'La estructura alberga la unidad y da acceso a los equipos. El puente grúa mueve componentes durante el montaje y el mantenimiento.')
  }
};

function HydroSchematic({selected, showFlow}: {selected: HydroPart; showFlow: boolean}) {
  const color = (id: HydroPart) => id === selected ? '#80ee97' : '#6699ba';
  return (
    <svg className="lab3d-diagram hydro3d-schematic" viewBox="0 0 580 350" aria-hidden="true">
      <path d="M292 214V273Q292 300 328 300H527"
        fill="none" stroke={color('draft')} strokeWidth="32" strokeLinecap="round"/>
      <path d="M42 103 130 205H247" fill="none" stroke={color('penstock')} strokeWidth="24" strokeLinecap="round"/>
      <rect x="216" y="41" width="148" height="67" rx="14" fill="#264258" stroke={color('stator')} strokeWidth="4"/>
      <rect x="239" y="54" width="102" height="41" rx="9" fill="#be8b52" stroke={color('rotor')} strokeWidth="3"/>
      <path d="M290 79V201" stroke={color('shaft')} strokeWidth="14"/>
      <path d="M216 182H366V215H216Z" fill="#244a66" stroke={color('spiral')} strokeWidth="4"/>
      <path d="M231 187H257M322 187H351" stroke={color('gates')} strokeWidth="9"/>
      <path d="M254 192H326L308 236H272Z" fill="#39799e" stroke={color('runner')} strokeWidth="4"/>
      {showFlow && <path d="M43 103 130 205H275Q292 205 292 225V271Q292 300 328 300H524"
        stroke="#7be3ff" fill="none" strokeWidth="4" strokeDasharray="7 5"/>}
    </svg>
  );
}

export default function HydroLab3D() {
  const {t, lang, values, updateValues, navigate, notify} = useApp();
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const input = values.hydro;
  const result = calculate('hydro', input);
  const netHead = result.details.netHead ?? 0;
  const shaft = result.details.shaft ?? 0;
  const hasFlow = netHead > 0 && input.flow > 0;

  const [view, setView] = useState<HydroView>('plant');
  const [selection, setSelection] = useState<HydroPart>('runner');
  const [flowVisible, setFlowVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [renderMode, setRenderMode] = useState<'loading' | '3d' | 'lightweight' | 'diagram'>('loading');
  const [fullscreen, setFullscreen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const viewer = useRef<ReturnType<typeof createHydroViewer>>(null);
  const part = selection === 'powerhouse' && view !== 'plant' ? 'runner' : selection;
  const canOrbit = renderMode === '3d' || renderMode === 'lightweight';
  const canAnimate = canOrbit && hasFlow && view !== 'exploded';
  const showFlow = flowVisible && view !== 'exploded';

  useEffect(() => {
    if (!surface.current) return;
    try {
      const instance = createHydroViewer(surface.current, setSelection, () => {
        setRenderMode('diagram');
        setView('plant');
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
    viewer.current?.setState({
      view, selected: part, flowVisible, playing, hasFlow, hasShaftPower: shaft > 0, flow: input.flow
    });
  }, [view, part, flowVisible, playing, hasFlow, shaft, input.flow]);

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

  const numbers = (n: number, digits = 2) => format(n, lang, digits);
  const powers = [
    {label: q('Hidráulica disponível', 'Available hydraulic', 'Hidráulica disponible'), value: result.resource, type: 'water'},
    {label: q('Mecânica no eixo', 'Mechanical at shaft', 'Mecánica en el eje'), value: shaft, type: 'shaft'},
    {label: q('Elétrica entregue', 'Electrical output', 'Eléctrica entregada'), value: result.power, type: 'output'}
  ];
  const renderLabel = {
    loading: q('CARREGANDO MODELO', 'LOADING MODEL', 'CARGANDO MODELO'),
    '3d': q('MODELO 3D DIDÁTICO', 'EDUCATIONAL 3D MODEL', 'MODELO 3D DIDÁCTICO'),
    lightweight: q('MODELO 3D LEVE', 'LIGHTWEIGHT 3D MODEL', 'MODELO 3D LIGERO'),
    diagram: q('ESQUEMA DIDÁTICO', 'EDUCATIONAL DIAGRAM', 'ESQUEMA DIDÁCTICO')
  };
  const adjustable = ['etaTurb', 'etaGen', 'ratedHydro', 'hours'];
  const setParameter = (id: string, value: number) => updateValues('hydro', {...input, [id]: value});

  function partButton(id: HydroPart, number: number) {
    return <button key={id} type="button" aria-pressed={part === id} aria-controls="hydro3d-part-detail"
      onClick={() => setSelection(id)}><span>{String(number).padStart(2, '0')}</span>{t(parts[id].title)}</button>;
  }

  return (
    <section className="lab3d hydro3d">
      <Heading eyebrow={T('LABORATÓRIO 3D  /  HIDRELETRICIDADE', '3D LAB  /  HYDROPOWER', 'LABORATORIO 3D  /  HIDROELECTRICIDAD')}
        title={T('Casa de força hidrelétrica', 'Hydroelectric powerhouse', 'Casa de máquinas hidroeléctrica')}
        description={T('Percorra o caminho da água e acompanhe a conversão de energia em uma unidade Francis de eixo vertical.',
          'Follow the water path and trace energy conversion in a vertical-axis Francis unit.',
          'Recorre el camino del agua y sigue la conversión de energía en una unidad Francis de eje vertical.')}/>
      <div className="lab3d-layout">
        <div className="lab3d-workbench">
          <div className="lab3d-viewer" ref={panel}>
            <div className="lab3d-toolbar">
              {renderMode !== 'diagram' && <div className="lab3d-modes" role="group" aria-label={q('Vista da hidrelétrica', 'Hydropower view', 'Vista de la central')}>
                {viewIds.map(id => <button key={id} type="button" aria-pressed={view === id}
                  onClick={() => {setView(id); if (id === 'exploded') setPlaying(false);}}>{t(views[id])}</button>)}
              </div>}
              <div className="lab3d-tools">
                {canOrbit && <>
                  <button type="button" aria-label={q('Aproximar hidrelétrica', 'Zoom in', 'Acercar central')} onClick={() => viewer.current?.zoom(1.2)}>+</button>
                  <button type="button" aria-label={q('Afastar hidrelétrica', 'Zoom out', 'Alejar central')} onClick={() => viewer.current?.zoom(1 / 1.2)}>−</button>
                  <button type="button" aria-label={q('Restaurar câmera', 'Reset camera', 'Restablecer cámara')} onClick={() => viewer.current?.reset()}><Icon name="reset"/></button>
                </>}
                {document.fullscreenEnabled && <button type="button" aria-pressed={fullscreen}
                  aria-label={q('Tela cheia', 'Fullscreen', 'Pantalla completa')} onClick={() => void toggleFullscreen()}><Icon name="zoom"/></button>}
              </div>
            </div>
            <div className="lab3d-stage hydro3d-stage" role="group"
              aria-label={q('Modelo da unidade geradora Francis', 'Francis generating unit model', 'Modelo de la unidad generadora Francis')}
              aria-describedby="hydro3d-help" tabIndex={canOrbit ? 0 : undefined} onKeyDown={event => handleLabCameraKey(event, canOrbit ? viewer.current : null)}>
              <div ref={surface} className="lab3d-surface" aria-hidden="true" hidden={renderMode === 'diagram'}/>
              {renderMode === 'diagram' && <HydroSchematic selected={part} showFlow={showFlow}/>}
              <span className="lab3d-stage-label"><span className="lab3d-indicator"/>{renderLabel[renderMode]}</span>
              <span className="hydro3d-stage-part">{t(parts[part].title)}</span>
            </div>
            <div className="hydro3d-view-actions">
              <button type="button" disabled={view === 'exploded'} aria-pressed={showFlow} onClick={() => setFlowVisible(value => !value)}>
                <Icon name="waves"/>{q('Trajeto da água', 'Water path', 'Recorrido del agua')}
              </button>
              <button type="button" disabled={!canAnimate} aria-pressed={playing && canAnimate} onClick={() => setPlaying(value => !value)}>
                <span aria-hidden="true">{playing && canAnimate ? 'Ⅱ' : '▶'}</span>
                {playing && canAnimate ? q('Pausar animação', 'Pause animation', 'Pausar animación')
                  : q('Animar fluxo e rotação', 'Animate flow and rotation', 'Animar flujo y rotación')}
              </button>
            </div>
            <p className="lab3d-help" id="hydro3d-help">{canOrbit
              ? q('Arraste para girar. Use roda ou pinça para ampliar. Selecione uma peça. Pelo teclado, use setas e +/−.',
                'Drag to rotate. Scroll or pinch to zoom. Select a part. With a keyboard use arrows and +/−.',
                'Arrastra para girar. Usa la rueda o pellizca para ampliar. Selecciona una pieza. Con teclado, usa flechas y +/−.')
              : q('Selecione as peças na lista para explorar a unidade.', 'Select parts from the list to explore the unit.', 'Selecciona las piezas de la lista para explorar la unidad.')}</p>
          </div>

          <section className="lab3d-card hydro3d-parts" aria-labelledby="hydro3d-parts-title">
            <h2 id="hydro3d-parts-title">{q('Caminho da água', 'Water path', 'Camino del agua')}</h2>
            <div className="lab3d-parts hydro3d-route">{waterRoute.map((id, index) => partButton(id, index + 1))}</div>
            <h3>{q('Conjunto eletromecânico e estrutura', 'Electromechanical unit and structure', 'Conjunto electromecánico y estructura')}</h3>
            <div className="lab3d-parts">
              {machineParts.map((id, index) => partButton(id, index + 6))}
              {view === 'plant' && partButton('powerhouse', 9)}
            </div>
            <div className="lab3d-part-detail" id="hydro3d-part-detail" aria-live="polite">
              <strong>{t(parts[part].title)}</strong><p>{t(parts[part].text)}</p>
            </div>
          </section>
        </div>

        <div className="lab3d-side">
          <section className="lab3d-card" aria-labelledby="hydro3d-controls">
            <span className="lab3d-kicker">{q('CONDIÇÕES HIDRÁULICAS', 'HYDRAULIC CONDITIONS', 'CONDICIONES HIDRÁULICAS')}</span>
            <h2 id="hydro3d-controls">{q('Ajustar operação', 'Set operating conditions', 'Ajustar operación')}</h2>
            <div className="lab3d-inputs hydro3d-inputs">
              {['flow', 'head', 'lossHead'].map(id => <LabParameterField key={id} id={id} value={input[id]} onValue={value => setParameter(id, value)}/>)}
            </div>
            <div className="hydro3d-net">
              <span>{q('Queda líquida', 'Net head', 'Altura neta')}</span>
              <strong>{numbers(netHead)} m</strong>
            </div>
            <details className="hydro3d-details">
              <summary>{q('Rendimentos e limite da unidade', 'Unit efficiencies and limit', 'Rendimientos y límite de la unidad')}</summary>
              <div className="lab3d-inputs hydro3d-inputs">
                {adjustable.map(id => <LabParameterField key={id} id={id} value={input[id]} onValue={value => setParameter(id, value)} slider={false}/>)}
              </div>
            </details>
            <button type="button" className="hydro3d-reset" onClick={() => {
              setPlaying(false);
              updateValues('hydro', defaultsFor('hydro'));
            }}><Icon name="reset"/>{q('Restaurar cenário inicial', 'Restore initial scenario', 'Restaurar escenario inicial')}</button>
          </section>

          <section className="lab3d-card" aria-labelledby="hydro3d-balance">
            <span className="lab3d-kicker">{q('CONVERSÃO DE ENERGIA', 'ENERGY CONVERSION', 'CONVERSIÓN DE ENERGÍA')}</span>
            <h2 id="hydro3d-balance">{q('Balanço de potência', 'Power balance', 'Balance de potencia')}</h2>
            <dl className="lab3d-metrics hydro3d-powers">
              {powers.map(({label, value, type}) => <div key={type} data-power={type}>
                <dt>{label}</dt><dd>{numbers(value)} <small>kW</small></dd>
                <div className="lab3d-meter" aria-hidden="true">
                  <span style={{width: result.resource > 0 ? (100 * value / result.resource) + '%' : '0%'}}/>
                </div>
              </div>)}
            </dl>
            <div className="hydro3d-net hydro3d-energy">
              <span>{q('Energia em', 'Energy in', 'Energía en')} {numbers(input.hours, 1)} h</span>
              <strong>{numbers(result.energy)} kWh</strong>
            </div>
            {!hasFlow && <p className="hydro3d-notice" role="status">{netHead === 0
              ? q('A queda líquida disponível é zero.', 'Available net head is zero.', 'La altura neta disponible es cero.')
              : q('A vazão turbinada está em zero.', 'Turbine flow is zero.', 'El caudal turbinado está en cero.')}</p>}
            {result.limited && <p className="hydro3d-notice" role="status">
              {q('Saída no limite configurado. Potência elétrica estimada antes do limite:',
                'Output is at the configured limit. Estimated electrical power before the limit:',
                'Salida en el límite configurado. Potencia eléctrica estimada antes del límite:')} {numbers(result.gross)} kW.
            </p>}
            <Button className="hydro3d-full" icon="flask" onClick={() => navigate('sim', 'hydro')}>
              {q('Abrir simulador hidrelétrico', 'Open hydropower simulator', 'Abrir simulador hidroeléctrico')}
            </Button>
          </section>
        </div>
      </div>

      <div className="hydro3d-lower">
        <section className="lab3d-card" aria-labelledby="hydro3d-formula">
          <span className="lab3d-kicker">{q('MEMÓRIA DE CÁLCULO', 'CALCULATION NOTES', 'MEMORIA DE CÁLCULO')}</span>
          <h2 id="hydro3d-formula">{q('Da queda à energia elétrica', 'From head to electrical energy', 'De la altura a la energía eléctrica')}</h2>
          <dl className="hydro3d-formulas">
            <div><dt>H<sub>{q('líq', 'net', 'neta')}</sub> = max(0, H<sub>{q('bruta', 'gross', 'bruta')}</sub> − h<sub>{q('perdas', 'loss', 'pérdidas')}</sub>)</dt><dd>{numbers(netHead)} m</dd></div>
            <div><dt>P<sub>h</sub> = ρ × g × Q × H<sub>{q('líq', 'net', 'neta')}</sub> / {numbers(1000, 0)}</dt><dd>{numbers(result.resource)} kW</dd></div>
            <div><dt>P<sub>e</sub> = min(P<sub>h</sub> × η<sub>t</sub> × η<sub>g</sub>, P<sub>nom</sub>)</dt><dd>{numbers(result.power)} kW</dd></div>
            <div><dt>E = P<sub>e</sub> × t</dt><dd>{numbers(result.energy)} kWh</dd></div>
          </dl>
          <p>{q('Q em m³/s, H em m, ρ = 1.000 kg/m³, g = 9,81 m/s² e rendimentos em fração. A animação é ilustrativa. Os ajustes são compartilhados com o simulador hidrelétrico.',
            'Q in m³/s, H in m, ρ = 1,000 kg/m³, g = 9.81 m/s², efficiencies as fractions. Motion is illustrative. Settings are shared with the hydropower simulator.',
            'Q en m³/s, H en m, ρ = 1.000 kg/m³, g = 9,81 m/s² y rendimientos en fracción. La animación es ilustrativa. Los ajustes se comparten con el simulador hidroeléctrico.')}</p>
        </section>
        <section className="lab3d-card hydro3d-lesson" aria-labelledby="hydro3d-lesson">
          <span className="lab3d-kicker">{q('ROTEIRO DE AULA', 'LESSON GUIDE', 'GUÍA DE CLASE')}</span>
          <h2 id="hydro3d-lesson">{q('Vazão e limite de geração', 'Flow and generation limit', 'Caudal y límite de generación')}</h2>
          <ol>
            <li>{q('Restaure o cenário inicial. Com queda bruta de 20 m e perda de 2 m, registre a potência para 0,50 m³/s.',
              'Restore the initial scenario. At 20 m gross head and 2 m loss, record power at 0.50 m³/s.',
              'Restaura el escenario inicial. Con altura bruta de 20 m y pérdida de 2 m, registra la potencia para 0,50 m³/s.')}</li>
            <li>{q('Aumente a vazão para 1,00 m³/s. Compare a potência hidráulica com a potência elétrica entregue. Depois, ajuste a perda para 20 m.',
              'Raise flow to 1.00 m³/s. Compare hydraulic power with electrical output. Then set losses to 20 m.',
              'Aumenta el caudal a 1,00 m³/s. Compara la potencia hidráulica con la potencia eléctrica entregada. Luego ajusta la pérdida a 20 m.')}</li>
          </ol>
          <details className="hydro3d-details">
            <summary>{q('Conferir o resultado', 'Check the result', 'Comprobar el resultado')}</summary>
            <p>{q('A saída passa de 71,29 kW para o limite de 100 kW. Ao igualar perda e queda bruta, a queda líquida e a potência vão a zero.',
              'Output rises from 71.29 kW to the 100 kW limit. With losses equal to gross head, net head and power fall to zero.',
              'La salida pasa de 71,29 kW al límite de 100 kW. Al igualar pérdida y altura bruta, la altura neta y la potencia llegan a cero.')}</p>
          </details>
          <a href="https://www.itaipu.gov.br/sites/default/files/af_df/2202_023_revista_aspectos_tecnicos_bizuarios_018.pdf" target="_blank" rel="noreferrer">
            {q('Unidade geradora · Itaipu Binacional', 'Generating unit · Itaipu Binacional', 'Unidad generadora · Itaipu Binacional')}<Icon name="external"/>
          </a>
          <a href="https://www.energy.gov/cmei/water/types-hydropower-turbines" target="_blank" rel="noreferrer">
            {q('Turbinas hidráulicas · U.S. DOE', 'Hydropower turbines · U.S. DOE', 'Turbinas hidráulicas · U.S. DOE')}<Icon name="external"/>
          </a>
        </section>
      </div>
    </section>
  );
}
