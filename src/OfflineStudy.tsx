import React, {useRef, useState} from 'react';
import {Button, Download, Heading, Icon} from './components';
import {useApp} from './store';
import {useLearning} from './learning-store';
import {lessons, T} from './model';
import {sourceKeys} from './energy';
import {portablePlatformHTML} from './offline-client';
import {studyGuide} from './study-export.js';
import studyLessons from './amazon-lessons.json';

function useText() {
  const {t} = useApp();
  return (pt: string, en: string, es: string) => t(T(pt, en, es));
}

export function OfflineAccess() {
  const {navigate} = useApp();
  const {offlineReady, isOnline} = useLearning();
  const q = useText();
  const label = !isOnline ? q('Sem conexão', 'No connection', 'Sin conexión') :
    offlineReady ? q('Offline pronto', 'Offline ready', 'Sin conexión listo') :
    q('Preparar offline', 'Prepare offline', 'Preparar sin conexión');
  return <button className="offline-access" type="button" onClick={() => navigate('offline')}
    aria-label={q('Estudar offline', 'Study offline', 'Estudiar sin conexión')} title={label}>
    <Icon name={offlineReady ? 'check' : 'download'}/><span>{label}</span>
  </button>;
}

export function OfflinePreparation() {
  const q = useText();
  const learning = useLearning();
  const {offline, offlineReady} = learning;
  const [message, setMessage] = useState('');
  const preparing = offline.state === 'downloading' || offline.state === 'checking';
  const titles = {
    checking: q('Verificando conteúdo neste dispositivo…', 'Checking content on this device…', 'Verificando contenido en este dispositivo…'),
    downloading: q('Preparando seu acesso offline…', 'Preparing offline access…', 'Preparando tu acceso sin conexión…'),
    ready: q('Pronto para estudar sem internet', 'Ready to study without internet', 'Listo para estudiar sin internet'),
    portable: q('Você está usando a cópia portátil', 'You are using the portable copy', 'Estás usando la copia portátil'),
    incomplete: q('O conteúdo precisa ser preparado', 'Content needs preparation', 'El contenido necesita preparación'),
    unsupported: q('Use a cópia HTML neste navegador', 'Use the HTML copy in this browser', 'Usa la copia HTML en este navegador'),
    error: q('A preparação precisa ser concluída', 'Preparation needs to finish', 'La preparación necesita completarse')
  };
  return <section className="panel offline-preparation" aria-labelledby="offline-status-title" aria-busy={preparing}>
    <div className="offline-status-heading"><span className="offline-symbol"><Icon name={offlineReady ? 'check' : 'download'}/></span>
      <div><h2 id="offline-status-title" role="status">{titles[offline.state]}</h2>
        <p>{learning.isOnline ? q('Conexão de rede disponível no dispositivo.', 'A network connection is available on this device.', 'El dispositivo tiene conexión de red.') :
          q('Dispositivo sem conexão. Os recursos já preparados continuam disponíveis.', 'Device offline. Prepared resources remain available.', 'Dispositivo sin conexión. Los recursos preparados siguen disponibles.')}</p>
      </div>
    </div>
    {offline.total > 0 && <div className="offline-progress">
      <progress max={offline.total} value={offline.completed} aria-label={q('Arquivos conferidos para estudo offline', 'Verified offline study files', 'Archivos verificados para estudiar sin conexión')}/>
      <span>{q(`${offline.completed} de ${offline.total} arquivos conferidos`, `${offline.completed} of ${offline.total} files verified`, `${offline.completed} de ${offline.total} archivos verificados`)}
        {' · '}{(offline.bytes / 1048576).toFixed(1)} MB</span>
    </div>}
    {offline.state === 'error' && <p className="offline-error" role="alert">{offline.error === 'space'
      ? q('O armazenamento está cheio. Baixe a cópia HTML ou libere espaço e tente novamente.', 'Storage is full. Download the HTML copy or free space and retry.', 'El almacenamiento está lleno. Descarga la copia HTML o libera espacio y vuelve a intentar.')
      : q('Mantenha a conexão e tente novamente. A conferência identifica os arquivos que ainda faltam.', 'Keep the connection and retry. Verification identifies files still missing.', 'Mantén la conexión y vuelve a intentar. La verificación identifica los archivos pendientes.')}</p>}
    {offline.state === 'unsupported' && <p>{q('O acesso pelo navegador precisa de HTTPS ou localhost e suporte a armazenamento offline. A versão HTML pode ser levada em um pendrive.', 'Browser offline access needs HTTPS or localhost and offline storage support. The HTML version can be carried on a USB drive.', 'El acceso sin conexión requiere HTTPS o localhost y almacenamiento compatible. La versión HTML se puede llevar en una memoria USB.')}</p>}
    <div className="offline-actions">
      {offline.state !== 'portable' && offline.state !== 'unsupported' && <Button icon="download" kind="primary" disabled={preparing}
        onClick={() => void learning.prepareOffline()}>{offlineReady ? q('Conferir acesso offline', 'Verify offline access', 'Verificar acceso sin conexión') :
          q('Preparar neste dispositivo', 'Prepare on this device', 'Preparar en este dispositivo')}</Button>}
      {learning.canInstall && <Button icon="plus" disabled={!offlineReady} onClick={() => void learning.install()}>
        {q('Instalar aplicativo', 'Install app', 'Instalar aplicación')}</Button>}
      {offlineReady && offline.state !== 'portable' && !learning.persistent && <Button icon="save" onClick={() => void learning.protectStorage().then(granted =>
        setMessage(granted ? q('Proteção persistente ativada.', 'Persistent storage enabled.', 'Almacenamiento persistente activado.') :
          q('O navegador mantém o armazenamento padrão. Guarde também uma cópia do caderno.', 'The browser uses standard storage. Keep a notebook backup as well.', 'El navegador mantiene almacenamiento estándar. Guarda también una copia del cuaderno.')))}>
        {q('Proteger armazenamento local', 'Protect local storage', 'Proteger almacenamiento local')}</Button>}
    </div>
    {learning.installed && <p>{q('Aplicativo instalado neste dispositivo.', 'App installed on this device.', 'Aplicación instalada en este dispositivo.')}</p>}
    {learning.persistent && <p>{q('O navegador concedeu armazenamento persistente para este dispositivo.', 'The browser granted persistent storage on this device.', 'El navegador concedió almacenamiento persistente en este dispositivo.')}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}

export default function OfflineStudy() {
  const q = useText();
  const {t, lang, navigate} = useApp();
  const learning = useLearning();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [downloading, setDownloading] = useState(false);
  const downloadPlatform = async () => {
    setDownloading(true);
    try {
      Download('BioEnergia_Academy_Offline.html', await portablePlatformHTML(), 'text/html;charset=utf-8');
      setMessage(q('Cópia HTML preparada para download. Guarde o arquivo e abra-o no navegador para estudar sem internet.', 'HTML copy prepared for download. Keep the file and open it in a browser to study offline.', 'Copia HTML preparada para descargar. Guarda el archivo y ábrelo en el navegador para estudiar sin internet.'));
    } catch {
      setMessage(q('Não foi possível obter a cópia. Conecte-se e tente novamente.', 'Could not obtain the copy. Connect and retry.', 'No se pudo obtener la copia. Conéctate y vuelve a intentar.'));
    } finally { setDownloading(false); }
  };
  const exportNotebook = async () => {
    try {
      await learning.saveNow();
      Download('BioEnergia_Caderno.json', learning.backup(), 'application/json');
      setMessage(q('Backup do caderno preparado para download.', 'Notebook backup prepared for download.', 'Respaldo del cuaderno preparado para descargar.'));
    } catch {
      Download('BioEnergia_Caderno.json', learning.backup(), 'application/json');
      setMessage(q('O navegador não confirmou a gravação local. Guarde o backup baixado antes de fechar.', 'The browser could not confirm local saving. Keep the downloaded backup before closing.', 'El navegador no confirmó el guardado local. Conserva la copia descargada antes de cerrar.'));
    }
  };
  return <div className="offline-study">
    <Heading eyebrow={T('SEU LABORATÓRIO, ONDE VOCÊ ESTIVER', 'YOUR LABORATORY, WHEREVER YOU ARE', 'TU LABORATORIO, DONDE ESTÉS')}
      title={T('Estudar offline', 'Study offline', 'Estudiar sin conexión')}
      description={T('Prepare o conteúdo uma vez com internet e continue aprendendo no celular ou computador da comunidade.', 'Prepare content once with internet and keep learning on your phone or community computer.', 'Prepara el contenido una vez con internet y sigue aprendiendo en tu celular o computadora comunitaria.')}/>
    <OfflinePreparation/>
    <div className="offline-grid">
      <section className="panel" aria-labelledby="offline-transfer-title">
        <h2 id="offline-transfer-title">{q('Leve a plataforma em um pendrive', 'Take the platform on a USB drive', 'Lleva la plataforma en una memoria USB')}</h2>
        <p>{q('O arquivo HTML reúne a plataforma, imagens e simuladores. Copie para um computador com navegador atualizado e abra o arquivo, mesmo no primeiro acesso sem internet.', 'The HTML file includes the platform, images and simulators. Copy it to a computer with an up-to-date browser and open it, even for a first visit without internet.', 'El archivo HTML incluye la plataforma, imágenes y simuladores. Cópialo a una computadora con navegador actualizado y ábrelo, incluso en el primer acceso sin internet.')}</p>
        <div className="offline-actions"><Button icon="download" kind="primary" disabled={downloading} onClick={() => void downloadPlatform()}>
          {downloading ? q('Preparando arquivo…', 'Preparing file…', 'Preparando archivo…') : q('Baixar plataforma completa', 'Download complete platform', 'Descargar plataforma completa')}</Button>
          <Button icon="book" onClick={() => Download('BioEnergia_Apostila_Amazonia.html', studyGuide(studyLessons, lang, SENAI_HUB_LOGO), 'text/html;charset=utf-8')}>
            {q('Baixar apostila', 'Download study guide', 'Descargar guía')}</Button></div>
      </section>
      <section className="panel" aria-labelledby="offline-notebook-title">
        <h2 id="offline-notebook-title">{q('Guarde seu caderno de estudos', 'Keep your study notebook', 'Conserva tu cuaderno de estudio')}</h2>
        <p>{q('Anotações, atividades e cenários são salvos neste navegador. Exporte o caderno para levar seu progresso a outro dispositivo. A importação substitui o caderno que estiver aberto.', 'Notes, activities and scenarios are saved in this browser. Export the notebook to transfer progress to another device. Import replaces the currently open notebook.', 'Notas, actividades y escenarios se guardan en este navegador. Exporta el cuaderno para llevar el progreso a otro dispositivo. La importación sustituye el cuaderno abierto.')}</p>
        <p>{q('A limpeza dos dados do navegador pode remover o conteúdo e os cadernos locais. Guarde um backup em arquivo.', 'Clearing browser data can remove content and local notebooks. Keep a backup file.', 'Borrar los datos del navegador puede eliminar el contenido y los cuadernos locales. Guarda una copia en archivo.')}</p>
        <div className="offline-actions"><Button icon="download" onClick={() => void exportNotebook()}>{q('Exportar caderno', 'Export notebook', 'Exportar cuaderno')}</Button>
          <Button icon="save" onClick={() => fileInput.current?.click()}>{q('Importar caderno', 'Import notebook', 'Importar cuaderno')}</Button></div>
        <input ref={fileInput} type="file" hidden accept=".json,application/json" onChange={async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 550000) throw new Error('BACKUP_SIZE');
            learning.importBackup(await file.text());
            setMessage(q('Caderno importado. Aguarde a confirmação de salvamento local.', 'Notebook imported. Wait for local saving confirmation.', 'Cuaderno importado. Espera la confirmación del guardado local.'));
          } catch { setMessage(q('Arquivo incompatível. Escolha um backup JSON exportado pela plataforma.', 'Incompatible file. Choose a JSON backup exported by the platform.', 'Archivo incompatible. Elige un respaldo JSON exportado por la plataforma.')); }
          event.target.value = '';
        }}/>
        <small className="offline-save-state" role="status">{learning.storage === 'memory'
          ? q('Gravação local indisponível. Exporte seu caderno antes de sair.', 'Local saving unavailable. Export your notebook before leaving.', 'Guardado local no disponible. Exporta tu cuaderno antes de salir.')
          : learning.lastSaved ? q('Caderno salvo neste dispositivo.', 'Notebook saved on this device.', 'Cuaderno guardado en este dispositivo.') :
            q('Preparando o armazenamento do caderno…', 'Preparing notebook storage…', 'Preparando el almacenamiento del cuaderno…')}</small>
      </section>
    </div>
    {message && <p className="offline-feedback" role="status">{message}</p>}
    <section className="panel offline-learning" aria-labelledby="offline-included-title">
      <h2 id="offline-included-title">{q('Continue suas atividades sem conexão', 'Continue activities without a connection', 'Continúa las actividades sin conexión')}</h2>
      <p>{q('Conteúdos internos, fórmulas, simuladores, laboratórios 3D, bancada fotovoltaica e geração de relatórios em PDF usam os recursos incluídos na plataforma.', 'Internal content, formulas, simulations, 3D labs, the PV wiring bench and PDF report generation use resources included in the platform.', 'El contenido interno, las fórmulas, simuladores, laboratorios 3D, banco fotovoltaico e informes PDF usan los recursos incluidos en la plataforma.')}</p>
      <div className="offline-sources">{sourceKeys.map(source => <Button key={source} icon={lessons[source].icon}
        onClick={() => navigate('sim', source)}>{t(lessons[source].name)}</Button>)}</div>
      <div className="offline-actions"><Button icon="sun" onClick={() => navigate('pvcalc')}>{q('Calculadora FV', 'PV calculator', 'Calculadora FV')}</Button>
        <Button icon="print" onClick={() => navigate('pvreport')}>{q('Relatório técnico', 'Technical report', 'Informe técnico')}</Button>
        <Button icon="globe" onClick={() => navigate('amazon')}>{q('Campus Amazônia', 'Amazon Campus', 'Campus Amazonía')}</Button></div>
      <p className="offline-network-note">{q('Links de pesquisas externas, consulta automática de endereço e dados solares precisam de internet. No projeto fotovoltaico offline, informe coordenadas e HSP manualmente, com a fonte utilizada. A sincronização com a turma depende de um serviço de turma configurado e de conexão com esse serviço.', 'External research links and automatic address and solar data queries need internet. For an offline PV project, enter coordinates and peak sun hours manually and record their source. Class synchronization requires a configured class service and a connection to it.', 'Los enlaces externos y las consultas automáticas de dirección y datos solares requieren internet. En un proyecto FV sin conexión, introduce coordenadas y HSP manualmente y registra su fuente. La sincronización necesita un servicio de clase configurado y conexión a este servicio.')}</p>
    </section>
    <section className="panel offline-instructions" aria-labelledby="offline-how-title">
      <h2 id="offline-how-title">{q('Como acessar depois', 'How to return later', 'Cómo volver después')}</h2>
      <ol><li>{q('Abra a plataforma com internet e aguarde a confirmação de que o conteúdo está pronto.', 'Open the platform with internet and wait for confirmation that content is ready.', 'Abre la plataforma con internet y espera la confirmación de que el contenido está listo.')}</li>
        <li>{q('No Chrome ou Edge, use Instalar aplicativo quando disponível. No iPhone ou iPad, use Compartilhar e Adicionar à Tela de Início no Safari. Você também pode guardar o endereço nos favoritos.', 'In Chrome or Edge, use Install app when available. On iPhone or iPad, use Share and Add to Home Screen in Safari. You can also bookmark the address.', 'En Chrome o Edge, usa Instalar aplicación cuando esté disponible. En iPhone o iPad, usa Compartir y Añadir a pantalla de inicio en Safari. También puedes guardar la dirección en favoritos.')}</li>
        <li>{q('Ative o modo avião, reabra o aplicativo ou o endereço no mesmo navegador e teste um simulador antes de viajar. Para a cópia em pendrive, abra o HTML salvo.', 'Enable airplane mode, reopen the app or address in the same browser and test a simulator before travelling. For a USB copy, open the saved HTML.', 'Activa el modo avión, abre la aplicación o dirección en el mismo navegador y prueba un simulador antes de viajar. Para la copia USB, abre el HTML guardado.')}</li></ol>
    </section>
  </div>;
}
