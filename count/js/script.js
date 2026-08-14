'use strict';

(() => {
  const PATTERN_PATH = './patterns/';
  const WORD = /[\p{L}\p{M}'’-]+/gu;

  const languageSelect = document.getElementById('LANG');
  const wpmInput = document.getElementById('WPM');
  const textInput = document.getElementById('TEXT');
  const textButton = document.getElementById('VIEW-TEXT');
  const splitButton = document.getElementById('VIEW-SPLIT');
  const splitBox = document.getElementById('SPLIT');
  const status = document.getElementById('STATUS');

  const figures = {
    chars: document.getElementById('CHARS'),
    charsNs: document.getElementById('CHARS-NS'),
    words: document.getElementById('WORDS'),
    sentences: document.getElementById('SENTENCES'),
    syllables: document.getElementById('SYLLABLES'),
    reading: document.getElementById('READING'),
    longest: document.getElementById('LONGEST')
  };

  let showSplit = false;

  const words = () => textInput.value.match(WORD) || [];

  const sentences = () => {
    const trimmed = textInput.value.trim();

    if (trimmed === '') {
      return 0;
    }

    return trimmed.split(/[.!?…]+[\s"'’)\]]*/).filter((part) => part.trim() !== '').length;
  };

  const clock = (minutes) => {
    const total = Math.round(minutes * 60);

    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };

  const renderSplit = (list, code) => {
    splitBox.textContent = '';

    list.slice(0, 300).forEach((word) => {
      const holder = document.createElement('span');
      const pieces = WOSHyphen.split(code, word, true);

      holder.className = 'count-word';

      pieces.forEach((piece, index) => {
        if (index > 0) {
          const separator = document.createElement('span');

          separator.className = 'count-break';
          separator.textContent = '·';
          holder.append(separator);
        }

        holder.append(document.createTextNode(piece));
      });

      splitBox.append(holder);
    });

    if (list.length > 300) {
      const note = document.createElement('p');

      note.className = 'tool-note';
      note.textContent = `Showing the first 300 of ${list.length} words.`;
      splitBox.append(note);
    }
  };

  const update = () => {
    const text = textInput.value;
    const list = words();
    const code = languageSelect.value;
    const ready = WOSHyphen.has(code);

    figures.chars.textContent = String(text.length);
    figures.charsNs.textContent = String(text.replace(/\s/g, '').length);
    figures.words.textContent = String(list.length);
    figures.sentences.textContent = String(sentences());

    const speed = Math.min(400, Math.max(60, Number.parseInt(wpmInput.value, 10) || 150));

    figures.reading.textContent = clock(list.length / speed);

    let longest = '';

    list.forEach((word) => {
      if (word.length > longest.length) {
        longest = word;
      }
    });

    figures.longest.textContent = longest === '' ? '-' : longest;

    if (ready === false) {
      figures.syllables.textContent = '-';
      splitBox.hidden = true;
      return;
    }

    let syllables = 0;

    list.forEach((word) => {
      syllables += WOSHyphen.count(code, word);
    });

    figures.syllables.textContent = String(syllables);
    splitBox.hidden = showSplit === false;

    if (showSplit) {
      renderSplit(list, code);
    }
  };

  const applyLanguage = () => {
    const code = languageSelect.value;

    if (WOSHyphen.has(code)) {
      status.textContent = '';
      update();
      return;
    }

    status.textContent = 'Loading patterns';

    WOSHyphen.load(code, PATTERN_PATH)
      .then(() => {
        status.textContent = '';
        update();
      })
      .catch(() => {
        status.textContent = 'Those patterns could not be loaded';
        update();
      });
  };

  const applyView = () => {
    textButton.setAttribute('aria-pressed', String(showSplit === false));
    splitButton.setAttribute('aria-pressed', String(showSplit));
    splitBox.hidden = showSplit === false;
    update();
  };

  const save = () => {
    WOSState.write({ lang: languageSelect.value, wpm: wpmInput.value, split: showSplit ? '1' : '' });
  };

  WOS_LANGUAGES.forEach((language) => {
    const option = document.createElement('option');

    option.value = language.code;
    option.textContent = language.name;
    languageSelect.append(option);
  });

  languageSelect.addEventListener('change', () => {
    applyLanguage();
    save();
  });

  wpmInput.addEventListener('input', update);
  wpmInput.addEventListener('change', save);
  textInput.addEventListener('input', update);

  [[false, textButton], [true, splitButton]].forEach(([value, button]) => {
    button.addEventListener('click', () => {
      showSplit = value;
      applyView();
      save();
    });
  });

  const restore = () => {
    const values = WOSState.read();

    if (WOS_LANGUAGES.some((language) => language.code === values.lang)) {
      languageSelect.value = values.lang;
    } else {
      languageSelect.value = 'en-gb';
    }

    wpmInput.value = String(WOSState.integer(values, 'wpm', 150));
    showSplit = values.split === '1';

    applyView();
    applyLanguage();
  };

  restore();
})();
