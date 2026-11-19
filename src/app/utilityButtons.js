const utilities = [
  ['data-panel', 'Data Layers'],
  ['pp-toggles', 'Display'],
  ['cctv-panel', 'CCTV'],
  ['street-level-panel', 'Street Level'],
  ['global-context-panel', 'Context'],
];
export function installUtilityButtons() {
  document.body.classList.add('window-game-layout');
  const nav = document.createElement('nav');
  nav.id = 'window-utilities';
  nav.setAttribute('aria-label', 'Map tools');
  const observers = [];
  const entries = utilities
    .map(([id, name]) => {
      const panel = document.getElementById(id);
      const native = panel?.querySelector(
        '[data-collapse-target="' + id + '"]',
      );
      if (!panel || !native) return null;
      panel.classList.add('window-utility-panel');
      panel.classList.remove(
        'layout-auto-collapsed',
        'cyber-accordion-collapsed',
      );
      if (!panel.classList.contains('collapsed')) native.click();
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = name;
      button.setAttribute('aria-controls', id);
      nav.append(button);
      return { panel, native, button };
    })
    .filter(Boolean);
  function sync() {
    let open = false;
    for (const entry of entries) {
      const expanded = !entry.panel.classList.contains('collapsed');
      entry.button.setAttribute('aria-expanded', String(expanded));
      open ||= expanded;
    }
    document.body.classList.toggle('window-utility-open', open);
  }
  for (const entry of entries) {
    entry.button.addEventListener('click', () => {
      const opening = entry.panel.classList.contains('collapsed');
      if (opening)
        for (const peer of entries) {
          if (peer !== entry && !peer.panel.classList.contains('collapsed'))
            peer.native.click();
        }
      entry.panel.parentElement?.classList.remove(
        'layout-exclusive',
        'layout-focus',
      );
      entry.panel.classList.remove(
        'layout-hidden',
        'layout-auto-collapsed',
        'cyber-accordion-collapsed',
      );
      entry.native.click();
      sync();
    });
    const observer = new MutationObserver(sync);
    observer.observe(entry.panel, {
      attributes: true,
      attributeFilter: ['class'],
    });
    observers.push(observer);
  }
  document.body.append(nav);
  sync();
  return () => {
    observers.forEach((observer) => observer.disconnect());
    nav.remove();
    entries.forEach((entry) =>
      entry.panel.classList.remove('window-utility-panel'),
    );
    document.body.classList.remove('window-game-layout', 'window-utility-open');
  };
}
