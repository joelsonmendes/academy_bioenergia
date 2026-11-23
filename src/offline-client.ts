import {useCallback, useEffect, useRef, useState} from 'react';

export interface OfflineState {
  state: 'checking' | 'downloading' | 'ready' | 'incomplete' | 'error' | 'unsupported' | 'portable';
  completed: number;
  total: number;
  bytes: number;
  totalBytes: number;
  version: string;
  checkedAt: string;
  error?: 'space' | 'download';
}

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

const baseURL = new URL('./', location.href).href;
const initialState: OfflineState = {
  state: location.protocol === 'file:' ? 'portable' : 'checking',
  completed: 0, total: 0, bytes: 0, totalBytes: 0, version: '', checkedAt: ''
};

function workerRequest(worker: ServiceWorker, type: string): Promise<OfflineState> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const finish = () => { clearTimeout(timer); channel.port1.close(); };
    const timer = setTimeout(() => { finish(); reject(new Error('OFFLINE_TIMEOUT')); },
      type === 'bioenergia-offline-prepare' ? 120000 : 15000);
    channel.port1.onmessage = event => { finish(); resolve(event.data); };
    try { worker.postMessage({type}, [channel.port2]); }
    catch (error) { finish(); reject(error); }
  });
}

async function activeWorker() {
  let registration = await navigator.serviceWorker.getRegistration(baseURL);
  if (!registration || registration.scope !== baseURL) {
    registration = await navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'});
  }
  if (registration.active) return {registration, worker: registration.active};
  const installing = registration.installing ?? registration.waiting;
  if (!installing) throw new Error('OFFLINE_WORKER');
  await new Promise<void>((resolve, reject) => {
    const finish = () => { clearTimeout(timer); installing.removeEventListener('statechange', check); };
    const timer = setTimeout(() => { finish(); reject(new Error('OFFLINE_TIMEOUT')); }, 120000);
    const check = () => {
      if (installing.state === 'activated') { finish(); resolve(); }
      if (installing.state === 'redundant') { finish(); reject(new Error('OFFLINE_INSTALL')); }
    };
    installing.addEventListener('statechange', check);
    check();
  });
  return {registration, worker: registration.active ?? installing};
}

export function useOfflineAccess() {
  const [offline, setOffline] = useState<OfflineState>(initialState);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches);
  const [persistent, setPersistent] = useState(false);
  const pending = useRef<Promise<void> | null>(null);
  const supported = location.protocol !== 'file:' && isSecureContext &&
    'serviceWorker' in navigator && 'caches' in window;

  const checkOffline = useCallback(async (repair = false) => {
    if (location.protocol === 'file:') return;
    if (!supported) { setOffline({...initialState, state: 'unsupported'}); return; }
    try {
      const {registration, worker} = await activeWorker();
      if (!repair && navigator.onLine) void registration.update().catch(() => {});
      const status = await workerRequest(worker, repair ? 'bioenergia-offline-prepare' : 'bioenergia-offline-status');
      setOffline(status);
    } catch {
      setOffline(previous => ({...previous, state: 'error', error: 'download'}));
    }
  }, [supported]);

  const prepareOffline = useCallback(() => {
    if (pending.current) return pending.current;
    if (supported) setOffline(previous => ({...previous, state: 'downloading', error: undefined}));
    pending.current = checkOffline(true).finally(() => { pending.current = null; });
    return pending.current;
  }, [checkOffline, supported]);

  const protectStorage = useCallback(async () => {
    try {
      const granted = await navigator.storage?.persist?.();
      setPersistent(granted === true);
      return granted === true;
    } catch { return false; }
  }, []);

  useEffect(() => {
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const onInstalled = () => { setInstallEvent(null); setInstalled(true); };
    const media = matchMedia('(display-mode: standalone)');
    const onDisplay = () => setInstalled(media.matches);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', onDisplay);
    void navigator.storage?.persisted?.().then(setPersistent).catch(() => {});
    void checkOffline();
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onDisplay);
    };
  }, [checkOffline]);

  useEffect(() => {
    const refresh = () => { void checkOffline(); };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'bioenergia-offline' && event.data.scope === baseURL) setOffline(event.data);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    navigator.serviceWorker?.addEventListener('controllerchange', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      navigator.serviceWorker?.removeEventListener('controllerchange', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, [checkOffline]);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  return {
    offline, prepareOffline, checkOffline, persistent, protectStorage, installed, install,
    canInstall: !!installEvent,
    offlineReady: offline.state === 'ready' || offline.state === 'portable',
    offlineMessage: offline.state === 'unsupported' ? 'https' : offline.state === 'error' ? 'retry' :
      offline.state === 'ready' ? 'ready' : offline.state === 'portable' ? 'file' : ''
  };
}

export async function portablePlatformHTML() {
  if (document.documentElement.dataset.distribution === 'modular') {
    const response = await fetch('./plataforma-portatil.html');
    if (!response.ok) throw new Error('PORTABLE_DOWNLOAD');
    return response.text();
  }
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelector('#root')?.replaceChildren();
  clone.querySelector('base')?.remove();
  clone.querySelector('link[rel=manifest]')?.remove();
  return '<!doctype html>' + clone.outerHTML;
}
