import { languages, t } from './i18n.js';

const CSS = `
:host { all: initial; }
.wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; display: flex; gap: 6px; align-items: center;
  font: 13px/1.2 -apple-system, "Segoe UI", Roboto, sans-serif; }
button, select { font: inherit; border-radius: 4px; border: 1px solid #1d6fa5; padding: 7px 12px; }
button { background: #2b8fd6; color: #fff; cursor: pointer; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,.35); }
button:hover:not(:disabled) { background: #1d6fa5; }
button.lessons { background: #3e4c59; border-color: #52606d; }
button:disabled { background: #6b7a85; border-color: #55626b; cursor: default; opacity: .85; }
select { background: #fff; color: #222; padding: 6px; }
`;

export function createLauncher({ lang, onStart, onLessons, onLang }) {
  const host = document.createElement('div');
  host.id = 'pvt-launcher';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${CSS}</style>
    <div class="wrap">
      <select aria-label="language"></select>
      <button type="button" class="lessons"></button>
      <button type="button" class="start"></button>
    </div>`;
  const select = root.querySelector('select');
  const btn = root.querySelector('button.start');
  const lessonsBtn = root.querySelector('button.lessons');

  for (const l of languages) select.add(new Option(l.toUpperCase(), l));
  let current = lang;
  let hasTour = false;

  const render = () => {
    select.value = current;
    select.title = t(current, 'ui.language');
    lessonsBtn.textContent = t(current, 'ui.lessons');
    btn.textContent = t(current, 'ui.start');
    btn.disabled = !hasTour;
    btn.title = hasTour ? '' : t(current, 'ui.noTour');
  };
  select.addEventListener('change', () => { current = select.value; render(); onLang(current); });
  btn.addEventListener('click', () => onStart());
  lessonsBtn.addEventListener('click', () => onLessons());
  render();
  document.body.appendChild(host);

  return {
    setHasTour(v) { if (hasTour !== v) { hasTour = v; render(); } },
    getLang: () => current,
    destroy: () => host.remove(),
  };
}
