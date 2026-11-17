import { mountCityGame } from './city-game.js';
const activityNames = ['Where on Earth?'];
export function installExplore(viewer, dataManager) {
  const dock = document.getElementById('top-center-actions');
  if (!dock) return () => {};
  const choices = activityNames.map((name) => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'window-tool-toggle window-activity-toggle';
    choice.textContent = name;
    choice.setAttribute('aria-expanded', 'false');
    choice.setAttribute('aria-controls', 'window-explore');
    dock.append(choice);
    return choice;
  });
  const panel = document.createElement('section');
  panel.id = 'window-explore';
  panel.className = 'window-tool-panel';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'window-activity-title');
  panel.innerHTML =
    '<h2 id="window-activity-title"></h2><div class="window-activity"></div>';
  document.body.append(panel);
  const title = panel.querySelector('h2');
  const content = panel.querySelector('.window-activity');
  let activeActivity = null;
  function placePanels() {
    document.body.style.setProperty(
      '--window-toolbar-bottom',
      Math.ceil(dock.getBoundingClientRect().bottom) + 8 + 'px',
    );
  }
  const observer = new ResizeObserver(placePanels);
  observer.observe(dock);
  placePanels();
  let cleanup = () => {};
  const activities = [
    (autoStart) => mountCityGame(content, viewer, { autoStart }),
  ];
  function close() {
    const index = activeActivity;
    cleanup();
    cleanup = () => {};
    activeActivity = null;
    panel.hidden = true;
    content.replaceChildren();
    if (index !== null) choices[index].setAttribute('aria-expanded', 'false');
  }
  choices.forEach((choice, index) => {
    choice.addEventListener('click', () => {
      const wasOpen = activeActivity === index;
      close();
      if (wasOpen) return;
      activeActivity = index;
      title.textContent = activityNames[index];
      panel.hidden = false;
      placePanels();
      choice.setAttribute('aria-expanded', 'true');
      cleanup = activities[index](index === 0) || (() => {});
    });
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const focus = choices[activeActivity];
      close();
      focus?.focus();
    }
  });
  if (document.documentElement.dataset.windowGameHome === 'true') {
    activeActivity = 0;
    title.textContent = activityNames[0];
    panel.hidden = false;
    choices[0].setAttribute('aria-expanded', 'true');
    cleanup = mountCityGame(content, viewer);
  }
  return () => {
    close();
    observer.disconnect();
    document.body.style.removeProperty('--window-toolbar-bottom');
    panel.remove();
    choices.forEach((choice) => choice.remove());
  };
}
