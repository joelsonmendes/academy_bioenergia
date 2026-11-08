import React, {useEffect, useRef, useState} from 'react';
import {Button, Download, Heading, Icon} from './components';
import {useApp} from './store';
import {format, T} from './model';
import {calculatePV, pvId, cableSections, pvLimits, validPVProject, type PVProject, type PVInputKey, type PVLoad, type DatasheetRef} from './pv-report-engine';
import {pvFieldLabels, pvSystems, brazilStates, pvReferences, installationGuidance} from './pv-report-content';
import {annualMean, bestAnnualTilt, fetchSolarClimate, lookupCEP, lookupCity, type GeoPlace} from './pv-solar';
import {readPVProject, savePVProject, parsePVBackup, storeDatasheet, getDatasheet, removeDatasheet} from './pv-report-storage';
import {PVUnifilar} from './PVUnifilar';
import {exportPVReport} from './pv-report-pdf';

const stepLabels = [
  T('Cliente e local', 'Client and site', 'Cliente y lugar'),
  T('Consumo e cargas', 'Demand and loads', 'Consumo y cargas'),
  T('Equipamentos', 'Equipment', 'Equipos'),
  T('Cabos e proteções', 'Cables and protection', 'Cables y protecciones'),
  T('Memória e relatório', 'Calculations and report', 'Memoria e informe')
];

function NumberField({id, value, onValue}: {id: PVInputKey;value: number;onValue: (value: number) => void}) {
  const {t} = useApp();
  const field = pvFieldLabels[id];
  const [min, max] = pvLimits[id];
  const invalid = !Number.isFinite(value) || value < min || value > max;
  return (
    <label className="pv-field">
      <span>{t(field.label)}</span>
      <div className="pv-number">
        <input type="number" inputMode="decimal" min={min} max={max} step="any"
          value={Number.isFinite(value) ? value : ''} aria-invalid={invalid || undefined}
          onChange={event => onValue(event.target.valueAsNumber)}/>
        {field.unit && <small>{field.unit}</small>}
      </div>
      {invalid && <small className="pv-error">{min} – {max}</small>}
    </label>
  );
}

export default function TechnicalReport() {
  const {lang, t, notify} = useApp();
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const [project, setProject] = useState<PVProject>(readPVProject);
  const current = useRef(project);
  current.current = project;
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(true);
  const [pdfDownload, setPdfDownload] = useState<{url: string;filename: string;snapshot: PVProject;lang: string} | null>(null);
  const [busy, setBusy] = useState<'cep' | 'city' | 'solar' | 'pdf' | 'file' | null>(null);
  const [message, setMessage] = useState('');
  const [places, setPlaces] = useState<GeoPlace[]>([]);
  const [fileCheck, setFileCheck] = useState<Record<string, boolean>>({});
  const request = useRef<AbortController | null>(null);
  const diagram = useRef<SVGSVGElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const stepsNav = useRef<HTMLElement>(null);
  const result = calculatePV(project);
  const v = project.inputs;
  const storage = project.system !== 'ongrid';
  const errors = result?.checks.filter(check => check.kind === 'error').length ?? 0;
  const n = (value: number | null, digits = 2) => format(value, lang, digits);

  useEffect(() => {setSaved(savePVProject(project));}, [project]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => {if (pdfDownload) URL.revokeObjectURL(pdfDownload.url);}, [pdfDownload]);
  useEffect(() => {
    let active = true;
    Promise.all(Object.values(project.attachments).map(async file => [file.id, !!(await getDatasheet(file.id))] as const))
      .then(items => {if (active) setFileCheck(Object.fromEntries(items));})
      .catch(() => {if (active) setFileCheck({});});
    return () => {active = false;};
  }, [project.attachments]);

  function setValue(id: PVInputKey, value: number) {
    if (id === 'latitude' || id === 'longitude') request.current?.abort();
    setProject(previous => ({
      ...previous, inputs: {...previous.inputs, [id]: value},
      ...(['moduleW','voc','vmp','isc','imp','betaVoc','betaVmp','alphaIsc','moduleFuse','moduleReverse','moduleMaxV','moduleArea'].includes(id) ? {moduleConfirmed: false} : {}),
      ...(['inverterKW','inverterDCW','inverterMaxV','mpptMin','mpptMax','mppts','stringsPerMppt','mpptA','mpptIsc','startV','inverterAcA','inverterEff','inverterSurgeKW','epsKW','batteryMinV','batteryMaxV','chargeA'].includes(id) ? {inverterConfirmed: false} : {}),
      ...(['batteryV','unitV','batteryAh','dod','batteryDisEff','batteryRoundEff','batteryMaxA','batterySeriesMax'].includes(id) ? {batteryConfirmed: false} : {}),
      ...(id === 'latitude' || id === 'longitude' ? {solar: null, solarMode: 'manual', locationConfirmed: false} : {})
    }));
  }
  function setSite(key: keyof PVProject['site'], value: string) {
    request.current?.abort();
    setPlaces([]);setMessage('');
    setProject(previous => ({...previous, site: {...previous.site, [key]: value}, solar: null, solarMode: 'manual', locationConfirmed: false}));
  }
  function changeStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      stepTitle.current?.focus({preventScroll: true});
      stepsNav.current?.scrollIntoView({block: 'start', behavior: 'instant'});
    });
  }
  async function online(kind: 'cep' | 'city' | 'solar') {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 25000);
    setBusy(kind);setMessage('');
    const snapshot = current.current;
    try {
      if (kind === 'cep') {
        const found = await lookupCEP(snapshot.site.cep, controller.signal);
        if (controller.signal.aborted) return;
        setProject(previous => ({
          ...previous, site: {...previous.site, uf: found.state, region: brazilStates.find(state => state[0] === found.state)?.[2] ?? previous.site.region,
            city: found.city, address: [found.street, found.neighborhood].filter(Boolean).join(', '),
            locationNote: 'BrasilAPI CEP v2 · ponto aproximado do CEP. Confirmar coordenadas da instalação.'},
          inputs: {...previous.inputs, ...(found.latitude !== null && found.longitude !== null ? {latitude: found.latitude, longitude: found.longitude} : {})},
          solar: null, solarMode: 'manual', locationConfirmed: false
        }));
        setMessage(found.latitude === null
          ? q('Endereço localizado. Localize o município ou informe as coordenadas da instalação.', 'Address found. Locate the municipality or enter the installation coordinates.', 'Dirección localizada. Localiza el municipio o introduce coordenadas de instalación.')
          : q('CEP localizado. Confira o endereço, ajuste número e complemento e confirme as coordenadas.', 'Postal code found. Check the address, add the number and unit, and confirm coordinates.', 'Código postal localizado. Verifica dirección, número y complemento, y confirma coordenadas.'));
      }
      if (kind === 'city') {
        const state = brazilStates.find(item => item[0] === snapshot.site.uf)?.[1] ?? snapshot.site.uf;
        const found = await lookupCity(snapshot.site.city, state, controller.signal);
        if (controller.signal.aborted) return;
        setPlaces(found);
        setMessage(found.length ? q('Selecione o ponto aproximado do município.', 'Select the approximate municipality location.', 'Selecciona el punto aproximado del municipio.')
          : q('Município não localizado. Confira UF e nome ou informe as coordenadas.', 'Municipality not found. Check the state and name or enter coordinates.', 'Municipio no localizado. Verifica estado y nombre o introduce coordenadas.'));
      }
      if (kind === 'solar') {
        const climate = await fetchSolarClimate(snapshot.inputs.latitude, snapshot.inputs.longitude, controller.signal);
        if (controller.signal.aborted) return;
        setProject(previous => {
          if (previous.inputs.latitude !== climate.latitude || previous.inputs.longitude !== climate.longitude) return previous;
          const azimuth = previous.inputs.latitude <= 0 ? 0 : 180;
          const tilt = bestAnnualTilt(climate, azimuth);
          return {...previous, solar: climate, solarMode: previous.system === 'offgrid' ? 'worst' : 'annual',
            inputs: {...previous.inputs, ...(previous.solar ? {} : {tilt, azimuth})}};
        });
        setMessage(q('Climatologia carregada e salva no rascunho. HSP calculada para o plano adotado.', 'Climatology loaded and saved in the draft. Peak sun hours calculated for the selected plane.', 'Climatología cargada y guardada en el borrador. HSP calculada para el plano adoptado.'));
      }
    } catch {
      if (request.current === controller) setMessage(q('A consulta não foi concluída. Verifique a conexão e os dados informados. A entrada manual continua disponível.',
        'The request did not complete. Check the connection and entered values. Manual input remains available.',
        'La consulta no se completó. Verifica conexión y datos. La entrada manual sigue disponible.'));
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {request.current = null;setBusy(null);}
    }
  }
  async function attach(kind: 'module' | 'inverter', file: File | undefined) {
    if (!file || busy) return;
    setBusy('file');
    try {
      const ref = await storeDatasheet(file);
      const previous = current.current;
      const next = {...previous, attachments: {...previous.attachments, [kind]: ref}};
      if (!savePVProject(next)) {
        await removeDatasheet(ref.id);
        throw new Error('DRAFT_STORAGE');
      }
      setProject(next);
      const old = previous.attachments[kind];
      if (old) await removeDatasheet(old.id).catch(() => undefined);
      notify(q('Datasheet PDF salvo neste dispositivo.', 'Datasheet PDF saved on this device.', 'Ficha PDF guardada en este dispositivo.'));
    } catch {
      notify(q('Use um PDF válido de até 10 MB. Confira o armazenamento e os campos do rascunho.', 'Use a valid PDF up to 10 MB. Check storage and draft fields.', 'Usa un PDF válido de hasta 10 MB. Verifica almacenamiento y datos del borrador.'));
    } finally {setBusy(null);}
  }
  async function downloadFile(file: DatasheetRef) {
    try {
      const blob = await getDatasheet(file.id);
      if (!blob) throw new Error('MISSING');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;link.download = file.name;link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {notify(q('Reanexe este PDF neste dispositivo.', 'Attach this PDF again on this device.', 'Vuelve a adjuntar este PDF en este dispositivo.'));}
  }
  async function detach(kind: 'module' | 'inverter') {
    const previous = current.current;
    const old = previous.attachments[kind];
    const attachments = {...previous.attachments};
    delete attachments[kind];
    const next = {...previous, attachments};
    if (!savePVProject(next)) {setSaved(false);return;}
    setProject(next);
    if (old) await removeDatasheet(old.id).catch(() => undefined);
  }
  function fields(ids: PVInputKey[]) {
    return <div className="pv-fields">{ids.map(id => <NumberField key={id} id={id} value={v[id]} onValue={value => setValue(id, value)}/>)}</div>;
  }
  function sectionTitle(eyebrow: string, title: string, description?: string) {
    return <div className="pv-card-heading"><span>{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>;
  }
  function textField(label: string, value: string, onChange: (value: string) => void, max = 200) {
    return <label className="pv-field"><span>{label}</span><input value={value} maxLength={max} onChange={event => onChange(event.target.value)}/></label>;
  }
  function fileField(kind: 'module' | 'inverter') {
    const file = project.attachments[kind];
    return <div className="pv-datasheet">
      <label className="pv-upload"><Icon name="download"/><span>{q('Anexar datasheet PDF', 'Attach datasheet PDF', 'Adjuntar ficha PDF')}
        <small>{q('Até 10 MB · salvo neste dispositivo', 'Up to 10 MB · saved on this device', 'Hasta 10 MB · guardado en este dispositivo')}</small></span>
        <input type="file" accept=".pdf,application/pdf" disabled={busy !== null || !validPVProject(project)} onChange={event => {
          void attach(kind, event.target.files?.[0]);event.target.value = '';
        }}/>
      </label>
      {file && <div className="pv-file">
        <strong>{file.name}</strong><span>{n(file.size / 1024, 0)} KB</span>
        <Button icon="download" onClick={() => void downloadFile(file)}>{q('Baixar cópia', 'Download copy', 'Descargar copia')}</Button>
        <Button onClick={() => void detach(kind)}>{q('Desvincular', 'Detach', 'Desvincular')}</Button>
        {fileCheck[file.id] === false && <small className="pv-error">{q('Reanexe o arquivo neste dispositivo.', 'Attach the file again on this device.', 'Vuelve a adjuntar el archivo en este dispositivo.')}</small>}
      </div>}
    </div>;
  }
  function loadField(row: PVLoad, key: 'quantity' | 'watts' | 'hours' | 'startFactor', label: string, max: number) {
    return <input aria-label={label + ' · ' + row.name} type="number" min={key === 'startFactor' ? 1 : 0} max={max}
      step={key === 'quantity' ? 1 : 'any'} value={Number.isFinite(row[key]) ? row[key] : ''}
      onChange={event => updateLoad(row.id, {[key]: event.target.valueAsNumber})}/>;
  }
  function updateLoad(id: string, patch: Partial<PVLoad>) {
    setProject(previous => ({...previous, loads: previous.loads.map(load => load.id === id ? {...load, ...patch} : load)}));
  }
  function resultRows(rows: [string, string][]) {
    return <dl className="pv-result-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
  }
  async function generatePDF() {
    if (!result || !diagram.current || busy) return;
    const snapshot = structuredClone(project);
    const svg = new XMLSerializer().serializeToString(diagram.current);
    setBusy('pdf');
    try {
      const file = await exportPVReport(snapshot, result, lang, svg);
      const url = URL.createObjectURL(file.blob);
      setPdfDownload({url, filename: file.filename, snapshot: project, lang});
      const link = document.createElement('a');
      link.href = url;link.download = file.filename;link.click();
      notify(q('PDF gerado com memória, unifilar e verificações.', 'PDF generated with calculations, diagram and checks.', 'PDF generado con memoria, unifilar y verificaciones.'));
    } catch {notify(q('O PDF não foi gerado. Verifique o armazenamento e tente novamente.', 'PDF generation failed. Check storage and try again.', 'No se generó el PDF. Verifica almacenamiento e inténtalo de nuevo.'));}
    finally {setBusy(null);}
  }

  return (
    <section className="pv-report">
      <Heading eyebrow={T('ENGENHARIA APLICADA / FOTOVOLTAICA', 'APPLIED ENGINEERING / PHOTOVOLTAICS', 'INGENIERÍA APLICADA / FOTOVOLTAICA')}
        title={T('Relatório técnico', 'Technical report', 'Informe técnico')}
        description={T('Dimensione, confira os limites dos equipamentos e documente cada premissa do projeto.',
          'Size the system, check equipment limits and document every design assumption.',
          'Dimensiona, verifica los límites de equipos y documenta cada supuesto del proyecto.')}>
        <div className="pv-heading-actions">
          <Button icon="save" disabled={!result || busy !== null} onClick={() => Download('BioEnergia_Projeto_FV.json', JSON.stringify(project, null, 2), 'application/json')}>
            {q('Salvar projeto JSON', 'Save project JSON', 'Guardar proyecto JSON')}
          </Button>
          <Button icon="download" disabled={busy !== null} onClick={() => backupInput.current?.click()}>
            {q('Importar projeto', 'Import project', 'Importar proyecto')}
          </Button>
          <input ref={backupInput} type="file" accept=".json,application/json" hidden onChange={async event => {
            const file = event.target.files?.[0];event.target.value = '';
            if (!file) return;
            try {
              if (file.size > 120000) throw new Error('SIZE');
              const restored = parsePVBackup(await file.text());
              request.current?.abort();setPlaces([]);setMessage('');setProject(restored);
              notify(q('Projeto importado. Reanexe PDFs que ainda não existirem neste dispositivo.', 'Project imported. Attach PDFs missing from this device.', 'Proyecto importado. Adjunta los PDF que falten en este dispositivo.'));
            } catch {notify(q('Arquivo de projeto inválido ou incompatível.', 'Invalid or incompatible project file.', 'Archivo de proyecto inválido o incompatible.'));}
          }}/>
        </div>
      </Heading>
      <div className="pv-project-bar">
        <label className="pv-field"><span>{q('Tipo de projeto', 'Project type', 'Tipo de proyecto')}</span>
          <select value={project.system} onChange={event => setProject(previous => ({
            ...previous, system: event.target.value as PVProject['system'],
            solarMode: previous.solar ? event.target.value === 'offgrid' ? 'worst' : 'annual' : 'manual'
          }))}>{Object.entries(pvSystems).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select>
        </label>
        <div className="pv-draft"><span className={saved ? 'pv-dot' : 'pv-dot pending'}/>
          {saved ? q('Rascunho salvo neste caderno', 'Draft saved in this notebook', 'Borrador guardado en este cuaderno')
            : q('Há campos inválidos ou falha ao salvar. Revise antes de sair.', 'Invalid fields or a save failure. Review before leaving.', 'Hay campos inválidos o fallo al guardar. Revisa antes de salir.')}
          <small>{q('Dados iniciais didáticos · confirme os datasheets', 'Initial example data · verify datasheets', 'Datos iniciales didácticos · confirma las fichas')}</small>
        </div>
      </div>

      {result && <div className="pv-summary">
        {[
          [q('Arranjo dimensionado', 'Sized array', 'Generador dimensionado'), n(result.installedKWp) + ' kWp', result.modules + ' ' + q('módulos', 'modules', 'módulos')],
          [q('Configuração elétrica', 'Electrical configuration', 'Configuración eléctrica'), result.strings + ' × ' + result.ns, q('strings × módulos em série', 'strings × modules in series', 'cadenas × módulos en serie')],
          [q('Inversor de referência', 'Reference inverter', 'Inversor de referencia'), n(result.recommendedInverterKW) + ' kW', q('selecionado', 'selected', 'seleccionado') + ' ' + n(v.inverterKW) + ' kW'],
          [storage ? q('Banco nominal calculado', 'Calculated nominal bank', 'Banco nominal calculado') : q('Geração no período', 'Period generation', 'Generación del período'),
            storage ? n(result.batteryKwh) + ' kWh' : n(result.monthlyGeneration, 0) + ' kWh',
            storage ? result.batteryUnits + ' ' + q('baterias', 'batteries', 'baterías') : n(v.days, 0) + ' ' + q('dias de referência', 'reference days', 'días de referencia')]
        ].map(([label, value, detail]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}
      </div>}
      {!result && <p className="pv-notice pv-error" role="alert">{q('Revise os campos vazios ou fora dos limites. O dimensionamento será atualizado após a correção.',
        'Review empty or out-of-range fields. Sizing will update after correction.', 'Revisa campos vacíos o fuera de límites. El dimensionamiento se actualizará al corregirlos.')}</p>}

      <nav ref={stepsNav} className="pv-steps" aria-label={q('Etapas do relatório técnico', 'Technical report steps', 'Etapas del informe técnico')}>
        {stepLabels.map((label, i) => <button type="button" key={i} aria-current={step === i ? 'step' : undefined} onClick={() => changeStep(i)}>
          <span>{String(i + 1).padStart(2, '0')}</span>{t(label)}
        </button>)}
      </nav>
      <h2 className="sr-only" ref={stepTitle} tabIndex={-1}>{t(stepLabels[step])}</h2>

      {step === 0 && <div className="pv-panel-grid">
        <section className="pv-card">
          {sectionTitle('01 / ' + q('IDENTIFICAÇÃO', 'IDENTIFICATION', 'IDENTIFICACIÓN'), q('Cliente e instalação', 'Client and installation', 'Cliente e instalación'))}
          <div className="pv-fields">
            {textField(q('Título do estudo', 'Study title', 'Título del estudio'), project.title, title => setProject(p => ({...p, title})))}
            {textField(q('Nome do cliente', 'Client name', 'Nombre del cliente'), project.client.name, name => setProject(p => ({...p, client: {...p.client, name}})))}
            {textField(q('Contato do cliente', 'Client contact', 'Contacto del cliente'), project.client.contact, contact => setProject(p => ({...p, client: {...p.client, contact}})))}
            {textField(q('Unidade consumidora / identificação', 'Consumer unit / ID', 'Unidad consumidora / identificación'), project.client.consumerUnit, consumerUnit => setProject(p => ({...p, client: {...p.client, consumerUnit}})))}
            {textField(q('Aluno / autor do estudo', 'Student / study author', 'Alumno / autor del estudio'), project.designer, designer => setProject(p => ({...p, designer})))}
            {textField(q('Registro profissional, quando aplicável', 'Professional registration, if applicable', 'Registro profesional, si corresponde'), project.registration, registration => setProject(p => ({...p, registration})))}
            <label className="pv-field"><span>{q('Região do Brasil', 'Brazilian region', 'Región de Brasil')}</span>
              <select value={project.site.region} onChange={event => {
                const region = event.target.value;
                request.current?.abort();setPlaces([]);setMessage('');
                const uf = brazilStates.find(state => state[2] === region)![0];
                setProject(p => ({...p, site: {...p.site, region, uf, city: '', cep: '', address: '', locationNote: ''}, solar: null, solarMode: 'manual', locationConfirmed: false}));
              }}>{['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'].map(region => <option key={region}>{region}</option>)}</select>
            </label>
            <label className="pv-field"><span>{q('Estado · UF', 'State', 'Estado')}</span>
              <select value={project.site.uf} onChange={event => {
                setSite('uf', event.target.value);
                setProject(p => ({...p, site: {...p.site, city: '', address: '', cep: ''}}));
              }}>{brazilStates.filter(state => state[2] === project.site.region).map(state => <option key={state[0]} value={state[0]}>{state[0]} · {state[1]}</option>)}</select>
            </label>
            {textField(q('Município', 'Municipality', 'Municipio'), project.site.city, city => setSite('city', city))}
            {textField('CEP', project.site.cep, cep => setSite('cep', cep), 10)}
          </div>
          <div className="pv-actions">
            <Button icon="search" disabled={busy !== null || project.site.cep.replace(/\D/g, '').length !== 8} onClick={() => void online('cep')}>
              {busy === 'cep' ? q('Consultando…', 'Looking up…', 'Consultando…') : q('Consultar CEP', 'Look up postal code', 'Consultar código postal')}
            </Button>
            <Button icon="globe" disabled={busy !== null || project.site.city.trim().length < 2} onClick={() => void online('city')}>
              {q('Localizar município', 'Locate municipality', 'Localizar municipio')}
            </Button>
          </div>
          <div className="pv-spaced">{textField(q('Endereço, número e complemento', 'Address, number and unit', 'Dirección, número y complemento'), project.site.address, address => setSite('address', address), 400)}</div>
          {places.length > 0 && <div className="pv-places">{places.map(place => <button key={place.latitude + ',' + place.longitude} type="button" onClick={() => {
            setProject(p => ({...p, site: {...p.site, city: place.name, locationNote: 'Open-Meteo/GeoNames · centro aproximado de ' + place.name + '. Confirmar o ponto da instalação.'},
              inputs: {...p.inputs, latitude: place.latitude, longitude: place.longitude}, solar: null, solarMode: 'manual', locationConfirmed: false}));
            setPlaces([]);setMessage(q('Ponto aproximado selecionado. Confira as coordenadas da instalação.', 'Approximate location selected. Verify installation coordinates.', 'Punto aproximado seleccionado. Verifica coordenadas de instalación.'));
          }}>{place.name} · {place.state}<small>{n(place.latitude, 5)}, {n(place.longitude, 5)}</small></button>)}</div>}
          <p className="pv-note">{q('A consulta externa usa apenas CEP ou município. Dados do cliente e PDFs permanecem neste dispositivo.',
            'External lookup uses only the postal code or municipality. Client data and PDFs stay on this device.',
            'La consulta externa usa solo código postal o municipio. Datos del cliente y PDF permanecen en este dispositivo.')}</p>
          <p className="pv-note"><a href="https://brasilapi.com.br/docs" target="_blank" rel="noreferrer">BrasilAPI</a> · <a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noreferrer">Open-Meteo / GeoNames</a></p>
        </section>

        <section className="pv-card">
          {sectionTitle(q('RECURSO SOLAR', 'SOLAR RESOURCE', 'RECURSO SOLAR'), q('Coordenadas, inclinação e HSP', 'Coordinates, tilt and peak sun hours', 'Coordenadas, inclinación y HSP'))}
          {fields(['latitude', 'longitude'])}
          <p className="pv-note">{project.site.locationNote}</p>
          <label className="pv-check"><input type="checkbox" checked={project.locationConfirmed} onChange={event => setProject(p => ({...p, locationConfirmed: event.target.checked}))}/>
            {q('Conferi o ponto da instalação ou adotei estas coordenadas para o estudo.', 'I verified the site location or adopted these coordinates for the study.', 'Verifiqué el lugar o adopté estas coordenadas para el estudio.')}</label>
          <div className="pv-actions">
            <Button icon="sun" kind="primary" disabled={busy !== null || !project.locationConfirmed || !Number.isFinite(v.latitude) || !Number.isFinite(v.longitude)}
              onClick={() => void online('solar')}>{busy === 'solar' ? q('Consultando NASA…', 'Querying NASA…', 'Consultando NASA…') : q('Consultar HSP · NASA POWER', 'Get solar data · NASA POWER', 'Consultar HSP · NASA POWER')}</Button>
          </div>
          {message && <p className="pv-notice" role="status">{message}</p>}
          <div className="pv-spaced">{fields(['tilt', 'azimuth'])}</div>
          <Button icon="reset" disabled={!Number.isFinite(v.latitude)} onClick={() => {
            const azimuth = v.latitude <= 0 ? 0 : 180;
            const tilt = project.solar ? bestAnnualTilt(project.solar, azimuth) : Math.round(Math.abs(v.latitude));
            setProject(p => ({...p, inputs: {...p.inputs, tilt, azimuth}}));
          }}>{q('Sugerir inclinação e orientação', 'Suggest tilt and orientation', 'Sugerir inclinación y orientación')}</Button>
          <p className="pv-note">{q('Sem climatologia, a sugestão usa a latitude. Com dados NASA, busca a maior média anual do modelo isotrópico entre 0° e 60°. Confira drenagem, telhado e requisitos do fabricante.',
            'Without climatology, the suggestion uses latitude. With NASA data, it searches the isotropic model’s highest annual mean from 0° to 60°. Check drainage, roof and manufacturer requirements.',
            'Sin climatología, se usa la latitud. Con datos NASA, busca la mayor media anual del modelo isotrópico entre 0° y 60°. Verifica drenaje, techo y requisitos del fabricante.')}</p>
          <label className="pv-field pv-spaced"><span>{q('Critério solar do dimensionamento', 'Solar design criterion', 'Criterio solar de dimensionamiento')}</span>
            <select value={project.solarMode} onChange={event => setProject(p => ({...p, solarMode: event.target.value as PVProject['solarMode']}))}>
              <option value="manual">{q('HSP manual no plano adotado', 'Manual peak sun hours on selected plane', 'HSP manual en el plano adoptado')}</option>
              <option value="annual" disabled={!project.solar}>{q('Média anual · NASA e transposição', 'Annual mean · NASA and transposition', 'Media anual · NASA y transposición')}</option>
              <option value="worst" disabled={!project.solar}>{q('Menor média mensal · NASA e transposição', 'Lowest monthly mean · NASA and transposition', 'Menor media mensual · NASA y transposición')}</option>
            </select>
          </label>
          {project.solarMode === 'manual' && fields(['hsp'])}
          {result && resultRows([[q('HSP adotada', 'Selected peak sun hours', 'HSP adoptada'), n(result.hsp, 3) + ' h/dia']])}
          {project.solar && result?.monthlyPOA && <details className="pv-details"><summary>{q('Dados mensais e rastreabilidade', 'Monthly data and traceability', 'Datos mensuales y trazabilidad')}</summary>
            <p className="pv-note">NASA POWER · {project.solar.period}</p>
            <p className="pv-note">{q('Média GHI horizontal', 'Horizontal GHI mean', 'Media GHI horizontal')} {n(annualMean(project.solar.ghi), 3)} kWh/m²/dia</p>
            <div className="pv-table-scroll"><table><thead><tr><th>{q('Mês', 'Month', 'Mes')}</th><th>GHI</th><th>DHI</th><th>{q('Plano adotado', 'Selected plane', 'Plano adoptado')}</th></tr></thead><tbody>
              {project.solar.ghi.map((ghi, i) => <tr key={i}><td>{i + 1}</td><td>{n(ghi, 3)}</td><td>{n(project.solar!.diffuse[i], 3)}</td><td>{n(result.monthlyPOA![i], 3)}</td></tr>)}
            </tbody></table></div><p className="pv-note">kWh/m²/dia · albedo 0,20 · {project.solar.retrievedAt.slice(0, 10)}</p>
          </details>}
          <p className="pv-note">{q('A primeira consulta preenche a orientação voltada ao Equador e a inclinação calculada. A HSP corresponde à irradiação diária dividida por 1 kW/m². A transposição é uma estimativa mensal com horizonte livre.',
            'The first query sets equator-facing orientation and calculated tilt. Peak sun hours equal daily irradiation divided by 1 kW/m². Transposition is a monthly estimate with an unobstructed horizon.',
            'La primera consulta define orientación hacia el ecuador e inclinación calculada. HSP equivale a irradiación diaria dividida por 1 kW/m². La transposición es una estimación mensual con horizonte libre.')}</p>
        </section>
      </div>}

      {step === 1 && <section className="pv-card">
        {sectionTitle('02 / ' + q('DEMANDA', 'DEMAND', 'DEMANDA'), q('Consumo e inventário de cargas', 'Consumption and load inventory', 'Consumo e inventario de cargas'))}
        {project.system !== 'offgrid' && fields(['monthlyKwh', 'days', 'coverage'])}
        <p className="pv-note">{project.system === 'offgrid'
          ? q('No off-grid, a energia diária vem do inventário. Preencha as horas equivalentes de uso e os fatores de partida.',
            'Off-grid daily energy comes from the inventory. Enter equivalent operating hours and starting factors.',
            'En off-grid, la energía diaria viene del inventario. Introduce horas equivalentes y factores de arranque.')
          : q('On-grid usa o consumo mensal como meta. No híbrido, as cargas críticas dimensionam o banco de backup e a saída EPS.',
            'On-grid uses monthly demand as the target. In hybrid systems, critical loads size the backup bank and EPS output.',
            'On-grid usa el consumo mensual como objetivo. En híbrido, las cargas críticas dimensionan batería y salida EPS.')}</p>
        <div className="pv-table-scroll"><table className="pv-loads">
          <thead><tr><th>{q('Equipamento', 'Equipment', 'Equipo')}</th><th>{q('Qtd.', 'Qty.', 'Cant.')}</th><th>W</th><th>h/dia</th><th>{q('Partida ×', 'Start ×', 'Arranque ×')}</th><th>{q('Crítica', 'Critical', 'Crítica')}</th><th>kWh/dia</th><th/></tr></thead>
          <tbody>{project.loads.map(row => <tr key={row.id}>
            <td><input aria-label={q('Nome da carga', 'Load name', 'Nombre de carga') + ' · ' + row.name} value={row.name} maxLength={120} onChange={event => updateLoad(row.id, {name: event.target.value})}/></td>
            <td>{loadField(row, 'quantity', q('Quantidade', 'Quantity', 'Cantidad'), 1000)}</td>
            <td>{loadField(row, 'watts', q('Potência', 'Power', 'Potencia'), 1000000)}</td>
            <td>{loadField(row, 'hours', q('Horas equivalentes', 'Equivalent hours', 'Horas equivalentes'), 24)}</td>
            <td>{loadField(row, 'startFactor', q('Fator de partida', 'Starting factor', 'Factor de arranque'), 10)}</td>
            <td><input type="checkbox" aria-label={q('Carga crítica', 'Critical load', 'Carga crítica') + ' · ' + row.name} checked={row.critical} onChange={event => updateLoad(row.id, {critical: event.target.checked})}/></td>
            <td>{n(row.quantity * row.watts * row.hours / 1000)}</td>
            <td><button type="button" className="icon-button" disabled={project.loads.length <= 1} aria-label={q('Remover carga', 'Remove load', 'Eliminar carga') + ' · ' + row.name}
              onClick={() => setProject(p => ({...p, loads: p.loads.filter(load => load.id !== row.id)}))}><Icon name="trash"/></button></td>
          </tr>)}</tbody>
        </table></div>
        <Button icon="plus" disabled={project.loads.length >= 30} onClick={() => setProject(p => ({...p, loads: [...p.loads, {id: pvId(), name: q('Nova carga', 'New load', 'Nueva carga'), quantity: 1, watts: 100, hours: 1, startFactor: 1, critical: true}]}))}>
          {q('Adicionar carga', 'Add load', 'Añadir carga')}
        </Button>
        {result && resultRows([
          [q('Energia diária do inventário', 'Daily inventory energy', 'Energía diaria del inventario'), n(result.dailyLoad) + ' kWh'],
          [q('Meta diária do arranjo FV', 'Daily PV array target', 'Objetivo diario del generador FV'), n(result.targetDaily) + ' kWh'],
          [q('Demanda simultânea de cálculo', 'Simultaneous design demand', 'Demanda simultánea de cálculo'), n(result.peakKW) + ' kW'],
          [q('Pior partida individual estimada', 'Worst estimated individual start', 'Peor arranque individual estimado'), n(result.surgeKW) + ' kW']
        ])}
        <h3>{q('Premissas energéticas', 'Energy assumptions', 'Supuestos energéticos')}</h3>
        {fields(['pr', 'dcAc'])}
        <p className="pv-note">{project.system === 'offgrid'
          ? q('PR cobre perdas do arranjo e cabeamento. O modelo aplica separadamente eficiência do inversor e do ciclo de bateria, supondo conservadoramente toda a energia através do banco.',
            'PR covers array and wiring losses. The model separately applies inverter and battery round-trip efficiencies, conservatively routing all energy through the bank.',
            'PR cubre pérdidas del generador y cableado. Se aplican aparte eficiencias del inversor y del ciclo de batería, suponiendo toda la energía a través del banco.')
          : q('PR representa as perdas globais de geração adotadas no estudo, incluindo conversão. No híbrido, autonomia e recarga das baterias exigem analisar o perfil horário.',
            'PR represents study-assumed overall generation losses, including conversion. Hybrid battery autonomy and recharging require hourly profile analysis.',
            'PR representa las pérdidas globales adoptadas, incluida conversión. Autonomía y recarga del híbrido requieren análisis del perfil horario.')}</p>
      </section>}

      {step === 2 && <>
        <p className="pv-notice">{q('Anexe os datasheets e preencha os parâmetros do modelo exato. Confirme os valores abaixo após a conferência.',
          'Attach datasheets and enter the exact model parameters. Confirm the values below after verification.',
          'Adjunta las fichas e introduce los parámetros del modelo exacto. Confirma los valores después de verificarlos.')}</p>
        <div className="pv-panel-grid">
          <section className="pv-card">
            {sectionTitle('03 / FV', q('Módulo fotovoltaico', 'Photovoltaic module', 'Módulo fotovoltaico'))}
            {textField(q('Fabricante e modelo do módulo', 'Module manufacturer and model', 'Fabricante y modelo del módulo'), project.moduleName, moduleName => setProject(p => ({...p, moduleName, moduleConfirmed: false})))}
            {fileField('module')}
            {fields(['moduleW', 'voc', 'vmp', 'isc', 'imp', 'betaVoc', 'betaVmp', 'alphaIsc', 'moduleFuse', 'moduleReverse', 'moduleMaxV', 'moduleArea'])}
            <p className="pv-note">{q('Use coeficientes em %/°C. O coeficiente de Vmp deve vir do fabricante. Corrente reversa admissível e máximo fusível em série são dados distintos.',
              'Use coefficients in %/°C. Obtain the Vmp coefficient from the manufacturer. Permissible reverse current and maximum series fuse are separate ratings.',
              'Usa coeficientes en %/°C. Obtén el coeficiente Vmp del fabricante. Corriente inversa admisible y fusible máximo en serie son datos distintos.')}</p>
            <label className="pv-check"><input type="checkbox" checked={project.moduleConfirmed} onChange={event => setProject(p => ({...p, moduleConfirmed: event.target.checked}))}/>
              {q('Conferi os parâmetros do módulo no datasheet.', 'I verified module parameters in the datasheet.', 'Verifiqué parámetros del módulo en la ficha.')}</label>
          </section>
          <section className="pv-card">
            {sectionTitle('CC / CA', q('Inversor e controlador MPPT', 'Inverter and MPPT controller', 'Inversor y controlador MPPT'))}
            {textField(q('Fabricante e modelo do inversor', 'Inverter manufacturer and model', 'Fabricante y modelo del inversor'), project.inverterName, inverterName => setProject(p => ({...p, inverterName, inverterConfirmed: false})))}
            {fileField('inverter')}
            {fields(['inverterKW', 'inverterDCW', 'inverterMaxV', 'mpptMin', 'mpptMax', 'mppts', 'stringsPerMppt', 'mpptA', 'mpptIsc', 'startV', 'inverterAcA'])}
            {storage && <>
              <label className="pv-check"><input type="checkbox" checked={project.hasBatteryPort} onChange={event => setProject(p => ({...p, hasBatteryPort: event.target.checked, inverterConfirmed: false}))}/>{q('Possui porta de bateria compatível.', 'Has a compatible battery port.', 'Tiene puerto de batería compatible.')}</label>
              <label className="pv-check"><input type="checkbox" checked={project.hasEPS} onChange={event => setProject(p => ({...p, hasEPS: event.target.checked, inverterConfirmed: false}))}/>{q('Suporta saída autônoma / EPS conforme manual.', 'Supports stand-alone / EPS output as specified.', 'Admite salida autónoma / EPS según manual.')}</label>
              {fields(['inverterEff', 'inverterSurgeKW', 'epsKW', 'batteryMinV', 'batteryMaxV', 'chargeA'])}
            </>}
            <label className="pv-check"><input type="checkbox" checked={project.inverterConfirmed} onChange={event => setProject(p => ({...p, inverterConfirmed: event.target.checked}))}/>
              {q('Conferi limites e modos de operação no manual do inversor.', 'I verified inverter limits and operating modes in its manual.', 'Verifiqué límites y modos de operación en el manual del inversor.')}</label>
          </section>
        </div>
        {storage && <section className="pv-card pv-spaced">
          {sectionTitle(q('ARMAZENAMENTO', 'STORAGE', 'ALMACENAMIENTO'), q('Banco de baterias', 'Battery bank', 'Banco de baterías'))}
          {textField(q('Fabricante e modelo da bateria', 'Battery manufacturer and model', 'Fabricante y modelo de batería'), project.batteryName, batteryName => setProject(p => ({...p, batteryName, batteryConfirmed: false})))}
          {fields(['batteryV', 'unitV', 'batteryAh', 'dod', 'batteryDisEff', 'batteryRoundEff', 'batteryMaxA', 'batterySeriesMax', 'autonomyDays', 'batteryIz'])}
          {result && resultRows([
            [q('Banco requerido / arranjo arredondado', 'Required / rounded bank capacity', 'Banco requerido / redondeado'), n(result.batteryNeededKwh) + ' / ' + n(result.batteryKwh) + ' kWh'],
            [q('Associação proposta', 'Proposed configuration', 'Asociación propuesta'), result.batterySeries + 'S × ' + result.batteryParallel + 'P'],
            [q('Energia útil disponível em CA', 'Usable energy available in AC', 'Energía útil disponible en CA'), n(result.batteryUsableKwh) + ' kWh']
          ])}
          <label className="pv-check"><input type="checkbox" checked={project.batteryConfirmed} onChange={event => setProject(p => ({...p, batteryConfirmed: event.target.checked}))}/>
            {q('Conferi BMS, capacidade, associação e compatibilidade com o inversor.', 'I verified BMS, capacity, configuration and inverter compatibility.', 'Verifiqué BMS, capacidad, asociación y compatibilidad con el inversor.')}</label>
        </section>}
      </>}

      {step === 3 && <div className="pv-panel-grid">
        <section className="pv-card">
          {sectionTitle('04 / CC', q('Strings, cabos solares e proteção', 'Strings, solar cables and protection', 'Cadenas, cables solares y protección'))}
          {fields(['minTemp', 'maxCellTemp', 'iscFactor', 'fuseFactor', 'backfeedA'])}
          <label className="pv-field pv-spaced"><span>{q('Configuração das strings', 'String configuration', 'Configuración de cadenas')}</span>
            <select value={project.stringMode} onChange={event => setProject(p => ({...p, stringMode: event.target.value as PVProject['stringMode']}))}>
              <option value="auto">{q('Automática · conferir limites', 'Automatic · verify limits', 'Automática · verificar límites')}</option>
              <option value="manual">{q('Manual · testar configuração', 'Manual · test configuration', 'Manual · probar configuración')}</option>
            </select>
          </label>
          {project.stringMode === 'manual' && fields(['manualNs', 'manualStrings'])}
          <label className="pv-field pv-spaced"><span>{q('Base de resistência e capacidade do cabo CC', 'DC cable resistance and ampacity basis', 'Base de resistencia y capacidad del cable CC')}</span>
            <select value={project.cableMethod} onChange={event => setProject(p => ({...p, cableMethod: event.target.value as PVProject['cableMethod']}))}>
              <option value="prysun40">{q('Referência Prysun · ar livre a 40°C', 'Prysun reference · free air at 40°C', 'Referencia Prysun · aire libre a 40°C')}</option>
              <option value="manual">{q('Manual · datasheet do cabo e instalação', 'Manual · cable datasheet and installation', 'Manual · ficha del cable e instalación')}</option>
            </select>
          </label>
          <p className="pv-note">{q('A tabela Prysun usa dois cabos encostados ao ar livre, expostos ao sol, ambiente de 40°C e condutor de 90°C. Corrija para o ambiente e agrupamento reais.',
            'The Prysun table assumes two touching cables in free air, exposed to sun, ambient 40°C and conductor 90°C. Correct for actual environment and grouping.',
            'La tabla Prysun usa dos cables en contacto al aire libre, al sol, ambiente de 40°C y conductor de 90°C. Corrige según ambiente y agrupamiento reales.')}</p>
          {fields(['dcLength', 'cableTemp', 'dcDrop', 'dcCorrection', 'dcGroup'])}
          <label className="pv-field pv-spaced"><span>{t(pvFieldLabels.dcSection.label)}</span>
            <select value={v.dcSection} onChange={event => setProject(p => ({...p, inputs: {...p.inputs, dcSection: Number(event.target.value)},
              ...(p.cableMethod === 'manual' ? {inputs: {...p.inputs, dcSection: Number(event.target.value), dcIz: 0, dcR20: 0}} : {})}))}>
              {cableSections.map(section => <option key={section} value={section}>{n(section, 1)} mm²</option>)}
            </select>
          </label>
          {project.cableMethod === 'manual' && fields(['dcR20', 'dcIz'])}
          {result && <>
            {resultRows([
              [q('Distribuição das strings por MPPT', 'String distribution per MPPT', 'Distribución de cadenas por MPPT'), result.distribution.join(' / ')],
              [q('Voc da string no frio', 'Cold string Voc', 'Voc de cadena en frío'), n(result.stringVoc) + ' V'],
              [q('Vmp da string no calor', 'Hot string Vmp', 'Vmp de cadena en caliente'), n(result.stringVmpHot) + ' V'],
              [q('Resistência à temperatura adotada', 'Resistance at selected temperature', 'Resistencia a temperatura adoptada'), n(result.dcResistance, 3) + ' Ω/km'],
              [q('Queda de tensão da string', 'String voltage drop', 'Caída de tensión de cadena'), n(result.dcDropV) + ' V · ' + n(result.dcDropPercent) + '%'],
              [q('Capacidade corrigida do cabo', 'Corrected cable ampacity', 'Capacidad corregida del cable'), n(result.dcIz) + ' A'],
              [q('Seção sugerida por queda e critério aplicado', 'Suggested section for applied criteria', 'Sección sugerida según criterios aplicados'), result.recommendedSection === null ? '—' : n(result.recommendedSection, 1) + ' mm²']
            ])}
            {result.recommendedSection !== null && result.recommendedSection !== v.dcSection && <Button icon="check" onClick={() => setProject(p => ({
              ...p, inputs: {...p.inputs, dcSection: result.recommendedSection!, ...(p.cableMethod === 'manual' ? {dcIz: 0, dcR20: 0} : {})}
            }))}>{q('Adotar seção sugerida', 'Use suggested cross-section', 'Adoptar sección sugerida')}</Button>}
          </>}
          <p className="pv-note">{q('L é o comprimento de ida. A queda inclui os dois condutores da string. No modo manual, confira R20 e Iz para a seção selecionada.',
            'L is one-way length. Voltage drop includes both string conductors. In manual mode, verify R20 and ampacity for the selected section.',
            'L es la longitud de ida. La caída incluye ambos conductores de la cadena. En modo manual, verifica R20 e Iz de la sección seleccionada.')}</p>
        </section>
        <section className="pv-card">
          {sectionTitle(q('CA / PROTEÇÕES', 'AC / PROTECTION', 'CA / PROTECCIONES'), q('Circuito CA e pré-seleção', 'AC circuit and preselection', 'Circuito CA y preselección'))}
          <label className="pv-field"><span>{t(pvFieldLabels.phases.label)}</span><select value={v.phases} onChange={event => setValue('phases', Number(event.target.value))}>
            <option value="1">{q('1 circuito de 2 fios · mono/bifásico', 'One two-wire circuit · single/split phase', 'Un circuito de dos hilos · mono/bifásico')}</option>
            <option value="3">{q('Trifásico · tensão entre fases', 'Three-phase · line-to-line voltage', 'Trifásico · tensión entre fases')}</option>
          </select></label>
          {fields(['acV', 'pf', 'inverterAcA', 'acLength', 'acSection', 'acIz', 'acCorrection', 'acDrop'])}
          {result && resultRows([
            [q('Corrente CA de cálculo', 'Design AC current', 'Corriente CA de cálculo'), n(result.acCurrent) + ' A'],
            [q('Disjuntor CA preliminar', 'Preliminary AC circuit breaker', 'Interruptor CA preliminar'), (result.acBreakerA ?? '—') + ' A'],
            [q('Queda de tensão CA estimada', 'Estimated AC voltage drop', 'Caída CA estimada'), n(result.acDropPercent) + '%'],
            [q('Fusível gPV pré-selecionado', 'Preselected gPV fuse', 'Fusible gPV preseleccionado'), (result.fuseA ?? '—') + ' A'],
            [q('Necessidade gPV pelo retorno declarado', 'gPV requirement from declared backfeed', 'Necesidad gPV según retorno declarado'), result.fuseNeeded ? q('Sim · validar coordenação', 'Yes · verify coordination', 'Sí · validar coordinación') : q('Conferir com o fabricante', 'Verify with manufacturer', 'Verificar con fabricante')],
            [q('Seccionador CC · corrente por MPPT', 'DC switch · current per MPPT', 'Seccionador CC · corriente por MPPT'), '≥ ' + n(result.mpptShortCircuit) + ' A'],
            ['DPS CC · Ucpv', '> ' + n(result.stringVoc) + ' V'],
            ...(storage ? [[q('Corrente / proteção principal de bateria', 'Battery current / main protection', 'Corriente / protección principal de batería'), n(result.batteryCurrent) + ' / ' + (result.batteryFuseA ?? '—') + ' A'] as [string, string]] : [])
          ])}
          <p className="pv-note">{q('A queda CA é uma estimativa resistiva em cobre. Reatância e condições reais do circuito exigem verificação.', 'AC drop is a resistive copper estimate. Reactance and actual circuit conditions require verification.', 'La caída CA es una estimación resistiva en cobre. Reactancia y condiciones reales requieren verificación.')}</p>
          <p className="pv-notice">{q('O cálculo seleciona correntes nominais preliminares. Tipo de DPS/DR, curvas, Icc, capacidade de interrupção e coordenação com o fabricante dependem da instalação.',
            'The calculation preselects nominal current ratings. SPD/RCD type, curves, fault current, interrupting capacity and manufacturer coordination depend on the installation.',
            'El cálculo preselecciona corrientes nominales. Tipo de DPS/DR, curvas, Icc, poder de corte y coordinación con fabricante dependen de la instalación.')}</p>
        </section>
      </div>}

      {step === 4 && <>
        <section className="pv-card">
          {sectionTitle('05 / ' + q('MEMÓRIA', 'CALCULATIONS', 'MEMORIA'), q('Do dado ao resultado', 'From data to result', 'Del dato al resultado'))}
          {result && resultRows([
            ['P_FV = E_d / (HSP × PR' + (project.system === 'offgrid' ? ' × η_inv × η_bat' : '') + ')', n(result.requiredKWp) + ' kWp'],
            ['N = strings × ' + q('módulos em série', 'series modules', 'módulos en serie'), result.strings + ' × ' + result.ns + ' = ' + result.modules],
            ['Voc_frio = Voc × [1 + β_Voc × (T_min − 25)]', n(result.vocCold) + ' V'],
            ['Vmp_quente = Vmp × [1 + β_Vmp × (T_cél − 25)]', n(result.vmpHot) + ' V'],
            ['R(T) = R20 × [1 + α_Cu × (T − 20)]', n(result.dcResistance, 3) + ' Ω/km'],
            ['ΔV_CC = 2 × R(T) × L × I / 1000', n(result.dcDropV) + ' V · ' + n(result.dcDropPercent) + '%'],
            ['I_CA = P_CA / (k × V_CA × FP)', n(result.acCurrent) + ' A'],
            ...(storage ? [['C_bat = E_d × autonomia / (DoD × η_desc × η_inv)', n(result.batteryNeededKwh) + ' kWh'] as [string, string]] : [])
          ])}
          <p className="pv-note">{q('Coeficientes e rendimentos entram como frações nas fórmulas. k=1 no circuito CA de dois fios e k=√3 no trifásico. A corrente CA também considera o máximo declarado no datasheet. PR e demais premissas constam no PDF.',
            'Coefficients and efficiencies are fractions in the formulas. k=1 for two-wire AC and k=√3 for three-phase AC. AC current also considers the declared datasheet maximum. The PDF records PR and other assumptions.',
            'Coeficientes y rendimientos son fracciones en las fórmulas. k=1 en CA de dos hilos y k=√3 en trifásico. La corriente CA también considera el máximo declarado en ficha. El PDF registra PR y supuestos.')}</p>
        </section>
        {result && <section className="pv-card pv-spaced">
          {sectionTitle(q('UNIFILAR', 'SINGLE-LINE', 'UNIFILAR'), q('Diagrama do sistema', 'System diagram', 'Diagrama del sistema'),
            q('O diagrama acompanha o tipo de projeto, as strings, cabos e correntes calculadas.', 'The diagram follows the project type, strings, cables and calculated currents.', 'El diagrama refleja tipo de proyecto, cadenas, cables y corrientes calculadas.'))}
          <div className="pv-diagram-scroll"><PVUnifilar project={project} result={result} lang={lang} diagramRef={diagram}/></div>
        </section>}
        <section className="pv-card pv-spaced">
          {sectionTitle(q('VALIDAÇÃO', 'VALIDATION', 'VALIDACIÓN'), q('Verificações e pontos de revisão', 'Checks and review points', 'Verificaciones y puntos de revisión'))}
          {result && <div className="pv-checks">{result.checks.map(check => <div key={check.id} data-kind={check.kind}>
            <Icon name={check.kind === 'pass' ? 'check' : check.kind === 'error' ? 'close' : 'info'}/>
            <div><strong>{t(check.title)}</strong>{check.detail && <p>{check.detail}</p>}</div>
            <span>{check.kind === 'pass' ? 'OK' : check.kind === 'error' ? q('REVER', 'FAIL', 'REVISAR') : q('VALIDAR', 'REVIEW', 'VALIDAR')}</span>
          </div>)}</div>}
        </section>
        <section className="pv-card pv-spaced">
          {sectionTitle(q('INSTALAÇÃO', 'INSTALLATION', 'INSTALACIÓN'), q('Orientações técnicas', 'Technical guidance', 'Orientaciones técnicas'))}
          <ol className="pv-guidance">{installationGuidance.map((item, i) => <li key={i}>{t(item)}</li>)}</ol>
          <label className="pv-field"><span>{q('Observações para o relatório', 'Report notes', 'Observaciones del informe')}</span>
            <textarea rows={4} maxLength={6000} value={project.notes} onChange={event => setProject(p => ({...p, notes: event.target.value}))}/>
          </label>
          <details className="pv-details"><summary>{q('Referências técnicas consultáveis', 'Technical references', 'Referencias técnicas consultables')}</summary>
            <div className="pv-references">{pvReferences.map(ref => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer">{ref.name}<Icon name="external"/></a>)}</div>
          </details>
        </section>
        <div className="pv-export">
          <div><strong>{q('Relatório com identidade BioEnergia Academy', 'Report with BioEnergia Academy branding', 'Informe con identidad BioEnergia Academy')}</strong>
            <p>{q('Inclui premissas, memória de cálculo, unifilar, verificações e referências. As pendências aparecem no PDF.',
              'Includes assumptions, calculations, diagram, checks and references. Review items appear in the PDF.',
              'Incluye supuestos, memoria, unifilar, verificaciones y referencias. Los pendientes aparecen en el PDF.')}</p></div>
          <Button icon="download" kind="primary" disabled={!result || busy !== null} onClick={() => void generatePDF()}>
            {busy === 'pdf' ? q('Gerando PDF…', 'Generating PDF…', 'Generando PDF…') : q('Gerar relatório PDF', 'Generate PDF report', 'Generar informe PDF')}
          </Button>
        </div>
        {pdfDownload?.snapshot === project && pdfDownload.lang === lang && <p className="pv-pdf-ready" role="status">
          <Icon name="check"/>{q('PDF pronto.', 'PDF ready.', 'PDF listo.')}
          <a href={pdfDownload.url} download={pdfDownload.filename}>{q('Baixar PDF gerado', 'Download generated PDF', 'Descargar PDF generado')}</a>
        </p>}
      </>}
      <div className="pv-step-footer">
        <Button icon="back" disabled={step === 0} onClick={() => changeStep(step - 1)}>{q('Etapa anterior', 'Previous step', 'Etapa anterior')}</Button>
        <span>{result ? errors ? errors + ' ' + q('verificações para corrigir', 'checks to correct', 'verificaciones a corregir') : q('Verificações numéricas atendidas · revisar pendências', 'Numerical checks met · review pending items', 'Verificaciones numéricas cumplidas · revisar pendientes') : q('Corrija os dados de entrada', 'Correct input data', 'Corrige datos de entrada')}</span>
        {step < 4 && <Button icon="arrow" kind="primary" onClick={() => changeStep(step + 1)}>{q('Próxima etapa', 'Next step', 'Siguiente etapa')}</Button>}
      </div>
      <p className="pv-disclaimer">{q('Ferramenta de estudo preliminar. A execução exige levantamento do local, validação dos fabricantes e responsabilidade técnica. Consultas online precisam de internet. O rascunho, os cálculos e a geração de PDF funcionam com os arquivos locais da plataforma.',
        'Preliminary study tool. Installation requires a site survey, manufacturer validation and professional responsibility. Online queries require internet. Drafts, calculations and PDF generation work with the platform’s local files.',
        'Herramienta de estudio preliminar. La ejecución requiere levantamiento del lugar, validación de fabricantes y responsabilidad técnica. Consultas online requieren internet. Borrador, cálculos y PDF funcionan con archivos locales de la plataforma.')}</p>
    </section>
  );
}
