import './shareViewDialog.css';

// Generate the snapshot before opening this dialog; never put it in the address bar.
export function showShareViewDialog(href) {
  document.getElementById('window-share-view')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'window-share-view';
  dialog.setAttribute('aria-labelledby', 'window-share-title');
  dialog.innerHTML =
    '<h2 id="window-share-title">Share this view</h2><p>This link opens the current map view and layers.</p><label for="window-share-url">View link</label><input id="window-share-url" type="url" readonly><div><button type="button" data-copy>Copy link</button><button type="button" data-close>Close</button></div><p role="status" aria-live="polite"></p>';
  const input = dialog.querySelector('input');
  input.value = href;
  dialog.querySelector('[data-copy]').addEventListener('click', async () => {
    const status = dialog.querySelector('[role="status"]');
    try {
      await navigator.clipboard.writeText(href);
      status.textContent = 'Link copied!';
    } catch {
      input.focus();
      input.select();
      status.textContent =
        'Select the link and copy it with Ctrl+C or Command+C.';
    }
  });
  dialog
    .querySelector('[data-close]')
    .addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  input.focus();
  input.select();
  return 'cancelled'; // The dialog provides its own feedback.
}
