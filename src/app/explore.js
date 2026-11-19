import { mountCityGame } from './city-game.js';
import { installUtilityButtons } from './utilityButtons.js';

export function installExplore(viewer, dataManager) {
  const dock = document.getElementById('top-center-actions');
  if (!dock) return () => {};
  const choice = document.createElement('button');
  choice.type = 'button';
  choice.className = 'window-tool-toggle window-activity-toggle';
  choice.textContent = 'Where on Earth?';
  choice.setAttribute('aria-controls', 'window-explore');
  dock.append(choice);
  const panel = document.createElement('section');
  panel.id = 'window-explore';
  panel.className = 'window-tool-panel';
  panel.hidden = document.documentElement.dataset.windowGameHome !== 'true';
  panel.setAttribute('aria-labelledby', 'window-activity-title');
  panel.innerHTML =
    '<h2 id="window-activity-title">Where on Earth?</h2><div class="window-activity"></div>';
  document.body.append(panel);
  const removeUtilities = installUtilityButtons();
  function placePanel() {
    const bottom = Math.ceil(dock.getBoundingClientRect().bottom);
    document.body.style.setProperty(
      '--window-toolbar-bottom',
      bottom + 8 + 'px',
    );
    panel.style.setProperty('--window-game-top', bottom + 10 + 'px');
  }
  const observer = new ResizeObserver(placePanel);
  observer.observe(dock);
  window.addEventListener('resize', placePanel);
  placePanel();
  const removeGame = mountCityGame(
    panel.querySelector('.window-activity'),
    viewer,
  );
  const syncChoice = () =>
    choice.setAttribute('aria-expanded', String(!panel.hidden));
  syncChoice();
  choice.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    syncChoice();
    if (!panel.hidden) placePanel();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    panel.hidden = true;
    syncChoice();
    choice.focus();
  });
  return () => {
    removeGame();
    removeUtilities();
    observer.disconnect();
    window.removeEventListener('resize', placePanel);
    document.body.style.removeProperty('--window-toolbar-bottom');
    panel.remove();
    choice.remove();
  };
}
