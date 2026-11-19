import { helpInstructions, helpFaq, helpWizard } from './helpContent.js';
import './help.css';

export function installHelp() {
  const dock = document.getElementById('top-center-actions');
  if (!dock) return () => {};
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'window-help-button';
  button.className = 'window-tool-toggle window-activity-toggle';
  button.textContent = 'Help';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'window-help');
  button.setAttribute('aria-expanded', 'false');
  dock.append(button);
  const dialog = document.createElement('dialog');
  dialog.id = 'window-help';
  dialog.setAttribute('aria-labelledby', 'window-help-title');
  dialog.innerHTML = `
    <header class="window-help-header"><h2 id="window-help-title">Window Help</h2><button type="button" data-help-close>Close help</button></header>
    <div class="window-help-tabs" role="tablist" aria-label="Help sections">
      <button type="button" role="tab" id="help-tab-instructions" aria-controls="help-instructions" aria-selected="true">Instructions</button>
      <button type="button" role="tab" id="help-tab-faq" aria-controls="help-faq" aria-selected="false" tabindex="-1">FAQ</button>
      <button type="button" role="tab" id="help-tab-wizard" aria-controls="help-wizard" aria-selected="false" tabindex="-1">Quick help wizard</button>
    </div>
    <section role="tabpanel" id="help-instructions" aria-labelledby="help-tab-instructions" tabindex="0">${helpInstructions}</section>
    <section role="tabpanel" id="help-faq" aria-labelledby="help-tab-faq" tabindex="0" hidden><h3>Frequently asked questions</h3>${helpFaq.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}</section>
    <section role="tabpanel" id="help-wizard" aria-labelledby="help-tab-wizard" tabindex="0" hidden><h3>Quick help wizard</h3><div data-wizard-content aria-live="polite"></div><div class="window-help-actions"><button type="button" data-wizard-back>Back</button><button type="button" data-wizard-restart>Start again</button></div></section>`;
  document.body.append(dialog);
  const tabs = [...dialog.querySelectorAll('[role="tab"]')];
  const panels = [...dialog.querySelectorAll('[role="tabpanel"]')];
  function selectTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', (event) => {
      const next =
        event.key === 'ArrowRight'
          ? (index + 1) % 3
          : event.key === 'ArrowLeft'
            ? (index + 2) % 3
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? 2
                : null;
      if (next === null) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });
  let returnFocus = true;
  let history = ['start'];
  const wizard = dialog.querySelector('[data-wizard-content]');
  const back = dialog.querySelector('[data-wizard-back]');
  function renderWizard(focus = false) {
    const node = helpWizard[history.at(-1)];
    wizard.replaceChildren();
    const heading = document.createElement('h4');
    heading.textContent = node.title;
    heading.tabIndex = -1;
    const text = document.createElement('p');
    text.textContent = node.text;
    wizard.append(heading, text);
    const choices = document.createElement('div');
    choices.className = 'window-wizard-choices';
    for (const [label, next] of node.choices || []) {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.textContent = label;
      choice.addEventListener('click', () => {
        history.push(next);
        renderWizard(true);
      });
      choices.append(choice);
    }
    if (node.action) {
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent =
        node.action === 'settings'
          ? 'Open round settings'
          : node.action === 'layers'
            ? 'Open Data Layers'
            : 'Return to game';
      action.addEventListener('click', () => {
        returnFocus = false;
        dialog.close();
        if (node.action === 'layers') {
          const tool = document.querySelector(
            '#window-utilities [aria-controls="data-panel"]',
          );
          if (tool?.getAttribute('aria-expanded') !== 'true') tool?.click();
          tool?.focus();
        } else {
          const game = document.getElementById('window-explore');
          const toggle = dock.querySelector('[aria-controls="window-explore"]');
          if (game?.hidden) toggle?.click();
          if (node.action === 'settings') {
            const settings = game?.querySelector('[data-round-settings]');
            if (settings) settings.open = true;
            game?.querySelector('#window-difficulty')?.focus();
          } else toggle?.focus();
        }
      });
      choices.append(action);
      const read = document.createElement('button');
      read.type = 'button';
      read.textContent = 'Read full instructions';
      read.addEventListener('click', () => selectTab(0, true));
      choices.append(read);
    }
    wizard.append(choices);
    back.disabled = history.length === 1;
    if (focus) heading.focus();
  }
  back.addEventListener('click', () => {
    if (history.length > 1) {
      history.pop();
      renderWizard(true);
    }
  });
  dialog
    .querySelector('[data-wizard-restart]')
    .addEventListener('click', () => {
      history = ['start'];
      renderWizard(true);
    });
  renderWizard();
  button.addEventListener('click', () => {
    if (!dialog.open) {
      dialog.showModal();
      button.setAttribute('aria-expanded', 'true');
      dialog.querySelector('[data-help-close]').focus();
    }
  });
  dialog
    .querySelector('[data-help-close]')
    .addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
    returnFocus = true;
  });
  dialog.addEventListener('wheel', (event) => event.stopPropagation());
  return () => {
    if (dialog.open) dialog.close();
    dialog.remove();
    button.remove();
  };
}
