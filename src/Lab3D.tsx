import React, {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';
import {Button, Heading, Icon} from './components';
import {calculate} from './energy';
import {fields, format, T} from './model';
import RenewableBench3D from './RenewableBench3D';
import SolarShadingLab from './SolarShadingLab';
import HydroLab3D from './HydroLab3D';
import WindLab3D from './WindLab3D';
import BiomassPlant3D from './BiomassPlant3D';
import {useApp} from './store';
import {createTurbineViewer, partIds} from './turbine-viewer';
import type {PartId} from './turbine-viewer';

const components = {
  casing: {
    name: T('Carcaça da turbina', 'Turbine casing', 'Carcasa de la turbina'),
    text: T('A carcaça contém o vapor. Os bocais e as pás fixas orientam o escoamento para as pás móveis.',
      'The casing contains the steam. Nozzles and stationary blades direct the flow onto the moving blades.',
      'La carcasa contiene el vapor. Las toberas y los álabes fijos orientan el flujo hacia los álabes móviles.')
  },
  turbine: {
    name: T('Rotor da turbina', 'Turbine rotor', 'Rotor de la turbina'),
    text: T('O vapor se expande pelos estágios. A força sobre as pás móveis gera torque no eixo.',
      'Steam expands through the stages. The force on the moving blades produces shaft torque.',
      'El vapor se expande por las etapas. La fuerza sobre los álabes móviles produce par en el eje.')
  },
  coupling: {
    name: T('Acoplamento', 'Coupling', 'Acoplamiento'),
    text: T('Une os eixos e transmite torque da turbina ao gerador. O alinhamento ajuda a limitar vibrações e cargas nos mancais.',
      'It joins the shafts and transfers torque from the turbine to the generator. Alignment helps limit vibration and bearing loads.',
      'Une los ejes y transmite par de la turbina al generador. La alineación ayuda a limitar las vibraciones y las cargas en los cojinetes.')
  },
  rotor: {
    name: T('Rotor do gerador', 'Generator rotor', 'Rotor del generador'),
    text: T('No gerador síncrono representado, o rotor produz um campo magnético que gira com o eixo.',
      'In the illustrated synchronous generator, the rotor produces a magnetic field that rotates with the shaft.',
      'En el generador síncrono representado, el rotor produce un campo magnético que gira con el eje.')
  },
  stator: {
    name: T('Estator e enrolamentos', 'Stator and windings', 'Estátor y devanados'),
    text: T('O campo girante induz tensão alternada nos enrolamentos fixos do estator.',
      'The rotating field induces alternating voltage in the stationary stator windings.',
      'El campo giratorio induce tensión alterna en los devanados fijos del estátor.')
  },
  terminals: {
    name: T('Caixa de terminais', 'Terminal box', 'Caja de terminales'),
    text: T('Os terminais conectam os enrolamentos do estator ao circuito externo, através do sistema de proteção e manobra da instalação.',
      'The terminals connect the stator windings to the external circuit through the installation’s protection and switchgear.',
      'Los terminales conectan los devanados del estátor al circuito externo mediante la protección y maniobra de la instalación.')
  }
};

const partColors = ['#75b3da', '#e6b575', '#9fafc8', '#52ccbf', '#e88f59', '#a3c9ef'];
const inputKeys = ['mass', 'moisture'] as const;

function Diagram({selected, exploded}: {selected: PartId; exploded: boolean}) {
  const positions = exploded ? [92, 219, 310, 393, 525, 525] : [195, 195, 290, 384, 384, 384];
  const pieces = [
    <path d="M-57 -43H-40V-58H-22V-43H53V-28H-57ZM-57 28H53V43H-57Z"/>,
    <path d="M-64 -5H-32V-21H-25V-5H-4V-24H3V-5H24V-27H31V-5H64V5H31V27H24V5H3V24H-4V5H-25V21H-32V5H-64Z"/>,
    <path d="M-18 -19H-10V-12H10V-19H18V19H10V12H-10V19H-18Z"/>,
    <path d="M-64 -4H-42V-20H42V-4H64V4H42V20H-42V4H-64Z"/>,
    <path d="M-53 -40H53V-26H-53ZM-53 26H53V40H-53Z"/>,
    <path d="M-21 -15H21V15H-21ZM-13 -22V-15M0 -22V-15M13 -22V-15"/>
  ];

  return (
    <svg className="lab3d-diagram" viewBox="0 0 620 240" aria-hidden="true">
      <path d="M20 136H600" fill="none" stroke="#44667f" strokeDasharray="5 6"/>
      {partIds.map((id, index) => {
        const active = id === selected;
        const y = id === 'terminals' ? (exploded ? 52 : 76) : 136;
        return (
          <g key={id} transform={'translate(' + positions[index] + ',' + y + ')'}
            fill={active ? '#23754b' : '#172e44'} stroke={active ? '#79ff9b' : partColors[index]} strokeWidth="2">
            {pieces[index]}
          </g>
        );
      })}
    </svg>
  );
}

export default function Lab3D() {
  const {source, labView, navigate, t} = useApp();
  const bench = source === 'solar';
  const shading = bench && labView === 'shading';
  const wind = source === 'wind';
  const hydro = source === 'hydro';
  return (
    <>
      <nav className="lab3d-stations lab3d-modes" aria-label={t(T('Estações do Laboratório 3D', '3D lab stations', 'Estaciones del laboratorio 3D'))}>
        <button type="button" aria-pressed={!bench && !hydro && !wind} onClick={() => navigate('lab3d', 'biomass')}>
          <Icon name="bolt"/>{t(T('Usina de biomassa', 'Biomass power plant', 'Central de biomasa'))}
        </button>
        <button type="button" aria-pressed={bench && !shading} onClick={() => navigate('lab3d', 'solar')}>
          <Icon name="layers"/>{t(T('Bancada renovável', 'Renewable bench', 'Banco renovable'))}
        </button>
        <button type="button" aria-pressed={shading} onClick={() => navigate('lab3d', 'solar', 'shading')}>
          <Icon name="sun"/>{t(T('Sombreamento FV', 'PV shading', 'Sombreado FV'))}
        </button>
        <button type="button" aria-pressed={hydro} onClick={() => navigate('lab3d', 'hydro')}>
          <Icon name="drop"/>{t(T('Hidrelétrica', 'Hydropower', 'Hidroeléctrica'))}
        </button>
        <button type="button" aria-pressed={wind} onClick={() => navigate('lab3d', 'wind')}>
          <Icon name="wind"/>{t(T('Aerogerador 3D', 'Wind turbine 3D', 'Aerogenerador 3D'))}
        </button>
      </nav>
      {shading ? <SolarShadingLab/> : wind ? <WindLab3D/> : hydro ? <HydroLab3D/> : bench ? <RenewableBench3D/> : <BiomassStation/>}
    </>
  );
}

function BiomassStation() {
  const {t} = useApp();
  const [detail, setDetail] = useState(false);
  const title = useRef<HTMLDivElement>(null);

  function openDetail(show: boolean) {
    setDetail(show);
    window.scrollTo({top: 0, behavior: 'instant'});
  }

  useEffect(() => {
    if (detail) title.current?.focus({preventScroll: true});
  }, [detail]);

  if (!detail) return <BiomassPlant3D onTurbineDetail={() => openDetail(true)}/>;
  return (
    <>
      <div className="bioplant-back" ref={title} tabIndex={-1}>
        <Button onClick={() => openDetail(false)}>
          {t(T('Voltar à usina 3D', 'Back to 3D plant', 'Volver a la planta 3D'))}
        </Button>
      </div>
      <TurbineLab/>
    </>
  );
}

function TurbineLab() {
  const {t, lang, navigate, values, updateValues, notify} = useApp();
  const surface = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const viewer = useRef<ReturnType<typeof createTurbineViewer>>(null);
  const [selected, setSelected] = useState<PartId>('turbine');
  const [exploded, setExploded] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [view, setView] = useState<'loading' | '3d' | 'lightweight' | 'diagram'>('loading');
  const interactive = view === '3d' || view === 'lightweight';
  const [fullscreen, setFullscreen] = useState(false);
  const biomass = values.biomass;
  const result = calculate('biomass', biomass);

  useEffect(() => {
    if (!surface.current) return;
    try {
      const instance = createTurbineViewer(surface.current, setSelected, () => {
        setView('diagram');
        setSpinning(false);
      });
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
    viewer.current?.setState({selected, exploded, spinning});
  }, [selected, exploded, spinning]);

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
      notify(t(T('Tela cheia indisponível neste navegador.', 'Fullscreen is unavailable in this browser.', 'Pantalla completa no disponible en este navegador.')));
    }
  }

  function handleCameraKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!interactive || event.altKey || event.ctrlKey || event.metaKey) return;
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

  const metrics = [
    {label: T('Térmica do combustível', 'Fuel thermal power', 'Térmica del combustible'), value: result.resource, unit: 'kWₜ'},
    {label: T('Elétrica bruta', 'Gross electrical', 'Eléctrica bruta'), value: result.gross, unit: 'kWₑ'},
    {label: T('Elétrica líquida', 'Net electrical', 'Eléctrica neta'), value: result.power, unit: 'kWₑ'}
  ];

  return (
    <section className="lab3d">
      <Heading
        eyebrow={T('LABORATÓRIO 3D  /  BIOMASSA', '3D LAB  /  BIOMASS', 'LABORATORIO 3D  /  BIOMASA')}
        title={T('Turbina a vapor e gerador', 'Steam turbine and generator', 'Turbina de vapor y generador')}
        description={T('Explore o conjunto em corte e acompanhe a conversão da energia da biomassa em eletricidade.',
          'Explore the cutaway assembly and follow the conversion of biomass energy into electricity.',
          'Explora el conjunto en corte y sigue la conversión de la energía de la biomasa en electricidad.')}
      />

      <div className="lab3d-layout">
        <div className="lab3d-workbench">
          <div className="lab3d-viewer" ref={panel}>
            <div className="lab3d-toolbar">
              <div className="lab3d-modes" role="group" aria-label={t(T('Vista do conjunto', 'Assembly view', 'Vista del conjunto'))}>
                <button type="button" aria-pressed={!exploded} onClick={() => setExploded(false)}>
                  {t(T('Montada', 'Assembled', 'Montada'))}
                </button>
                <button type="button" aria-pressed={exploded} onClick={() => setExploded(true)}>
                  <Icon name="layers"/>{t(T('Explodida', 'Exploded', 'Explosionada'))}
                </button>
              </div>
              <div className="lab3d-tools">
                {interactive && <>
                  <button type="button" aria-label={t(T('Aproximar', 'Zoom in', 'Acercar'))} onClick={() => viewer.current?.zoom(1.2)}>+</button>
                  <button type="button" aria-label={t(T('Afastar', 'Zoom out', 'Alejar'))} onClick={() => viewer.current?.zoom(1 / 1.2)}>−</button>
                  <button type="button" aria-label={t(T('Restaurar câmera', 'Reset camera', 'Restablecer cámara'))} onClick={() => viewer.current?.reset()}>
                    <Icon name="reset"/>
                  </button>
                </>}
                {document.fullscreenEnabled && (
                  <button type="button" aria-pressed={fullscreen}
                    aria-label={t(T('Tela cheia', 'Fullscreen', 'Pantalla completa'))} onClick={() => void toggleFullscreen()}>
                    <Icon name="zoom"/>
                  </button>
                )}
              </div>
            </div>
            <div className="lab3d-stage" tabIndex={interactive ? 0 : undefined} onKeyDown={handleCameraKey}
              role="group" aria-label={t(T('Visualização da turbina e do gerador', 'Turbine and generator view', 'Vista de la turbina y el generador'))}
              aria-describedby="lab3d-help">
              <div ref={surface} className="lab3d-surface" aria-hidden="true" hidden={view === 'diagram'}/>
              {view === 'diagram' && <Diagram selected={selected} exploded={exploded}/>}
              <span className="lab3d-stage-label">
                <span className="lab3d-indicator"/>
                {view === '3d' ? t(T('MODELO 3D DIDÁTICO', 'EDUCATIONAL 3D MODEL', 'MODELO 3D DIDÁCTICO'))
                  : view === 'lightweight' ? t(T('MODELO 3D LEVE', 'LIGHTWEIGHT 3D MODEL', 'MODELO 3D LIGERO'))
                  : view === 'diagram' ? t(T('ESQUEMA DIDÁTICO', 'EDUCATIONAL DIAGRAM', 'ESQUEMA DIDÁCTICO'))
                  : t(T('CARREGANDO MODELO', 'LOADING MODEL', 'CARGANDO MODELO'))}
              </span>
              {interactive && (
                <button type="button" className="lab3d-spin" aria-pressed={spinning} onClick={() => setSpinning(!spinning)}>
                  <span aria-hidden="true">{spinning ? 'Ⅱ' : '▶'}</span>
                  {spinning ? t(T('Pausar', 'Pause', 'Pausar')) : t(T('Girar rotores', 'Spin rotors', 'Girar rotores'))}
                </button>
              )}
            </div>
            <p id="lab3d-help" className="lab3d-help">
              {interactive
                ? t(T('Arraste para girar. Use roda ou pinça para ampliar. Toque em uma peça. No teclado, use setas e +/−.',
                  'Drag to rotate. Scroll or pinch to zoom. Tap a part. With a keyboard, use arrows and +/−.',
                  'Arrastra para girar. Usa la rueda o pellizca para ampliar. Toca una pieza. Con teclado, usa flechas y +/−.'))
                : t(T('Se o 3D estiver indisponível, use o esquema e selecione as peças na lista.',
                  'When 3D is unavailable, use the diagram and select parts from the list.',
                  'Si el 3D no está disponible, usa el esquema y selecciona las piezas de la lista.'))}
            </p>
          </div>

          <section className="lab3d-card" aria-labelledby="lab3d-parts">
            <h2 id="lab3d-parts">{t(T('Componentes do conjunto', 'Assembly components', 'Componentes del conjunto'))}</h2>
            <div className="lab3d-parts">
              {partIds.map((id, index) => (
                <button type="button" key={id} aria-pressed={id === selected} aria-controls="lab3d-part-detail"
                  onClick={() => setSelected(id)}>
                  <span style={{color: partColors[index]}}>{String(index + 1).padStart(2, '0')}</span>
                  {t(components[id].name)}
                </button>
              ))}
            </div>
            <div className="lab3d-part-detail" id="lab3d-part-detail" aria-live="polite">
              <strong>{t(components[selected].name)}</strong>
              <p>{t(components[selected].text)}</p>
            </div>
          </section>
        </div>

        <div className="lab3d-side">
          <section className="lab3d-card" aria-labelledby="lab3d-energy">
            <span className="lab3d-kicker">{t(T('SIMULAÇÃO DE BIOMASSA', 'BIOMASS SIMULATION', 'SIMULACIÓN DE BIOMASA'))}</span>
            <h2 id="lab3d-energy">{t(T('Balanço de potência', 'Power balance', 'Balance de potencia'))}</h2>
            <p>{t(T('Os ajustes são compartilhados com o simulador de biomassa.',
              'Settings are shared with the biomass simulator.',
              'Los ajustes se comparten con el simulador de biomasa.'))}</p>
            <div className="lab3d-inputs">
              {inputKeys.map(key => (
                <label key={key}>
                  <span>{t(fields[key].label)} <output htmlFor={'lab3d-' + key}>{format(biomass[key], lang, 0)} {fields[key].unit}</output></span>
                  <input id={'lab3d-' + key} type="range" min={fields[key].min} max={fields[key].max} step={fields[key].step}
                    value={biomass[key]} onChange={event => updateValues('biomass', {...biomass, [key]: Number(event.target.value)})}/>
                </label>
              ))}
            </div>
            <dl className="lab3d-metrics">
              {metrics.map(({label, value, unit}) => (
                <div key={label.pt}>
                  <dt>{t(label)}</dt>
                  <dd>{format(value, lang, 1)} <small>{unit}</small></dd>
                  <div aria-hidden="true" className="lab3d-meter">
                    <span style={{width: (result.resource > 0 ? 100 * value / result.resource : 0) + '%'}}/>
                  </div>
                </div>
              ))}
            </dl>
            <p className="lab3d-pci">
              {t(T('PCI na umidade atual', 'LHV at current moisture', 'PCI con la humedad actual'))}
              <strong>{format(result.details.lhv, lang)} MJ/kg</strong>
            </p>
            <Button icon="flask" onClick={() => navigate('sim', 'biomass')}>
              {t(T('Abrir simulador completo', 'Open full simulator', 'Abrir simulador completo'))}
            </Button>
          </section>

          <section className="lab3d-card lab3d-activity">
            <h2>{t(T('Experimento de bancada', 'Lab exercise', 'Práctica de laboratorio'))}</h2>
            <p>{t(T('Fixe a alimentação de biomassa em 60 kg/h e compare 20% e 40% de umidade. Registre o PCI e a potência elétrica líquida em cada caso. Explique a diferença.',
              'Set biomass feed to 60 kg/h and compare 20% and 40% moisture. Record the LHV and net electrical power in each case. Explain the difference.',
              'Fija la alimentación de biomasa en 60 kg/h y compara 20% y 40% de humedad. Registra el PCI y la potencia eléctrica neta en cada caso. Explica la diferencia.'))}</p>
            <p>{t(T('Geometria e movimento ilustrativos, sem escala ou rotação de projeto.',
              'Illustrative geometry and motion, without design scale or speed.',
              'Geometría y movimiento ilustrativos, sin escala ni velocidad de diseño.'))}</p>
            <a href="https://www.energy.gov/cmei/fuels/biopower-energy-heat-and-electricity" target="_blank" rel="noreferrer">
              {t(T('Referência sobre geração a vapor · U.S. DOE', 'Reference on steam power · U.S. DOE', 'Referencia sobre generación con vapor · U.S. DOE'))}
              <Icon name="external"/>
            </a>
            <a href="https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/315901" target="_blank" rel="noreferrer">
              {t(T('Umidade e poder calorífico · Embrapa', 'Moisture and heating value · Embrapa', 'Humedad y poder calorífico · Embrapa'))}
              <Icon name="external"/>
            </a>
          </section>
        </div>
      </div>
    </section>
  );
}
