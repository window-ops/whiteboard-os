'use strict';

(() => {
  const DEFAULT_TEXT = 'The quick brown fox jumps over the lazy dog\nhyphenation\nvocabulary';

  const sourceInput = document.getElementById('SOURCE');
  const levelSelect = document.getElementById('LEVEL');
  const scrambleButton = document.getElementById('SCRAMBLE');
  const revealButton = document.getElementById('REVEAL');
  const wordsButton = document.getElementById('MODE-WORDS');
  const lettersButton = document.getElementById('MODE-LETTERS');
  const output = document.getElementById('OUTPUT');

  let mode = 'words';
  let revealed = false;

  const randomInt = (max) => {
    const buffer = new Uint32Array(1);

    window.crypto.getRandomValues(buffer);

    return buffer[0] % max;
  };

  const shuffled = (list) => {
    const copy = list.slice();

    for (let i = copy.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      const held = copy[i];

      copy[i] = copy[j];
      copy[j] = held;
    }

    return copy;
  };

  /*
   * Difficulty is the share of positions allowed to move. At the gentle level
   * most of the sequence stays put, which leaves a recognisable skeleton.
   */
  const disturb = (list, level) => {
    if (list.length < 2) {
      return list.slice();
    }

    if (level >= 3) {
      let attempt = shuffled(list);
      let guard = 0;

      while (attempt.join('\u0000') === list.join('\u0000') && guard < 20) {
        attempt = shuffled(list);
        guard += 1;
      }

      return attempt;
    }

    const share = level === 1 ? 0.4 : 0.75;
    const positions = [];

    list.forEach((item, index) => {
      if (Math.random() < share) {
        positions.push(index);
      }
    });

    if (positions.length < 2) {
      positions.length = 0;
      positions.push(0, list.length - 1);
    }

    const values = shuffled(positions.map((index) => list[index]));
    const result = list.slice();

    positions.forEach((index, order) => {
      result[index] = values[order];
    });

    return result;
  };

  const lines = () =>
    sourceInput.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

  const build = () => {
    const level = Number.parseInt(levelSelect.value, 10);

    output.textContent = '';

    lines().forEach((line) => {
      const item = document.createElement('div');
      const puzzle = document.createElement('p');
      const answer = document.createElement('p');

      item.className = 'scramble-item';
      puzzle.className = 'scramble-puzzle';
      answer.className = 'scramble-answer';
      answer.hidden = revealed === false;

      if (mode === 'words') {
        puzzle.textContent = disturb(line.split(/\s+/), level).join(' ');
      } else {
        puzzle.textContent = line
          .split(/\s+/)
          .map((word) => disturb(Array.from(word), level).join(''))
          .join(' ');
      }

      answer.textContent = line;
      item.append(puzzle, answer);
      output.append(item);
    });

    if (output.children.length === 0) {
      const note = document.createElement('p');

      note.className = 'tool-note';
      note.textContent = 'Type or paste something on the left, then scramble';
      output.append(note);
    }
  };

  const applyMode = () => {
    wordsButton.setAttribute('aria-pressed', String(mode === 'words'));
    lettersButton.setAttribute('aria-pressed', String(mode === 'letters'));
  };

  const save = () => {
    WOSState.write({ mode, level: levelSelect.value, text: sourceInput.value.length > 900 ? '' : sourceInput.value });
  };

  scrambleButton.addEventListener('click', build);

  revealButton.addEventListener('click', () => {
    revealed = revealed === false;
    revealButton.setAttribute('aria-pressed', String(revealed));
    revealButton.textContent = revealed ? 'Hide' : 'Reveal';

    Array.from(output.querySelectorAll('.scramble-answer')).forEach((answer) => {
      answer.hidden = revealed === false;
    });
  });

  [['words', wordsButton], ['letters', lettersButton]].forEach(([name, button]) => {
    button.addEventListener('click', () => {
      mode = name;
      applyMode();
      build();
      save();
    });
  });

  levelSelect.addEventListener('change', () => {
    build();
    save();
  });

  sourceInput.addEventListener('change', save);

  const restore = () => {
    const values = WOSState.read();

    sourceInput.value = typeof values.text === 'string' && values.text !== '' ? values.text : DEFAULT_TEXT;
    mode = values.mode === 'letters' ? 'letters' : 'words';

    if (['1', '2', '3'].indexOf(values.level) >= 0) {
      levelSelect.value = values.level;
    }

    applyMode();
    build();
  };

  restore();
})();
