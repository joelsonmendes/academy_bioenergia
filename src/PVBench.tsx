import {useCallback, useEffect, useMemo, useRef} from 'react';
import {Heading, Icon} from './components';
import {T} from './model';
import {PROFILE_ID} from './profiles';
import {useApp} from './store';

declare const BIO_PV_BENCH: string | undefined;
const benchFile = './bancada-fotovoltaica.html?caderno=' + encodeURIComponent(PROFILE_ID);

export default function PVBench() {
  const {L, t, theme, lang} = useApp();
  const frame = useRef<HTMLIFrameElement>(null);
  const fileProtocol = location.protocol === 'file:';
  const portable = fileProtocol && typeof BIO_PV_BENCH === 'string';
  const frameDocument = useMemo(() => {
    if (!fileProtocol || typeof BIO_PV_BENCH !== 'string') return undefined;
    const html = new TextDecoder().decode(Uint8Array.from(atob(BIO_PV_BENCH), char => char.charCodeAt(0)));
    return html.replace('<html ', `<html data-profile="${PROFILE_ID}" `);
  }, [fileProtocol]);
  const description = t(T(
    'Monte e ensaie circuitos on-grid, off-grid e híbridos com fotos de equipamentos e bornes interativos.',
    'Build and test on-grid, off-grid and hybrid circuits using equipment photos and interactive terminals.',
    'Monta y prueba circuitos on-grid, off-grid e híbridos con fotos de equipos y bornes interactivos.'
  ));
  const syncFrame = useCallback(() => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    target.postMessage({type: 'bioenergia-pv-theme', theme}, fileProtocol ? '*' : location.origin);
  }, [fileProtocol, theme]);

  useEffect(() => {
    function receive(event: MessageEvent<unknown>) {
      const current = frame.current;
      if (!current || event.source !== current.contentWindow
        || event.origin !== (fileProtocol ? 'null' : location.origin)) return;
      if (!event.data || typeof event.data !== 'object' || !('type' in event.data)) return;
      if (event.data.type === 'bioenergia-pv-theme-request') syncFrame();
      if (event.data.type === 'bioenergia-pv-size' && 'height' in event.data
        && typeof event.data.height === 'number' && Number.isFinite(event.data.height)) {
        current.style.height = Math.min(6500, Math.max(300, Math.ceil(event.data.height))) + 'px';
      }
    }
    window.addEventListener('message', receive);
    syncFrame();
    return () => window.removeEventListener('message', receive);
  }, [fileProtocol, syncFrame]);

  return <section className="pv-bench-page">
    <Heading eyebrow={T('LABORATÓRIO FOTOVOLTAICO', 'PHOTOVOLTAIC LAB', 'LABORATORIO FOTOVOLTAICO')}
      title={L('pvbench')} description={description}>
      {!portable && <a className="button secondary" href={benchFile} target="_blank" rel="noopener noreferrer">
        <Icon name="external"/>
        <span>{t(T('Abrir em tela ampla', 'Open in a wider view', 'Abrir en vista amplia'))}</span>
      </a>}
    </Heading>
    {lang !== 'pt' && <p className="pv-bench-language">{t(T(
      'A bancada interativa está em português.',
      'The interactive bench is in Portuguese.',
      'El banco interactivo está en portugués.'
    ))}</p>}
    <iframe ref={frame} className="pv-bench-frame" title={L('pvbench')}
      src={portable ? undefined : benchFile}
      srcDoc={frameDocument}
      onLoad={syncFrame}/>
  </section>;
}
