'use strict';

(() => {
  const pathInput = document.getElementById('PATH');
  const upButton = document.getElementById('UP');
  const newDirButton = document.getElementById('NEW-DIR');
  const newFileButton = document.getElementById('NEW-FILE');
  const listing = document.getElementById('LISTING');
  const quota = document.getElementById('QUOTA');
  const prompter = document.getElementById('PROMPT');
  const viewerName = document.getElementById('VIEWER-NAME');
  const content = document.getElementById('CONTENT');
  const saveButton = document.getElementById('SAVE');
  const renameButton = document.getElementById('RENAME');
  const deleteButton = document.getElementById('DELETE');
  const status = document.getElementById('STATUS');

  let current = '/';
  let selected = null;

  const store = () => WOSStorage.files;

  const join = (base, name) => (base === '/' ? `/${name}` : `${base}/${name}`);

  const parentOf = (path) => {
    const parts = path.split('/').filter((part) => part !== '');

    parts.pop();

    return parts.length === 0 ? '/' : `/${parts.join('/')}`;
  };

  const stamp = (time) => {
    const date = new Date(time);

    return `${date.toISOString().substring(0, 10)} ${date.toTimeString().substring(0, 5)}`;
  };

  const size = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

  const showQuota = () => {
    if (WOSStorage.available === false) {
      quota.textContent = WOSStorage.reason;
      return;
    }

    const usage = store().usage();

    quota.textContent = `${usage.files} files, ${size(usage.encoded)} of ${size(usage.quota)} used, ${size(usage.remaining)} left`;
  };

  const clearSelection = () => {
    selected = null;
    viewerName.textContent = 'Nothing selected';
    content.value = '';
    [saveButton, renameButton, deleteButton].forEach((button) => {
      button.disabled = true;
    });
  };

  const select = (path) => {
    const disk = store();
    const text = disk.read(path);

    if (text === null) {
      status.textContent = 'That file could not be read';
      return;
    }

    selected = path;
    viewerName.textContent = path;
    content.value = text;
    [saveButton, renameButton, deleteButton].forEach((button) => {
      button.disabled = false;
    });
    render();
  };

  const render = () => {
    const disk = store();

    listing.textContent = '';
    pathInput.value = current;
    showQuota();

    if (WOSStorage.available === false) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');

      cell.colSpan = 4;
      cell.className = 'tool-note';
      cell.textContent = WOSStorage.reason;
      row.append(cell);
      listing.append(row);
      [newDirButton, newFileButton, upButton].forEach((button) => {
        button.disabled = true;
      });
      return;
    }

    const entries = disk.list(current);

    if (entries.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');

      cell.colSpan = 4;
      cell.className = 'tool-note';
      cell.textContent = 'This directory is empty.';
      row.append(cell);
      listing.append(row);
      return;
    }

    entries.forEach((entry) => {
      const full = join(current, entry.name);
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const sizeCell = document.createElement('td');
      const timeCell = document.createElement('td');
      const actionCell = document.createElement('td');
      const button = document.createElement('button');

      row.className = full === selected ? 'files-row is-selected' : 'files-row';

      button.type = 'button';
      button.className = 'files-name';
      button.innerHTML = `<i class="${entry.mode === 'd' ? 'icons10-folder' : 'icons10-file'}" aria-hidden="true"></i>`;
      button.append(document.createTextNode(entry.name));
      button.addEventListener('click', () => {
        if (entry.mode === 'd') {
          current = full;
          clearSelection();
          render();
          return;
        }

        select(full);
      });

      nameCell.append(button);

      if (entry.mode === 'f' && typeof WOSFormats !== 'undefined') {
        const label = WOSFormats.labelFor(entry.name);

        if (label !== '') {
          const kind = document.createElement('span');

          kind.className = 'files-kind';
          kind.textContent = label;
          nameCell.append(kind);
        }
      }

      sizeCell.textContent = entry.mode === 'd' ? `${entry.size} items` : size(entry.size);
      timeCell.textContent = stamp(entry.mtime);

      const remove = document.createElement('button');

      remove.type = 'button';
      remove.className = 'app-btn app-btn-subtle';
      remove.setAttribute('aria-label', `Delete ${entry.name}`);
      remove.title = `Delete ${entry.name}`;
      remove.innerHTML = '<i class="icons10-cross" aria-hidden="true"></i>';
      remove.addEventListener('click', () => {
        try {
          disk.unlink(full);
        } catch (error) {
          status.textContent = error.message;
          return;
        }

        if (selected === full) {
          clearSelection();
        }

        status.textContent = `Deleted ${entry.name}`;
        render();
      });

      actionCell.append(remove);
      row.append(nameCell, sizeCell, timeCell, actionCell);
      listing.append(row);
    });
  };

  upButton.addEventListener('click', () => {
    current = parentOf(current);
    render();
  });

  pathInput.addEventListener('change', () => {
    const disk = store();
    const wanted = pathInput.value.trim() === '' ? '/' : pathInput.value.trim();

    if (wanted !== '/' && disk.exists(wanted) === false) {
      status.textContent = 'No such directory';
      pathInput.value = current;
      return;
    }

    current = wanted;
    clearSelection();
    render();
  });

  /*
   * Naming happens in the page rather than in a browser dialog, so the name
   * stays visible next to the directory it is going into.
   */
  const askName = (label, suggestion, onDone) => {
    prompter.textContent = '';
    prompter.hidden = false;

    const caption = document.createElement('span');
    const input = document.createElement('input');
    const confirm = document.createElement('button');
    const cancel = document.createElement('button');

    caption.className = 'files-prompt-label';
    caption.textContent = label;

    input.type = 'text';
    input.className = 'app-input-text';
    input.value = suggestion;
    input.setAttribute('aria-label', label);

    confirm.type = 'button';
    confirm.className = 'app-btn app-btn-primary';
    confirm.textContent = 'Create';

    cancel.type = 'button';
    cancel.className = 'app-btn';
    cancel.textContent = 'Cancel';

    const close = () => {
      prompter.hidden = true;
      prompter.textContent = '';
    };

    const finish = () => {
      const trimmed = input.value.trim();

      if (trimmed === '') {
        status.textContent = 'A name is needed';
        input.focus();
        return;
      }

      close();
      onDone(trimmed);
    };

    confirm.addEventListener('click', finish);
    cancel.addEventListener('click', close);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish();
      }

      if (event.key === 'Escape') {
        close();
      }
    });

    prompter.append(caption, input, confirm, cancel);
    input.focus();
    input.select();
  };

  newDirButton.addEventListener('click', () => {
    askName(`New folder in ${current}`, 'lessons', (name) => {
      store().mkdir(join(current, name));
      render();
    });
  });

  newFileButton.addEventListener('click', () => {
    askName(`New file in ${current}`, 'notes.txt', (name) => {
      try {
        store().write(join(current, WOSFS.sanitiseName(name)), '');
      } catch (error) {
        status.textContent = error.message;
        return;
      }

      render();
      select(join(current, name));
    });
  });

  saveButton.addEventListener('click', () => {
    if (selected === null) {
      return;
    }

    try {
      store().write(selected, content.value);
    } catch (error) {
      status.textContent = error.message;
      return;
    }

    status.textContent = `Saved ${selected}`;
    render();
  });

  renameButton.addEventListener('click', () => {
    if (selected === null) {
      return;
    }

    const parts = selected.split('/');

    askName('Rename to', parts[parts.length - 1], (name) => {
      const target = join(parentOf(selected), WOSFS.sanitiseName(name));

      try {
        store().rename(selected, target);
      } catch (error) {
        status.textContent = error.message;
        return;
      }

      selected = target;
      viewerName.textContent = target;
      status.textContent = `Renamed to ${name}`;
      render();
    });
  });

  deleteButton.addEventListener('click', () => {
    if (selected === null) {
      return;
    }

    try {
      store().unlink(selected);
    } catch (error) {
      status.textContent = error.message;
      return;
    }

    status.textContent = 'Deleted';
    clearSelection();
    render();
  });

  /* Any write, from this window or from another application in the shell,
     redraws the listing. */
  const watch = () => {
    const disk = store();

    if (typeof disk.subscribe !== 'function') {
      return;
    }

    const stop = disk.subscribe(() => {
      render();
    });

    window.addEventListener('unload', stop);
    window.addEventListener('pagehide', stop);
  };

  const restore = () => {
    const values = WOSState.read();

    if (typeof values.path === 'string' && values.path !== '') {
      current = values.path;
    }

    clearSelection();
    render();
    watch();
  };

  restore();
})();
