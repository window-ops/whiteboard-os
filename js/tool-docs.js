'use strict';

/*
 * Saving and opening, shared by every application that has something worth
 * keeping.
 *
 * A page opts in by carrying an element with the wos-docs class and a
 * data-kind attribute; nothing else is needed, because what a tool keeps in
 * its page address is exactly what needs saving. A tool with state outside the
 * address, as the whiteboard has, sets window.WOSDocsHooks with its own
 * collect and apply functions before this script loads.
 *
 * Files land in the same filesystem the Files application shows, at
 * /documents/<kind>/<name> with the extension that kind uses.
 */

const WOSDocs = (() => {
  const holder = document.querySelector('.wos-docs');

  if (holder === null) {
    return null;
  }

  /* Nothing to offer where there is nowhere to save, so the bar leaves rather
     than presenting controls that would fail. */
  if (WOSStorage.available === false) {
    holder.remove();
    return null;
  }

  const kind = holder.dataset.kind || 'misc';
  const extension = `.${WOSFormats.extensionFor(kind)}`;
  const directory = `/documents/${kind}`;
  const hooks = window.WOSDocsHooks || {};

  let panel = null;
  let current = '';

  const files = () => WOSStorage.files;

  const collect = typeof hooks.collect === 'function'
    ? hooks.collect
    : () => window.location.hash.substring(1)
      .split('&')
      .filter((part) => part.startsWith('theme=') === false && part.startsWith('docs=') === false)
      .join('&');

  const apply = typeof hooks.apply === 'function'
    ? hooks.apply
    : (text) => {
      const values = WOSState.read();
      const carried = [text];

      if (values.theme !== undefined) {
        carried.push(`theme=${values.theme}`);
      }

      if (values.docs !== undefined) {
        carried.push(`docs=${values.docs}`);
      }

      window.location.hash = carried.join('&');
      window.location.reload();
    };

  const button = (label, className) => {
    const element = document.createElement('button');

    element.type = 'button';
    element.className = className || 'app-btn';
    element.textContent = label;

    return element;
  };

  const openBarButton = button('Open');
  const saveBarButton = button('Save');
  const note = document.createElement('span');

  note.className = 'wos-docs-note';
  note.setAttribute('role', 'status');

  const say = (text) => {
    note.textContent = text;

    if (text !== '') {
      window.setTimeout(() => {
        note.textContent = '';
      }, 4000);
    }
  };

  const documents = () => files().list(directory).filter((entry) => entry.mode === 'f');

  const sizeText = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

  const closePanel = () => {
    if (panel !== null) {
      panel.remove();
      panel = null;
    }
  };

  const buildPanel = (mode) => {
    closePanel();

    panel = document.createElement('div');
    panel.className = 'wos-docs-panel';
    panel.dataset.mode = mode;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', mode === 'save' ? 'Save a document' : 'Open a document');

    const heading = document.createElement('h2');
    const list = document.createElement('div');
    const entries = documents();
    const nameField = document.createElement('label');
    const nameInput = document.createElement('input');

    heading.className = 'wos-docs-heading';
    heading.textContent = mode === 'save' ? 'Save to Files' : 'Open from Files';
    list.className = 'wos-docs-list';

    if (entries.length === 0) {
      const empty = document.createElement('p');

      empty.className = 'wos-docs-empty';
      empty.textContent = `Nothing saved yet under ${directory}`;
      list.append(empty);
    }

    entries.forEach((entry) => {
      const row = document.createElement('button');
      const label = document.createElement('span');
      const meta = document.createElement('span');

      row.type = 'button';
      row.className = entry.name === current ? 'wos-docs-item is-current' : 'wos-docs-item';
      label.className = 'wos-docs-item-name';
      label.textContent = entry.name;
      meta.className = 'wos-docs-item-meta';
      meta.textContent = `${sizeText(entry.size)}, ${new Date(entry.mtime).toISOString().substring(0, 10)}`;

      row.append(label, meta);
      row.addEventListener('click', () => {
        if (mode === 'open') {
          const text = files().read(`${directory}/${entry.name}`);

          closePanel();

          if (text === null) {
            say(`${entry.name} could not be read`);
            return;
          }

          current = entry.name;
          apply(text);
          return;
        }

        nameInput.value = entry.name.replace(extension, '');
        nameInput.focus();
      });

      list.append(row);
    });

    panel.append(heading, list);

    if (mode === 'save') {
      const nameLabel = document.createElement('span');
      const suffix = document.createElement('p');
      const actions = document.createElement('div');
      const confirm = button('Save', 'app-btn app-btn-primary');
      const cancel = button('Cancel');
      const quota = document.createElement('p');
      const usage = files().usage();

      nameField.className = 'wos-docs-field';
      nameLabel.textContent = 'Name';
      nameInput.type = 'text';
      nameInput.className = 'app-input-text';
      nameInput.value = current === '' ? `${kind}-${new Date().toISOString().substring(0, 10)}` : current.replace(extension, '');
      nameInput.setAttribute('aria-label', 'Document name');

      suffix.className = 'wos-docs-suffix';
      suffix.textContent = `Kept as ${extension} in ${directory}`;

      quota.className = 'wos-docs-quota';
      quota.textContent = `${sizeText(usage.remaining)} of address space left`;

      const store = () => {
        const trimmed = nameInput.value.trim();

        if (trimmed === '') {
          say('Give the document a name');
          nameInput.focus();
          return;
        }

        const name = `${WOSFS.sanitiseName(trimmed)}${extension}`;

        try {
          files().write(`${directory}/${name}`, collect());
        } catch (error) {
          say(error.message);
          return;
        }

        current = name;
        closePanel();
        say(`Saved ${name}`);
      };

      confirm.addEventListener('click', store);
      cancel.addEventListener('click', closePanel);

      nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          store();
        }
      });

      nameField.append(nameLabel, nameInput);
      actions.className = 'wos-docs-actions';
      actions.append(confirm, cancel);
      panel.append(nameField, suffix, actions, quota);
    } else {
      const actions = document.createElement('div');
      const cancel = button('Cancel');

      cancel.addEventListener('click', closePanel);
      actions.className = 'wos-docs-actions';
      actions.append(cancel);
      panel.append(actions);
    }

    document.body.append(panel);
    place();

    if (mode === 'save') {
      nameInput.focus();
      nameInput.select();
    }
  };

  /*
   * The panel is positioned against the viewport rather than the bar, so a bar
   * near the right edge or a short pane cannot push it out of sight. It hangs
   * under its button where there is room and flips above where there is not.
   */
  function place() {
    if (panel === null) {
      return;
    }

    const margin = 8;
    const anchor = holder.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - margin * 2);

    panel.style.width = `${width}px`;

    const box = panel.getBoundingClientRect();
    const below = window.innerHeight - anchor.bottom - margin * 2;
    const above = anchor.top - margin * 2;
    const flips = below < Math.min(box.height, 240) && above > below;

    panel.style.maxHeight = `${Math.max(160, (flips ? above : below))}px`;
    panel.style.left = `${Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin))}px`;

    if (flips) {
      panel.style.top = 'auto';
      panel.style.bottom = `${window.innerHeight - anchor.top + margin}px`;
      return;
    }

    panel.style.bottom = 'auto';
    panel.style.top = `${anchor.bottom + margin}px`;
  }

  window.addEventListener('resize', place);

  const toggle = (mode) => {
    if (panel !== null && panel.dataset.mode === mode) {
      closePanel();
      return;
    }

    buildPanel(mode);
  };

  openBarButton.addEventListener('click', () => {
    toggle('open');
  });

  saveBarButton.addEventListener('click', () => {
    toggle('save');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel !== null) {
      closePanel();
    }
  });

  document.addEventListener('click', (event) => {
    if (panel === null) {
      return;
    }

    if (holder.contains(event.target) === false && panel.contains(event.target) === false) {
      closePanel();
    }
  });

  holder.append(openBarButton, saveBarButton, note);

  return { directory, kind, extension, files, collect };
})();
