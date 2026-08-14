'use strict';

(() => {
  const MAX_PANES = 2;
  const MIN_RATIO = 0.2;
  const MAX_RATIO = 0.8;
  const STATE_SYNC_MS = 2000;

  const launcher = document.getElementById('LAUNCHER');
  const settingsButton = document.getElementById('SETTINGS');

  const settings = { theme: 'system', home: 'paged', swipe: 'on', sound: 'off', dock: 'sticky', backend: 'address' };
  const LOCAL_KEY = 'whiteboard-os/filesystem';
  const SETTINGS_KEY = 'whiteboard-os/settings';
  const files = WOSFS.create();

  let fsToken = '';

  let workspace = null;
  let picker = null;
  let settingsPanel = null;
  let panes = [];
  let layout = 'vertical';
  let ratio = 0.5;
  let stateTimer = null;
  let page = 0;

  /*
   * Rewriting the address through the history interface is refused on a file
   * URL, which is where this project often runs. Assigning the fragment is
   * allowed everywhere and stays on the same document, so it serves as the
   * fallback.
   */
  const setAddress = (hash) => {
    try {
      history.replaceState(undefined, '', hash === '' ? window.location.pathname : hash);
      return;
    } catch (error) {
      /* A file URL refuses the history interface. */
    }

    try {
      window.location.hash = hash === '' ? '' : hash.substring(1);
    } catch (error) {
      /* The window is going away, and its address no longer matters. */
    }
  };

  const appById = (id) => WOS_APPS.filter((app) => app.id === id)[0] || null;

  const iconButton = (iconClass, label, extraClass) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = `app-btn app-btn-subtle ${extraClass}`;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;

    return button;
  };

  // Theme

  const resolvedTheme = () => {
    if (settings.theme === 'light' || settings.theme === 'dark') {
      return settings.theme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', resolvedTheme());
  };

  // Touch sound

  /*
   * The setting belongs to the whole system, so the shell holds it and hands
   * it to every frame. A frame greets the shell once its own copy of the
   * player has loaded, which is when the answer below reaches it.
   */
  const sendSound = (target) => {
    if (target === null || target === undefined) {
      return;
    }

    try {
      target.postMessage({ wos: true, type: 'sound', enabled: settings.sound === 'on' }, '*');
    } catch (error) {
      /* A frame that has gone away needs no setting. */
    }
  };

  const applySound = () => {
    WOSClick.set(settings.sound === 'on');
    panes.forEach((pane) => {
      sendSound(pane.frame.contentWindow);
    });
  };

  const themedUrl = (app, state) => {
    const parts = [];

    if (state !== '') {
      parts.push(state);
    }

    parts.push(`theme=${resolvedTheme()}`);

    return `${app.url}#${parts.join('&')}`;
  };

  // Launcher

  const moveTileFocus = (event) => {
    const scope = event.currentTarget.closest('.wos-page, .wos-category, .wos-picker');

    if (scope === null) {
      return;
    }

    const tiles = Array.from(scope.querySelectorAll('.app'));
    const index = tiles.indexOf(event.currentTarget);
    const last = tiles.length - 1;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      tiles[index === last ? 0 : index + 1].focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      tiles[index === 0 ? last : index - 1].focus();
    }
  };

  const buildTile = (app, onChoose) => {
    const tile = document.createElement('a');
    const heading = document.createElement('h3');
    const description = document.createElement('p');

    tile.className = 'app app-btn';
    tile.tabIndex = 0;
    tile.dataset.app = app.id;
    tile.setAttribute('role', 'button');

    heading.textContent = app.name;
    description.textContent = app.description;
    tile.append(heading, description);

    tile.addEventListener('click', () => {
      onChoose(app);
    });

    tile.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onChoose(app);
        return;
      }

      moveTileFocus(event);
    });

    return tile;
  };

  const storageShared = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  /* Files shows a filesystem the applications share, which exists only when
     the project is served. */
  const available = () => WOS_APPS.filter((app) => app.id !== 'files' || storageShared);

  const filledCategories = () =>
    WOS_CATEGORIES.filter((category) => available().some((app) => app.category === category.id));

  const buildCategorySection = (category, onChoose) => {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    const grid = document.createElement('div');

    section.className = 'wos-category';
    heading.className = 'wos-category-name';
    heading.textContent = category.name;
    grid.className = 'wos-grid';

    available()
      .filter((app) => app.category === category.id)
      .forEach((app) => {
        grid.append(buildTile(app, onChoose));
      });

    section.append(heading, grid);

    return section;
  };

  const buildStacked = (container, onChoose) => {
    filledCategories().forEach((category) => {
      container.append(buildCategorySection(category, onChoose));
    });
  };

  /*
   * Paged launcher: one category per page in a scroll-snapping strip, so a
   * swipe moves between them without any pointer handling of our own.
   */
  const buildPaged = (container, onChoose) => {
    const categories = filledCategories();
    const strip = document.createElement('div');
    const pager = document.createElement('div');
    const previous = iconButton('icons10-arrow-left', 'Previous category', 'wos-pager-step');
    const next = iconButton('icons10-arrow-right', 'Next category', 'wos-pager-step');
    const dots = document.createElement('div');

    strip.className = 'wos-pages';
    pager.className = 'wos-pager';
    dots.className = 'wos-pager-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Categories');

    categories.forEach((category, index) => {
      const pageElement = document.createElement('div');
      const dot = document.createElement('button');

      pageElement.className = 'wos-page';
      pageElement.append(buildCategorySection(category, onChoose));
      strip.append(pageElement);

      dot.type = 'button';
      dot.className = 'wos-pager-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', category.name);
      dot.setAttribute('aria-selected', String(index === 0));
      dot.addEventListener('click', () => {
        goTo(index);
      });

      dots.append(dot);
    });

    const markPage = (index) => {
      page = index;
      Array.from(dots.children).forEach((dot, position) => {
        dot.setAttribute('aria-selected', String(position === index));
      });
      previous.disabled = index === 0;
      next.disabled = index === categories.length - 1;
    };

    /* Sliding is a setting, so a board that prefers an instant change gets
       one, and the arrows, the dots and a swipe all obey it. */
    const motion = () => (settings.swipe === 'on' ? 'smooth' : 'auto');

    const goTo = (index) => {
      markPage(index);
      strip.scrollTo({ left: strip.clientWidth * index, behavior: motion() });
    };

    const step = (delta) => {
      goTo(Math.min(categories.length - 1, Math.max(0, page + delta)));
    };

    previous.addEventListener('click', () => {
      step(-1);
    });

    next.addEventListener('click', () => {
      step(1);
    });

    /*
     * A swipe or trackpad scroll reports the page it landed on. A sliding
     * scroll passes over every page between the two, so the reading is taken
     * once the strip has come to rest: otherwise the dots blink through the
     * categories on the way.
     */
    let resting = 0;

    strip.addEventListener('scroll', () => {
      window.clearTimeout(resting);

      resting = window.setTimeout(() => {
        if (strip.clientWidth === 0) {
          return;
        }

        const landed = Math.round(strip.scrollLeft / strip.clientWidth);

        if (landed !== page && landed >= 0 && landed < categories.length) {
          markPage(landed);
        }
      }, 120);
    });

    pager.append(previous, dots, next);
    container.append(strip, pager);
    markPage(0);
  };

  /*
   * A dock along the bottom holds the applications a lesson reaches for
   * without thinking, so they stay one press away whichever category is
   * showing.
   */
  const buildDock = () => {
    const existing = document.querySelector('.wos-dock');

    if (existing !== null) {
      existing.remove();
    }

    const entries = WOS_DOCK.map(appById).filter((app) => app !== null && (app.id !== 'files' || storageShared));

    if (entries.length === 0 || settings.dock === 'off') {
      return;
    }

    const dock = document.createElement('nav');

    dock.className = 'wos-dock';
    dock.dataset.placement = settings.dock;
    dock.setAttribute('aria-label', 'Frequently used applications');

    entries.forEach((app) => {
      const item = document.createElement('button');
      const label = document.createElement('span');

      item.type = 'button';
      item.className = 'app-btn wos-dock-item';
      item.dataset.app = app.id;
      item.title = app.name;
      label.textContent = app.name;

      item.append(label);
      item.addEventListener('click', () => {
        openApp(app, '');
      });

      dock.append(item);
    });

    document.body.append(dock);
  };

  const buildLauncher = () => {
    launcher.textContent = '';
    launcher.dataset.mode = settings.home;
    launcher.dataset.swipe = settings.swipe;

    const choose = (app) => {
      openApp(app, '');
    };

    if (settings.home === 'single') {
      buildStacked(launcher, choose);
    } else {
      buildPaged(launcher, choose);
    }

    buildDock();
  };

  // Session in the address

  const readPaneState = (pane) => {
    try {
      const hash = pane.frame.contentWindow.location.hash;

      if (hash !== '') {
        pane.state = hash.substring(1)
          .split('&')
          .filter((part) => part.startsWith('theme=') === false)
          .join('&');
      }
    } catch (error) {
      /* A frame the shell cannot read keeps whatever state it started with. */
    }

    return pane.state;
  };

  const writeSession = () => {
    const parts = [];

    /*
     * When the filesystem lives in local storage, settings live there too,
     * so the address stays short and a clean URL still picks them up. When
     * the address is the backend, settings travel in it as they always have.
     */
    if (settings.backend === 'local') {
      writeLocalSettings();

      /* The address still needs 'backend=local' so a fresh tab that reads
         the URL before localStorage knows to look in localStorage. */
      parts.push('backend=local');
    } else {
      clearLocalSettings();

      if (settings.theme !== 'system') {
        parts.push(`theme=${settings.theme}`);
      }

      if (settings.home !== 'paged') {
        parts.push(`home=${settings.home}`);
      }

      if (settings.swipe !== 'on') {
        parts.push(`swipe=${settings.swipe}`);
      }

      if (settings.sound !== 'off') {
        parts.push(`sound=${settings.sound}`);
      }

      if (settings.dock !== 'sticky') {
        parts.push(`dock=${settings.dock}`);
      }
    }

    /* Everything except the filesystem counts against the same quota, since
       the address has to hold all of it. */
    files.reserve = parts.join('&').length + 4;

    /*
     * The data parameter is the encoded filesystem. It belongs in the address
     * only while the address is the backend and the person wants it carried.
     */
    if (fsToken !== '' && settings.backend === 'address') {
      parts.push(`fs=${fsToken}`);
    }

    if (panes.length > 0) {
      parts.push(`apps=${panes.map((pane) => pane.app.id).join(',')}`);

      if (panes.length > 1) {
        parts.push(`layout=${layout}`);
        parts.push(`ratio=${ratio.toFixed(3)}`);
      }

      panes.forEach((pane) => {
        const state = readPaneState(pane);

        if (state !== '') {
          parts.push(`s.${pane.app.id}=${encodeURIComponent(state)}`);
        }
      });
    }

    setAddress(parts.length === 0 ? '' : `#${parts.join('&')}`);
  };

  // Panes

  const applySizes = () => {
    if (workspace === null) {
      return;
    }

    workspace.dataset.layout = layout;

    if (panes.length < 2) {
      panes.forEach((pane) => {
        pane.element.style.flex = '1 1 auto';
      });
      return;
    }

    panes[0].element.style.flex = `0 0 calc(${(ratio * 100).toFixed(2)}% - 4px)`;
    panes[1].element.style.flex = '1 1 auto';
  };

  const toggleHelp = (pane) => {
    const wasHidden = pane.help.hidden;

    pane.help.hidden = wasHidden === false;
    pane.helpButton.setAttribute('aria-expanded', String(wasHidden));

    if (wasHidden) {
      pane.help.focus();
    }
  };

  const refreshSplitButtons = () => {
    panes.forEach((pane) => {
      pane.splitButton.hidden = panes.length >= MAX_PANES;
    });
  };

  const createPane = (app, state) => {
    const element = document.createElement('section');
    const bar = document.createElement('div');
    const title = document.createElement('h2');
    const body = document.createElement('div');
    const help = document.createElement('aside');
    const frame = document.createElement('iframe');

    const helpButton = iconButton('icons10-question-mark', `Help for ${app.name}`, 'wos-pane-button');
    const splitButton = iconButton('icons10-columns', 'Open a second application beside this one', 'wos-pane-button');
    const closeButton = iconButton('icons10-cross', `Close ${app.name}`, 'wos-pane-button');

    element.className = 'wos-pane';
    element.setAttribute('aria-label', app.name);

    bar.className = 'wos-pane-bar';
    title.className = 'wos-pane-title';
    title.textContent = app.name;

    helpButton.setAttribute('aria-expanded', 'false');

    help.className = 'wos-help';
    help.hidden = true;
    help.tabIndex = -1;
    help.setAttribute('role', 'region');
    help.setAttribute('aria-label', `About ${app.name}`);
    help.innerHTML = WOS_HELP[app.id] || '<p>No help text has been written for this application yet.</p>';

    frame.className = 'wos-pane-frame';
    frame.title = app.name;
    frame.src = themedUrl(app, state);

    body.className = 'wos-pane-body';
    body.append(frame, help);
    bar.append(title, helpButton, splitButton, closeButton);
    element.append(bar, body);

    const pane = { app, element, frame, help, helpButton, splitButton, closeButton, state };

    helpButton.addEventListener('click', () => {
      toggleHelp(pane);
    });

    splitButton.addEventListener('click', openPicker);

    closeButton.addEventListener('click', () => {
      closePane(pane);
    });

    return pane;
  };

  const createDivider = () => {
    const divider = document.createElement('div');
    const handle = iconButton('icons10-resize-four-directions', 'Switch split orientation', 'wos-divider-handle');

    divider.className = 'wos-divider';
    divider.tabIndex = 0;
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-label', 'Resize the split');
    divider.setAttribute('aria-orientation', layout === 'vertical' ? 'vertical' : 'horizontal');
    divider.append(handle);

    const moveTo = (event) => {
      const bounds = workspace.getBoundingClientRect();
      const value = layout === 'vertical'
        ? (event.clientX - bounds.left) / bounds.width
        : (event.clientY - bounds.top) / bounds.height;

      ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, value));
      applySizes();
    };

    const endDrag = (event) => {
      if (divider.hasPointerCapture(event.pointerId)) {
        divider.releasePointerCapture(event.pointerId);
      }

      workspace.classList.remove('is-dragging');
      writeSession();
    };

    handle.addEventListener('click', (event) => {
      event.stopPropagation();
      layout = layout === 'vertical' ? 'horizontal' : 'vertical';
      divider.setAttribute('aria-orientation', layout === 'vertical' ? 'vertical' : 'horizontal');
      applySizes();
      writeSession();
    });

    divider.addEventListener('pointerdown', (event) => {
      if (event.target === handle || handle.contains(event.target)) {
        return;
      }

      event.preventDefault();
      divider.setPointerCapture(event.pointerId);
      workspace.classList.add('is-dragging');
    });

    divider.addEventListener('pointermove', (event) => {
      if (divider.hasPointerCapture(event.pointerId)) {
        moveTo(event);
      }
    });

    divider.addEventListener('pointerup', endDrag);
    divider.addEventListener('pointercancel', endDrag);

    divider.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 0.1 : 0.02;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        ratio = Math.max(MIN_RATIO, ratio - step);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        ratio = Math.min(MAX_RATIO, ratio + step);
      } else {
        return;
      }

      applySizes();
      writeSession();
    });

    return divider;
  };

  const layoutWorkspace = () => {
    workspace.textContent = '';

    panes.forEach((pane, index) => {
      if (index > 0) {
        workspace.append(createDivider());
      }

      workspace.append(pane.element);
    });

    refreshSplitButtons();
    applySizes();
  };

  const onWorkspaceKeyDown = (event) => {
    if (event.key !== 'Escape' || panes.length === 0) {
      return;
    }

    if (picker !== null) {
      closePicker();
      return;
    }

    closePane(panes[panes.length - 1]);
  };

  const ensureWorkspace = () => {
    if (workspace !== null) {
      return;
    }

    workspace = document.createElement('div');
    workspace.className = 'wos-workspace';
    workspace.dataset.layout = layout;
    document.body.append(workspace);
    document.addEventListener('keydown', onWorkspaceKeyDown);
    stateTimer = window.setInterval(writeSession, STATE_SYNC_MS);
  };

  const teardownWorkspace = () => {
    document.removeEventListener('keydown', onWorkspaceKeyDown);
    window.clearInterval(stateTimer);
    stateTimer = null;
    workspace.remove();
    workspace = null;
  };

  function openApp(app, state) {
    if (app === null || panes.length >= MAX_PANES) {
      return;
    }

    if (panes.some((pane) => pane.app.id === app.id)) {
      return;
    }

    ensureWorkspace();
    panes.push(createPane(app, state || ''));
    layoutWorkspace();
    writeSession();
  }

  function closePane(pane) {
    panes = panes.filter((entry) => entry !== pane);

    if (panes.length === 0) {
      teardownWorkspace();
      writeSession();

      const tile = launcher.querySelector(`[data-app="${pane.app.id}"]`);

      if (tile !== null) {
        tile.focus();
      }

      return;
    }

    ratio = 0.5;
    layoutWorkspace();
    writeSession();
    panes[0].closeButton.focus();
  }

  // Picker for the second pane

  function closePicker() {
    if (picker === null) {
      return;
    }

    picker.remove();
    picker = null;

    if (panes.length > 0) {
      panes[0].splitButton.focus();
    }
  }

  function openPicker() {
    if (picker !== null || panes.length >= MAX_PANES) {
      return;
    }

    const bar = document.createElement('div');
    const title = document.createElement('h2');
    const cancel = iconButton('icons10-cross', 'Cancel', 'wos-pane-button');
    const body = document.createElement('div');

    picker = document.createElement('div');
    picker.className = 'wos-picker';
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');
    picker.setAttribute('aria-label', 'Choose a second application');

    bar.className = 'wos-picker-bar';
    title.className = 'wos-picker-title';
    title.textContent = 'Choose a second application';
    bar.append(title, cancel);

    body.className = 'wos-picker-body';
    buildStacked(body, (app) => {
      closePicker();
      openApp(app, '');
    });

    picker.append(bar, body);
    document.body.append(picker);
    cancel.addEventListener('click', closePicker);

    const firstTile = body.querySelector('.app');

    if (firstTile !== null) {
      firstTile.focus();
    }
  }

  // Settings

  const choiceField = (legendText, name, options, current, onPick) => {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend');

    group.className = 'wos-settings-group';
    legend.textContent = legendText;
    group.append(legend);

    options.forEach(([value, label]) => {
      const row = document.createElement('label');
      const radio = document.createElement('input');
      const caption = document.createElement('span');

      row.className = 'wos-choice';
      radio.type = 'radio';
      radio.name = name;
      radio.value = value;
      radio.checked = value === current;
      radio.className = 'app-radio-button';
      caption.textContent = label;

      radio.addEventListener('change', () => {
        if (radio.checked) {
          onPick(value);
        }
      });

      row.append(radio, caption);
      group.append(row);
    });

    return group;
  };

  const buildFileList = (holder) => {
    holder.textContent = '';

    const entries = files.walk('/');

    if (entries.length === 0) {
      const empty = document.createElement('p');

      empty.className = 'wos-file-empty';
      empty.textContent = 'Nothing saved yet. Documents appear here as applications write them.';
      holder.append(empty);
      return;
    }

    const list = document.createElement('ul');

    list.className = 'wos-file-list';

    entries.forEach((entry) => {
      const item = document.createElement('li');
      const label = document.createElement('span');

      label.className = 'wos-file-name';
      label.textContent = entry.mode === 'd'
        ? `${entry.path}/`
        : `${entry.path} (${entry.size < 1024 ? `${entry.size} B` : `${(entry.size / 1024).toFixed(1)} KB`})`;
      item.append(label);

      const remove = iconButton('icons10-cross', `Delete ${entry.path}`, 'wos-pane-button');

      remove.addEventListener('click', () => {
        try {
          files.unlink(entry.path);
        } catch (error) {
          label.textContent = `${entry.path}: ${error.message}`;
          return;
        }

        buildFileList(holder);
      });

      item.append(remove);
      list.append(item);
    });

    holder.append(list);
  };

  /*
   * Moving the filesystem back into the address is only possible if it fits.
   * Where it does not, the person picks what goes, with the sizes in front of
   * them, and the switch happens once enough has been removed.
   */
  const buildTrimPanel = (holder, onDone) => {
    const panel = document.createElement('div');
    const heading = document.createElement('p');
    const list = document.createElement('ul');
    const actions = document.createElement('div');
    const apply = document.createElement('button');
    const cancel = document.createElement('button');
    const chosen = [];

    panel.className = 'wos-trim';
    heading.className = 'wos-storage-line';
    list.className = 'wos-file-list';

    const measure = () => {
      const usage = files.usage();
      const over = usage.encoded - WOSFS.ADDRESS_QUOTA;

      heading.textContent = over > 0
        ? `The filesystem is ${(usage.encoded / 1024).toFixed(1)} KB and an address holds ${(WOSFS.ADDRESS_QUOTA / 1024).toFixed(0)} KB. Remove at least ${(over / 1024).toFixed(1)} KB.`
        : 'Everything fits in an address now.';
      apply.disabled = over > 0;
    };

    files.walk('/').filter((entry) => entry.mode === 'f').sort((a, b) => b.size - a.size).forEach((entry) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      const remove = document.createElement('button');

      label.className = 'wos-file-name';
      label.textContent = `${entry.path} (${(entry.size / 1024).toFixed(1)} KB)`;

      remove.type = 'button';
      remove.className = 'app-btn app-btn-subtle';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        try {
          files.unlink(entry.path);
        } catch (error) {
          label.textContent = `${entry.path}: ${error.message}`;
          return;
        }

        chosen.push(entry.path);
        item.remove();
        measure();
      });

      item.append(label, remove);
      list.append(item);
    });

    apply.type = 'button';
    apply.className = 'app-btn app-btn-primary';
    apply.textContent = 'Move into the address';
    apply.addEventListener('click', () => {
      panel.remove();
      onDone(true);
    });

    cancel.type = 'button';
    cancel.className = 'app-btn';
    cancel.textContent = 'Keep using local storage';
    cancel.addEventListener('click', () => {
      panel.remove();
      onDone(false);
    });

    actions.className = 'wos-storage-actions';
    actions.append(apply, cancel);
    panel.append(heading, list, actions);
    holder.append(panel);
    measure();
  };

  const switchBackend = (value, holder) => {
    if (value === 'local') {
      settings.backend = 'local';
      announceQuota();
      repack();
      return;
    }

    files.quota = WOSFS.ADDRESS_QUOTA;

    if (files.usage().encoded <= WOSFS.ADDRESS_QUOTA) {
      settings.backend = 'address';
      writeLocal('');
      announceQuota();
      repack();
      return;
    }

    buildTrimPanel(holder, (moved) => {
      settings.backend = moved ? 'address' : 'local';

      if (moved) {
        writeLocal('');
      }

      announceQuota();
      repack();
      closeSettings();
      openSettings();
    });
  };

  const buildStorageSection = () => {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend');
    const columns = document.createElement('div');
    const left = document.createElement('div');
    const right = document.createElement('div');
    const usage = document.createElement('p');
    const meter = document.createElement('div');
    const bar = document.createElement('div');
    const fill = document.createElement('span');
    const figures = document.createElement('p');
    const filesHeading = document.createElement('h3');
    const holder = document.createElement('div');
    const transfer = document.createElement('div');
    const label = document.createElement('label');
    const caption = document.createElement('span');
    const box = document.createElement('textarea');
    const row = document.createElement('div');
    const exportButton = document.createElement('button');
    const importButton = document.createElement('button');
    const downloadButton = document.createElement('button');
    const result = document.createElement('p');

    group.className = 'wos-settings-group wos-storage';
    legend.textContent = 'Storage';
    columns.className = 'wos-storage-columns';
    left.className = 'wos-storage-column';
    right.className = 'wos-storage-column';

    usage.className = 'wos-storage-line';
    meter.className = 'wos-usage';
    bar.className = 'wos-usage-bar';
    fill.className = 'wos-usage-fill';
    figures.className = 'wos-usage-figures';
    bar.append(fill);
    meter.append(bar, figures);

    filesHeading.className = 'wos-storage-heading';
    filesHeading.textContent = 'Saved files';
    holder.className = 'wos-file-holder';
    result.className = 'wos-storage-line';

    const kb = (value) => (value < 1024 ? `${Math.round(value)} B` : `${(value / 1024).toFixed(1)} KB`);

    let describe = () => {
      if (storageShared === false) {
        usage.textContent = 'Saving needs the project served over http. Opened from disk, applications cannot share a filesystem, so the Files application and every Save control are hidden.';
        meter.hidden = true;
        return;
      }

      const counts = files.usage();

      meter.hidden = false;
      fill.style.width = `${Math.max(0.5, Math.min(100, counts.share * 100)).toFixed(1)}%`;
      fill.classList.toggle('is-full', counts.share > 0.9);
      figures.textContent = `${kb(counts.encoded)} used of ${kb(counts.quota)}, ${kb(counts.remaining)} left`;

      const where = settings.backend === 'local'
        ? 'Kept in local storage on this machine.'
        : 'Kept in the page address, so it travels with a copied or bookmarked link.';

      const many = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

      usage.textContent = `${storageNotice === '' ? where : storageNotice} ${many(counts.files, 'file')} in ${many(counts.directories, 'directory').replace('directorys', 'directories')}, of which ${kb(counts.reserve)} is settings and the open session. Images are ${WOSFS.canPack() ? 'compressed with gzip' : 'stored uncompressed, since this browser has no compression streams'}.`;
    };

    if (storageShared) {
      const choice = choiceField('Where the filesystem lives', 'wos-backend', [
        ['address', `In the page address, up to ${Math.round(WOSFS.ADDRESS_QUOTA / 1024)} KB`],
        ['local', `In local storage on this machine, up to ${Math.round(WOSFS.LOCAL_QUOTA / 1024 / 1024)} MB`]
      ], settings.backend, (value) => {
        /*
         * Moving back into the address empties the local storage key, so the
         * copy on this machine goes with it. That is a deletion, and it is
         * confirmed before anything is touched.
         */
        if (value === 'address' && settings.backend === 'local') {
          const agreed = window.confirm('Moving the filesystem back into the page address deletes the copy held in local storage on this machine. The files themselves travel into the address, as far as they fit. Continue?');

          if (agreed === false) {
            const held = document.querySelector('input[name="wos-backend"][value="local"]');

            if (held !== null) {
              held.checked = true;
            }

            return;
          }
        }

        switchBackend(value, left);
        describe();
        buildFileList(holder);
        writeSession();
      });
      left.append(choice);
    }

    left.append(meter, usage);

    if (storageShared) {
      buildFileList(holder);
      right.append(filesHeading, holder);
    }

    /* Opened from disk there is no file list, so the second column would be
       an empty half of the grid. It is left out instead. */
    columns.append(left);

    if (right.childElementCount > 0) {
      columns.append(right);
    }

    caption.textContent = 'Storage string';
    box.className = 'app-textarea wos-settings-string';
    box.rows = 2;
    box.spellcheck = false;
    box.setAttribute('aria-label', 'Storage string');
    label.className = 'wos-storage-field';
    label.append(caption, box);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'app-btn app-btn-subtle';
    deleteButton.textContent = 'Delete storage';
    deleteButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all saved files from this computer?')) {
        files.adopt(WOSFS.create());
        files.touched();
        writeLocal('');
        describe();
        buildFileList(holder);
        writeSession();
      }
    });

    [[exportButton, 'Export'], [importButton, 'Import'], [downloadButton, 'Save as a file']].forEach(([button, text]) => {
      button.type = 'button';
      button.className = 'app-btn';
      button.textContent = text;
    });

    const currentString = () => {
      writeSession();

      const address = window.location.hash.substring(1);

      /* In local storage the address holds no filesystem, so the export has to
         carry the image alongside the rest of the session. */
      if (settings.backend === 'local' && fsToken !== '') {
        return WOSFS.encode(`${address}${address === '' ? '' : '&'}fs=${fsToken}`);
      }

      return WOSFS.encode(address);
    };

    exportButton.addEventListener('click', () => {
      label.hidden = false;
      box.value = currentString();
      box.select();
      result.textContent = `${box.value.length} characters, carrying the settings, the open applications and every saved file.`;
    });

    downloadButton.addEventListener('click', () => {
      WOSDownload.locally(
        `whiteboard-os-${new Date().toISOString().substring(0, 10)}.wosdata`,
        currentString(),
        'text/plain'
      );

      result.textContent = 'Saved to this computer as a .wosdata file.';
    });

    importButton.addEventListener('click', () => {
      const raw = box.value.trim();

      if (raw === '') {
        result.textContent = 'Paste a string first.';
        return;
      }

      /* Only the two shapes this project writes are accepted, and the image
         inside is validated before anything is adopted. */
      const decoded = /^[A-Za-z0-9_-]+$/.test(raw) ? (WOSFS.decode(raw) || '') : raw.replace(/^#/, '');

      if (/^[a-z.]+=/.test(decoded) === false) {
        result.textContent = 'That string is not a session from this project.';
        return;
      }

      window.location.hash = decoded;
      window.location.reload();
    });

    row.className = 'wos-storage-actions';
    row.append(exportButton, importButton, downloadButton, deleteButton);
    transfer.className = 'wos-storage-transfer';
    transfer.append(label, row, result);

    const originalDescribe = describe;
    describe = () => {
      originalDescribe();
      if (settings.backend === 'local') {
        label.hidden = true;
        deleteButton.hidden = false;
      } else {
        label.hidden = false;
        deleteButton.hidden = true;
      }
    };

    describe();
    group.append(legend, columns, transfer);

    return group;
  };

  function closeSettings() {
    if (settingsPanel === null) {
      return;
    }

    settingsPanel.remove();
    settingsPanel = null;
    settingsButton.setAttribute('aria-expanded', 'false');
    settingsButton.focus();
  }

  function openSettings() {
    if (settingsPanel !== null) {
      closeSettings();
      return;
    }

    const bar = document.createElement('div');
    const title = document.createElement('h2');
    const close = iconButton('icons10-cross', 'Close settings', 'wos-pane-button');
    const body = document.createElement('div');

    settingsPanel = document.createElement('div');
    settingsPanel.className = 'wos-picker wos-settings';
    settingsPanel.setAttribute('role', 'dialog');
    settingsPanel.setAttribute('aria-modal', 'true');
    settingsPanel.setAttribute('aria-label', 'Settings');

    bar.className = 'wos-picker-bar';
    title.className = 'wos-picker-title';
    title.textContent = 'Settings';
    bar.append(title, close);

    body.className = 'wos-settings-body';

    body.append(choiceField('Appearance', 'wos-theme', [
      ['system', 'Follow the system setting'],
      ['light', 'Light'],
      ['dark', 'Dark']
    ], settings.theme, (value) => {
      settings.theme = value;
      applyTheme();
      panes.forEach((pane) => {
        pane.frame.src = themedUrl(pane.app, readPaneState(pane));
      });
      writeSession();
    }));

    body.append(choiceField('Home screen', 'wos-home', [
      ['paged', 'One category per page, swipe to move'],
      ['single', 'All categories on one page']
    ], settings.home, (value) => {
      settings.home = value;
      buildLauncher();
      writeSession();
    }));

    body.append(choiceField('Swiping animation', 'wos-swipe', [
      ['on', 'Slide from one category page to the next'],
      ['off', 'Change page at once, without the slide']
    ], settings.swipe, (value) => {
      settings.swipe = value;
      buildLauncher();
      writeSession();
    }));

    body.append(choiceField('Touch sound', 'wos-sound', [
      ['on', 'A short click when a control is pressed'],
      ['off', 'Silent']
    ], settings.sound, (value) => {
      settings.sound = value;
      applySound();

      if (value === 'on') {
        WOSClick.play();
      }

      writeSession();
    }));

    body.append(choiceField('Quick access bar', 'wos-dock', [
      ['sticky', 'Along the bottom, always in view'],
      ['bottom', 'Below the categories, scrolls away'],
      ['off', 'Hidden']
    ], settings.dock, (value) => {
      settings.dock = value;
      buildLauncher();
      writeSession();
    }));

    body.append(buildStorageSection());

    const note = document.createElement('p');

    note.className = 'wos-settings-note';
    note.textContent = 'Settings and the open applications always travel in the page address. Where saved documents go is the choice above. Neither place is a backup: an address can be lost and local storage is cleared with the browsing data, so anything that matters must be downloaded.';
    body.append(note);

    settingsPanel.append(bar, body);
    document.body.append(settingsPanel);
    close.addEventListener('click', closeSettings);
    settingsButton.setAttribute('aria-expanded', 'true');

    settingsPanel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSettings();
      }
    });

    close.focus();
  }

  // Restore

  const parseSession = () => {
    const raw = window.location.hash.substring(1);
    const values = {};

    if (raw === '') {
      return values;
    }

    raw.split('&').forEach((part) => {
      const separator = part.indexOf('=');

      if (separator > 0) {
        values[part.substring(0, separator)] = part.substring(separator + 1);
      }
    });

    return values;
  };

  const restoreFiles = (token) => {
    const held = settings.backend === 'local' ? readLocal() : token;

    files.quota = quotaFor();

    if (typeof held !== 'string' || held === '') {
      return;
    }

    WOSFS.open(held).then((restored) => {
      if (restored === null) {
        return;
      }

      files.adopt(restored);
      files.quota = quotaFor();
      fsToken = held;
      broadcast();
    });
  };

  const restore = () => {
    const values = parseSession();

    /*
     * When backend=local appears in the address, settings may have been
     * moved into localStorage. Check there first, then fall back to what
     * the address carries for backward compatibility.
     */
    const local = (values.backend === 'local' || readLocalSettings() !== null) ? readLocalSettings() : null;

    if (local !== null && typeof local === 'object') {
      if (local.theme === 'light' || local.theme === 'dark' || local.theme === 'system') {
        settings.theme = local.theme;
      }

      if (local.home === 'single' || local.home === 'paged') {
        settings.home = local.home;
      }

      if (local.swipe === 'on' || local.swipe === 'off') {
        settings.swipe = local.swipe;
      }

      if (local.sound === 'on' || local.sound === 'off') {
        settings.sound = local.sound;
      }

      if (['sticky', 'bottom', 'off'].indexOf(local.dock) >= 0) {
        settings.dock = local.dock;
      }

      settings.backend = storageShared ? 'local' : 'address';
    } else {
      if (values.theme === 'light' || values.theme === 'dark' || values.theme === 'system') {
        settings.theme = values.theme;
      }

      if (values.home === 'single' || values.home === 'paged') {
        settings.home = values.home;
      }

      if (values.swipe === 'on' || values.swipe === 'off') {
        settings.swipe = values.swipe;
      }

      if (values.sound === 'on' || values.sound === 'off') {
        settings.sound = values.sound;
      }

      if (values.backend === 'local' || values.backend === 'address') {
        settings.backend = storageShared ? values.backend : 'address';
      }

      if (['sticky', 'bottom', 'off'].indexOf(values.dock) >= 0) {
        settings.dock = values.dock;
      }
    }

    applyTheme();
    applySound();
    buildLauncher();
    restoreFiles(values.fs);

    if (typeof values.apps !== 'string') {
      return;
    }

    const ids = values.apps.split(',').filter((id) => appById(id) !== null).slice(0, MAX_PANES);

    if (ids.length === 0) {
      return;
    }

    layout = values.layout === 'horizontal' ? 'horizontal' : 'vertical';

    ids.forEach((id) => {
      const stored = values[`s.${id}`];

      openApp(appById(id), typeof stored === 'string' ? decodeURIComponent(stored) : '');
    });

    const parsedRatio = Number.parseFloat(values.ratio);

    ratio = Number.isFinite(parsedRatio) ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, parsedRatio)) : 0.5;
    applySizes();
  };

  /* Packing is asynchronous, so the address carries the last packed image and
     a change schedules a fresh one. */
  let packSequence = 0;
  let storageNotice = '';

  /*
   * Local storage holds several megabytes, so the filesystem can be much
   * larger there than in an address. Switching backends changes the ceiling,
   * and every frame is told the new one.
   */
  const quotaFor = () => (settings.backend === 'local' ? WOSFS.LOCAL_QUOTA : WOSFS.ADDRESS_QUOTA);

  const announceQuota = () => {
    files.quota = quotaFor();
    panes.forEach((pane) => {
      try {
        pane.frame.contentWindow.postMessage({ wos: true, type: 'quota', quota: files.quota }, '*');
        pane.frame.contentWindow.postMessage({ wos: true, type: 'backend', backend: settings.backend }, '*');
      } catch (error) {
        /* A frame that has gone away needs no quota. */
      }
    });
  };

  /*
   * Settings persistence in local storage.
   *
   * When the person chooses local storage, settings live alongside the
   * filesystem so the address can stay short. These three helpers manage that
   * key and keep it in sync.
   */
  const writeLocalSettings = () => {
    try {
      const data = {};

      if (settings.theme !== 'system') {
        data.theme = settings.theme;
      }

      if (settings.home !== 'paged') {
        data.home = settings.home;
      }

      if (settings.swipe !== 'on') {
        data.swipe = settings.swipe;
      }

      if (settings.sound !== 'off') {
        data.sound = settings.sound;
      }

      if (settings.dock !== 'sticky') {
        data.dock = settings.dock;
      }

      data.backend = 'local';
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    } catch (error) {
      /* localStorage is full or disabled; settings fall back to the address. */
    }
  };

  const readLocalSettings = () => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);

      if (typeof raw !== 'string' || raw === '') {
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  };

  const clearLocalSettings = () => {
    try {
      window.localStorage.removeItem(SETTINGS_KEY);
    } catch (error) {
      /* Nothing saved, nothing to clear. */
    }
  };

  const readLocal = () => {
    try {
      return window.localStorage.getItem(LOCAL_KEY);
    } catch (error) {
      return null;
    }
  };

  const writeLocal = (token) => {
    try {
      if (token === '') {
        window.localStorage.removeItem(LOCAL_KEY);
        return true;
      }

      window.localStorage.setItem(LOCAL_KEY, token);

      return true;
    } catch (error) {
      return false;
    }
  };

  const repack = () => {
    const usage = files.usage();

    if (usage.files === 0 && usage.directories <= 1) {
      packSequence += 1;
      fsToken = '';
      writeSession();
      return;
    }

    packSequence += 1;

    const ticket = packSequence;

    files.pack().then((token) => {
      /* Two writes in quick succession start two packs. Only the newer one may
         reach the address, whichever finishes first. */
      if (ticket !== packSequence) {
        return;
      }

      fsToken = token;

      if (settings.backend === 'local' && writeLocal(token) === false) {
        /* Local storage has its own limit and can refuse a write. Falling back
           keeps the session rather than losing it, and the Storage section
           says what happened. */
        settings.backend = 'address';
        storageNotice = 'Local storage refused the filesystem, so it went back into the address. Remove something large, or export it.';
        announceQuota();
      }

      writeSession();
    });
  };

  const shared = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  /*
   * Frames talk to the shell by message, which is the only channel that works
   * when the project is opened from disk as well as served. Opened from disk
   * the frames fall back to keeping documents inside themselves, so the shell
   * has nothing to answer and says so through the storage mode.
   */
  const sendImage = (target) => {
    if (target === null || target === undefined) {
      return;
    }

    try {
      target.postMessage({ wos: true, type: 'image', image: files.toString(), backend: settings.backend }, '*');
    } catch (error) {
      /* A frame that has gone away needs no image. */
    }
  };

  const broadcast = () => {
    panes.forEach((pane) => {
      sendImage(pane.frame.contentWindow);
    });
  };

  window.addEventListener('message', (event) => {
    const data = event.data;

    if (data === null || typeof data !== 'object' || data.wos !== true) {
      return;
    }

    const known = panes.some((pane) => pane.frame.contentWindow === event.source);

    if (known === false) {
      return;
    }

    if (data.type === 'sound-hello') {
      sendSound(event.source);
      return;
    }

    if (data.type === 'hello') {
      sendImage(event.source);
      try {
        event.source.postMessage({ wos: true, type: 'quota', quota: files.quota }, '*');
        event.source.postMessage({ wos: true, type: 'backend', backend: settings.backend }, '*');
      } catch (error) {
        /* Ignored */
      }
      return;
    }

    /*
     * A frame cannot reliably start a download of its own, so it asks here.
     * The shell is the top-level document and can.
     */
    if (data.type === 'download') {
      if (typeof data.name !== 'string' || typeof data.text !== 'string') {
        return;
      }

      const link = document.createElement('a');
      const isDataUrl = data.text.startsWith('data:');
      const mime = typeof data.mime === 'string' ? data.mime : 'text/plain';
      const url = isDataUrl ? data.text : URL.createObjectURL(new Blob([data.text], { type: mime }));

      link.download = data.name;
      link.href = url;
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();

      if (isDataUrl === false) {
        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 8000);
      }

      return;
    }

    if (data.type !== 'op' || typeof data.method !== 'string') {
      return;
    }

    if (['write', 'mkdir', 'unlink', 'rename'].indexOf(data.method) < 0) {
      return;
    }

    try {
      files[data.method].apply(files, data.args || []);
    } catch (error) {
      /* A refused write, a full quota: the frame already knows why. */
    }

    broadcast();
  });

  files.subscribe(repack);
  window.WOSFiles = files;
  window.WOSShared = shared;

  settingsButton.addEventListener('click', openSettings);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') {
      applyTheme();
      panes.forEach((pane) => {
        pane.frame.src = themedUrl(pane.app, readPaneState(pane));
      });
    }
  });

  restore();
})();
