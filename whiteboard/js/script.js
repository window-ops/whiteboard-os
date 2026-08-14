'use strict';

(() => {
  const EXPORT_DIRECTORY = '/documents/whiteboard/exports';
  const COLOURS = ['#1b1b1b', '#c92a2a', '#e8590c', '#f08c00', '#2f9e44', '#1971c2', '#6741d9', '#ffffff'];

  const board = window.WOS_BOARD;
  const toolButtons = Array.from(document.querySelectorAll('.board-tool'));
  const colourBox = document.getElementById('COLOURS');
  const widthInput = document.getElementById('WIDTH');
  const filledInput = document.getElementById('FILLED');
  const undoButton = document.getElementById('UNDO');
  const redoButton = document.getElementById('REDO');
  const zoomInButton = document.getElementById('ZOOM-IN');
  const zoomOutButton = document.getElementById('ZOOM-OUT');
  const resetButton = document.getElementById('RESET-VIEW');
  const clearButton = document.getElementById('CLEAR');
  const formatSelect = document.getElementById('FORMAT');
  const saveFileButton = document.getElementById('SAVE-FILE');
  const downloadButton = document.getElementById('DOWNLOAD');
  const status = document.getElementById('STATUS');
  const statusRow = document.getElementById('STATUS-ROW');
  const textEntry = document.getElementById('TEXT-ENTRY');

  let exportPanel = null;

  /* The row is put away while it has nothing to say, so the bar does not
     carry an empty line under the tools. */
  const say = (text) => {
    status.textContent = text;
    statusRow.hidden = text === '';

    if (text !== '') {
      window.setTimeout(() => {
        status.textContent = '';
        statusRow.hidden = true;
      }, 3500);
    }
  };

  const files = () => (WOSDocs === null ? WOSStorage.files : WOSDocs.files());

  const stamp = () => new Date().toISOString().substring(0, 19).split(':').join('-');

  // Tools

  const selectTool = (name) => {
    board.setTool(name);
    toolButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.tool === name));
    });
  };

  toolButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectTool(button.dataset.tool);
    });
  });

  COLOURS.forEach((colour, index) => {
    const swatch = document.createElement('button');

    swatch.type = 'button';
    swatch.className = index === 0 ? 'board-colour is-current' : 'board-colour';
    swatch.style.backgroundColor = colour;
    swatch.dataset.colour = colour;
    swatch.setAttribute('aria-label', `Colour ${colour}`);
    swatch.title = colour;

    swatch.addEventListener('click', () => {
      board.setColour(colour);
      Array.from(colourBox.children).forEach((entry) => {
        entry.classList.toggle('is-current', entry === swatch);
      });
    });

    colourBox.append(swatch);
  });

  widthInput.addEventListener('input', () => {
    board.setWidth(Number.parseInt(widthInput.value, 10));
  });

  filledInput.addEventListener('change', () => {
    board.setFilled(filledInput.checked);
  });

  undoButton.addEventListener('click', () => {
    board.undo();
  });

  redoButton.addEventListener('click', () => {
    board.redo();
  });

  zoomInButton.addEventListener('click', () => {
    board.zoom(1.25);
  });

  zoomOutButton.addEventListener('click', () => {
    board.zoom(1 / 1.25);
  });

  resetButton.addEventListener('click', () => {
    board.resetView();
  });

  clearButton.addEventListener('click', () => {
    board.clear();
    say('Board cleared, and an open document keeps what it held until it is saved again');
  });

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey === false && event.metaKey === false) {
      return;
    }

    if (event.key === 'z') {
      event.preventDefault();
      board.undo();
    } else if (event.key === 'y') {
      event.preventDefault();
      board.redo();
    }
  });

  /* Text is typed on the board itself, at the point that was clicked. */
  window.WOS_BOARD_TEXT = (point, event) => {
    const stage = textEntry.parentElement.getBoundingClientRect();

    textEntry.hidden = false;
    textEntry.value = '';
    textEntry.style.left = `${event.clientX - stage.left}px`;
    textEntry.style.top = `${event.clientY - stage.top}px`;
    textEntry.focus();

    const commit = () => {
      const text = textEntry.value;

      textEntry.hidden = true;
      textEntry.removeEventListener('blur', commit);
      board.addText(point, text);
    };

    const onKey = (keyEvent) => {
      if (keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        textEntry.removeEventListener('keydown', onKey);
        commit();
      }

      if (keyEvent.key === 'Escape') {
        textEntry.removeEventListener('keydown', onKey);
        textEntry.removeEventListener('blur', commit);
        textEntry.hidden = true;
      }
    };

    textEntry.addEventListener('keydown', onKey);
    textEntry.addEventListener('blur', commit);
  };

  // Export

  const exported = () => {
    const format = formatSelect.value;

    if (format === 'json') {
      return { text: board.snapshot(), extension: 'json', type: 'application/json' };
    }

    if (format === 'svg') {
      return { text: board.toSVG(), extension: 'svg', type: 'image/svg+xml' };
    }

    if (board.isEmpty()) {
      throw new Error('there is nothing on the board to turn into an image yet');
    }

    return { text: board.toCanvas(2).toDataURL('image/png'), extension: 'png', type: 'image/png', dataUrl: true };
  };

  const closeExportPanel = () => {
    if (exportPanel !== null) {
      exportPanel.remove();
      exportPanel = null;
    }
  };

  const openExportPanel = (payload) => {
    closeExportPanel();

    const store = files();
    const holder = saveFileButton.parentElement;
    const heading = document.createElement('h2');
    const field = document.createElement('label');
    const caption = document.createElement('span');
    const input = document.createElement('input');
    const suffix = document.createElement('p');
    const actions = document.createElement('div');
    const confirm = document.createElement('button');
    const cancel = document.createElement('button');
    const usage = store.usage();

    exportPanel = document.createElement('div');
    exportPanel.className = 'wos-docs-panel board-export-panel';
    exportPanel.setAttribute('role', 'dialog');
    exportPanel.setAttribute('aria-label', 'Save an export');

    heading.className = 'wos-docs-heading';
    heading.textContent = WOSStorage.shared ? 'Export to Files' : 'Export inside this application';

    field.className = 'wos-docs-field';
    caption.textContent = 'Name';
    input.type = 'text';
    input.className = 'app-input-text';
    input.value = `board-${stamp()}`;
    input.setAttribute('aria-label', 'Export name');
    field.append(caption, input);

    suffix.className = 'wos-docs-suffix';
    suffix.textContent = `Kept as .${payload.extension}, about ${Math.max(1, Math.round(payload.text.length / 1024))} KB of the ${(usage.remaining / 1024).toFixed(1)} KB left`;

    confirm.type = 'button';
    confirm.className = 'app-btn app-btn-primary';
    confirm.textContent = 'Save';
    cancel.type = 'button';
    cancel.className = 'app-btn';
    cancel.textContent = 'Cancel';

    const keep = () => {
      const trimmed = input.value.trim();

      if (trimmed === '') {
        say('Give the export a name');
        input.focus();
        return;
      }

      const name = `${trimmed.split('/').join('-')}.${payload.extension}`;

      try {
        store.write(`${EXPORT_DIRECTORY}/${name}`, payload.text);
      } catch (error) {
        say(error.message);
        return;
      }

      closeExportPanel();
      say(`Saved ${name}`);
    };

    confirm.addEventListener('click', keep);
    cancel.addEventListener('click', closeExportPanel);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        keep();
      }
    });

    actions.className = 'wos-docs-actions';
    actions.append(confirm, cancel);
    exportPanel.append(heading, field, suffix, actions);
    document.body.append(exportPanel);

    const margin = 8;
    const anchor = holder.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - margin * 2);

    exportPanel.style.width = `${width}px`;
    exportPanel.style.left = `${Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin))}px`;
    exportPanel.style.top = `${anchor.bottom + margin}px`;
    exportPanel.style.maxHeight = `${Math.max(160, window.innerHeight - anchor.bottom - margin * 2)}px`;

    input.focus();
    input.select();
  };

  saveFileButton.addEventListener('click', () => {
    if (exportPanel !== null) {
      closeExportPanel();
      return;
    }

    let payload;

    try {
      payload = exported();
    } catch (error) {
      say(error.message);
      return;
    }

    openExportPanel(payload);
  });

  downloadButton.addEventListener('click', () => {
    let payload;

    try {
      payload = exported();
    } catch (error) {
      say(error.message);
      return;
    }

    WOSDownload.file(`board-${stamp()}.${payload.extension}`, payload.text, payload.type);
    say(`Sent board-${stamp()}.${payload.extension} to this computer`);
  });

  selectTool('pen');
})();
