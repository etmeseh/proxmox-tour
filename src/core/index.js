import driverCss from 'driver.js/dist/driver.css';
import ownCss from './styles.css';
import { isProxmox } from './guard.js';
import { waitFor } from './wait.js';
import { getContext, matches, onChange } from './router.js';
import { pickLanguage } from './i18n.js';
import { createLauncher } from './launcher.js';
import { runTour, stopTour } from './tour-runner.js';
import { showUpdateNotice } from './notice.js';
import { tours } from '../../content/tours/index.js';
import { lessons } from '../../content/lessons/index.js';
import { createApi } from './api.js';
import { createEngine } from './lessons.js';
import { createLessonPanel } from './lesson-panel.js';
import { createArchCheck } from './arch-check.js';

const LANG_KEY = 'tourLang';

// adapter: { storage: { get(key), set(key, value) }, browserLang: string }
export async function init(adapter) {
  if (!isProxmox()) return;
  // Schutz gegen Doppelinstallation (z. B. Userscript + Extension).
  // DOM-Markierung statt window-Flag: wird auch über isolierte Welten hinweg gesehen.
  if (document.documentElement.dataset.pveTour) return;
  document.documentElement.dataset.pveTour = '1';

  // Warten, bis die ExtJS-Oberfläche steht (Login-Dialog zählt nicht).
  const ready = await waitFor(() => document.querySelector('[id^="pveResourceTree"]'), 60000);
  if (!ready) return;

  const style = document.createElement('style');
  style.textContent = driverCss + ownCss;
  document.head.appendChild(style);

  const lang = pickLanguage(await adapter.storage.get(LANG_KEY), adapter.browserLang);
  let currentTour = null;

  const api = createApi();
  const engine = createEngine({ api, storage: adapter.storage, lessons });
  const isAlive = adapter.isAlive || (() => true);
  let launcher;
  let disposeObserver = () => {};
  let watchdog = 0;
  let dead = false;

  // Erweiterung neu geladen/aktualisiert: alles abbauen und zum Neuladen auffordern.
  function die() {
    if (dead) return;
    dead = true;
    const L = launcher ? launcher.getLang() : lang;
    clearInterval(watchdog);
    disposeObserver();
    stopTour();
    panel.close();
    archCheck.destroy();
    launcher?.destroy();
    style.remove();
    delete document.documentElement.dataset.pveTour;
    showUpdateNotice(L);
  }
  const guarded = (fn) => (...a) => (isAlive() ? fn(...a) : die());

  const panel = createLessonPanel({
    engine,
    getLang: () => launcher.getLang(),
    getContextVmid: () => { const c = getContext(); return c.nodeType === 'lxc' ? c.nodeId : null; },
    isAlive,
    onDead: die,
  });
  const archCheck = createArchCheck({ api, getLang: () => launcher.getLang() });

  launcher = createLauncher({
    lang,
    onStart: guarded(() => currentTour && runTour(currentTour, launcher.getLang())),
    onLessons: guarded(() => panel.toggle()),
    onLang: guarded((l) => { adapter.storage.set(LANG_KEY, l); panel.rerender(); }),
  });

  adapter.onInvalidated?.(die);
  // Wächter: liest nur chrome.runtime.id (kein API-Aufruf), erkennt den Verlust auch ohne Klick.
  watchdog = setInterval(() => { if (!isAlive()) die(); }, 3000);

  disposeObserver = onChange(() => {
    if (!isAlive()) return die();
    archCheck.update();
    currentTour = tours.find((tr) => matches(tr.trigger, getContext())) || null;
    launcher.setHasTour(!!currentTour);
  });
}
