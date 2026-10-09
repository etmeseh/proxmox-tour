// Kleine DOM-Helfer; Text wird nie als HTML interpretiert.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c);
  return el;
}

// Minimal-Markup: **fett**, `code`, Zeilenumbrüche. Ergebnis sind DOM-Knoten, kein innerHTML.
export function richText(str) {
  const frag = document.createDocumentFragment();
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  str.split('\n').forEach((line, i) => {
    if (i) frag.append(document.createElement('br'));
    line.split(re).forEach((part) => {
      if (!part) return;
      if (part.startsWith('**')) frag.append(h('strong', {}, part.slice(2, -2)));
      else if (part.startsWith('`')) frag.append(h('code', {}, part.slice(1, -1)));
      else frag.append(part);
    });
  });
  return frag;
}
