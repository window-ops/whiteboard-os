'use strict';

(() => {
  const DOTTED_CIRCLE = '\u25cc';

  const line = document.getElementById('LINE');
  const chart = document.getElementById('CHART');
  const slashesButton = document.getElementById('SLASHES');
  const bracketsButton = document.getElementById('BRACKETS');
  const backButton = document.getElementById('BACK');
  const clearButton = document.getElementById('CLEAR');
  const copyButton = document.getElementById('COPY');

  const save = () => {
    WOSState.write({ t: line.value });
  };

  const insert = (text) => {
    const start = line.selectionStart === null ? line.value.length : line.selectionStart;
    const end = line.selectionEnd === null ? line.value.length : line.selectionEnd;

    line.value = line.value.substring(0, start) + text + line.value.substring(end);
    line.focus();
    line.setSelectionRange(start + text.length, start + text.length);
    save();
  };

  const wrap = (open, close) => {
    line.value = `${open}${line.value}${close}`;
    line.focus();
    save();
  };

  /* A combining mark has no width of its own, so it is shown on a dotted circle. */
  const isCombining = (symbol) => /^[\u0300-\u036f\u1dc0-\u1dff\u1ab0-\u1aff]/.test(symbol);

  const build = () => {
    WOS_IPA.forEach((group) => {
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      const keys = document.createElement('div');

      section.className = 'ipa-group';
      heading.textContent = group.name;
      keys.className = 'ipa-keys';

      group.symbols.forEach((entry) => {
        const key = document.createElement('button');

        key.type = 'button';
        key.className = 'ipa-key';
        key.textContent = isCombining(entry.s) ? DOTTED_CIRCLE + entry.s : entry.s;
        key.setAttribute('aria-label', entry.n || `Insert ${entry.s}`);
        key.title = entry.n || entry.s;

        key.addEventListener('click', () => {
          insert(entry.s);
        });

        keys.append(key);
      });

      section.append(heading, keys);
      chart.append(section);
    });
  };

  slashesButton.addEventListener('click', () => {
    wrap('/', '/');
  });

  bracketsButton.addEventListener('click', () => {
    wrap('[', ']');
  });

  backButton.addEventListener('click', () => {
    line.value = Array.from(line.value).slice(0, -1).join('');
    line.focus();
    save();
  });

  clearButton.addEventListener('click', () => {
    line.value = '';
    line.focus();
    save();
  });

  copyButton.addEventListener('click', () => {
    line.select();

    if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
      window.navigator.clipboard.writeText(line.value).catch(() => {
        copyButton.textContent = 'Copy failed';
      });
    }

    copyButton.textContent = 'Copied';
    window.setTimeout(() => {
      copyButton.textContent = 'Copy';
    }, 1800);
  });

  line.addEventListener('change', save);

  const restore = () => {
    const values = WOSState.read();

    if (typeof values.t === 'string') {
      line.value = values.t;
    }
  };

  build();
  restore();
})();
