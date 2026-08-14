'use strict';

/*
 * Shared helper: every tool keeps its settings in its own page address, which
 * is what the shell reads back when it writes the session.
 */

const WOSState = {
  /*
   * The shell passes its resolved theme in the page address. It is preserved
   * across writes so a reload inside the frame keeps the same appearance.
   */
  applyTheme() {
    const theme = this.read().theme;

    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },

  read() {
    const raw = window.location.hash.substring(1);
    const values = {};

    if (raw === '') {
      return values;
    }

    raw.split('&').forEach((part) => {
      const separator = part.indexOf('=');

      if (separator > 0) {
        const key = part.substring(0, separator);

        try {
          values[key] = decodeURIComponent(part.substring(separator + 1));
        } catch (error) {
          values[key] = '';
        }
      }
    });

    return values;
  },

  /*
   * Two keys belong to the system rather than to the tool: the theme the shell
   * passed in, and the in-app storage image. A tool writing its own settings
   * must not drop either.
   */
  write(values) {
    const parts = [];
    const held = this.read();

    if (held.theme === 'dark' || held.theme === 'light') {
      parts.push(`theme=${held.theme}`);
    }

    if (typeof held.docs === 'string' && held.docs !== '' && values.docs === undefined) {
      parts.push(`docs=${held.docs}`);
    }

    Object.keys(values).forEach((key) => {
      const value = values[key];

      if (value !== '' && value !== null && value !== undefined) {
        parts.push(`${key}=${encodeURIComponent(String(value))}`);
      }
    });

    const hash = parts.length === 0 ? '' : `#${parts.join('&')}`;

    this.address(hash);
  },

  /*
   * Rewriting the address through the history interface is refused on a file
   * URL, which is where this project often runs. Assigning the fragment is
   * allowed everywhere and stays on the same document, so it serves as the
   * fallback.
   */
  address(hash) {
    try {
      history.replaceState(undefined, '', hash === '' ? window.location.pathname : hash);
      return;
    } catch (error) {
      /* A file URL refuses the history interface. */
    }

    try {
      window.location.hash = hash === '' ? '' : hash.substring(1);
    } catch (error) {
      /* The page is going away, and its address no longer matters. */
    }
  },

  number(values, key, fallback) {
    const parsed = Number.parseFloat(values[key]);

    return Number.isFinite(parsed) ? parsed : fallback;
  },

  integer(values, key, fallback) {
    const parsed = Number.parseInt(values[key], 10);

    return Number.isFinite(parsed) ? parsed : fallback;
  },

  /*
   * The filesystem belongs to the shell, so a tool running in a pane borrows
   * it. Opened straight from disk, or outside the shell, there is nothing to
   * borrow and this returns null.
   */
  files() {
    try {
      if (window.parent !== window && window.parent.WOSFiles) {
        return window.parent.WOSFiles;
      }
    } catch (error) {
      return null;
    }

    return null;
  }
};

WOSState.applyTheme();
