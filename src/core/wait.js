// Wartet per MutationObserver, bis fn() einen Wahrheitswert liefert.
export function waitFor(fn, timeout = 8000) {
  return new Promise((resolve) => {
    const first = fn();
    if (first) return resolve(first);

    let raf = 0;
    const check = () => {
      raf = 0;
      const hit = fn();
      if (hit) done(hit);
    };
    const obs = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(check);
    });
    const timer = setTimeout(() => done(null), timeout);
    function done(value) {
      obs.disconnect();
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
      resolve(value);
    }
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  });
}
