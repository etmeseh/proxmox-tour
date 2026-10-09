import { driver } from 'driver.js';
import { find } from './finder.js';
import { waitFor } from './wait.js';
import { t } from './i18n.js';

// Löst Schritte gegen das aktuelle DOM auf; Schritte, deren Ziel fehlt, entfallen.
async function resolveSteps(tour, lang) {
  const steps = [];
  for (const s of tour.steps) {
    const popover = { title: t(lang, `${s.key}.title`), description: t(lang, `${s.key}.body`) };
    if (!s.target) {
      steps.push({ popover });
      continue;
    }
    const el = await waitFor(() => find(s.target), 2500);
    if (!el) {
      console.warn('[proxmox-tour] Ziel nicht gefunden, Schritt übersprungen:', s.key);
      continue;
    }
    steps.push({ element: el, popover: { ...popover, side: s.side || 'bottom', align: 'start' } });
  }
  return steps;
}

let active = null;

export async function runTour(tour, lang) {
  active?.destroy();
  const steps = await resolveSteps(tour, lang);
  if (!steps.length) return;
  active = driver({
    steps,
    showProgress: true,
    allowClose: true,
    nextBtnText: t(lang, 'nav.next'),
    prevBtnText: t(lang, 'nav.prev'),
    doneBtnText: t(lang, 'nav.done'),
    progressText: t(lang, 'nav.progress'),
    popoverClass: 'pvt-popover',
    onDestroyed: () => { active = null; },
  });
  active.drive();
}

export function stopTour() {
  active?.destroy();
}
