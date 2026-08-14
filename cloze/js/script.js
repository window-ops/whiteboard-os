'use strict';

(() => {
  const TOKEN = /([\p{L}\p{M}'’-]+)/gu;

  const stage = document.getElementById('STAGE');
  const source = document.getElementById('SOURCE');
  const markBox = document.getElementById('MARK');
  const sheetBox = document.getElementById('SHEET');
  const clearButton = document.getElementById('CLEAR');
  const answersButton = document.getElementById('ANSWERS');
  const saveButton = document.getElementById('SAVE');
  const printButton = document.getElementById('PRINT');

  const steps = {
    text: document.getElementById('STEP-TEXT'),
    mark: document.getElementById('STEP-MARK'),
    sheet: document.getElementById('STEP-SHEET')
  };

  let step = 'text';
  let blanks = [];
  let showAnswers = false;

  const tokens = () => {
    const parts = source.value.split(TOKEN);
    const list = [];
    let wordIndex = 0;

    parts.forEach((part) => {
      if (part === '') {
        return;
      }

      if (TOKEN.test(part)) {
        TOKEN.lastIndex = 0;
        list.push({ word: true, text: part, index: wordIndex });
        wordIndex += 1;
        return;
      }

      TOKEN.lastIndex = 0;
      list.push({ word: false, text: part });
    });

    return list;
  };

  const isBlank = (index) => blanks.indexOf(index) >= 0;

  const renderMark = () => {
    markBox.textContent = '';

    tokens().forEach((token) => {
      if (token.word === false) {
        markBox.append(document.createTextNode(token.text));
        return;
      }

      const span = document.createElement('span');

      span.className = isBlank(token.index) ? 'cloze-word is-blank' : 'cloze-word';
      span.textContent = token.text;
      span.tabIndex = 0;
      span.setAttribute('role', 'button');
      span.setAttribute('aria-pressed', String(isBlank(token.index)));
      span.setAttribute('aria-label', `${token.text}, ${isBlank(token.index) ? 'blanked' : 'kept'}`);

      const toggle = () => {
        if (isBlank(token.index)) {
          blanks = blanks.filter((value) => value !== token.index);
        } else {
          blanks.push(token.index);
          blanks.sort((a, b) => a - b);
        }

        renderMark();
        save();
      };

      span.addEventListener('click', toggle);
      span.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });

      markBox.append(span);
    });
  };

  const renderSheet = () => {
    sheetBox.textContent = '';

    let number = 0;

    tokens().forEach((token) => {
      if (token.word === false) {
        sheetBox.append(document.createTextNode(token.text));
        return;
      }

      if (isBlank(token.index) === false) {
        sheetBox.append(document.createTextNode(token.text));
        return;
      }

      number += 1;

      const blank = document.createElement('span');
      const count = document.createElement('span');

      blank.className = 'cloze-blank';
      count.className = 'cloze-number';
      count.textContent = String(number);

      if (showAnswers) {
        const answer = document.createElement('span');

        answer.className = 'cloze-answer';
        answer.textContent = token.text;
        blank.append(answer);
      } else {
        blank.append(document.createTextNode('\u00a0'));
      }

      sheetBox.append(blank, count);
    });

    if (number === 0) {
      const note = document.createElement('p');

      note.className = 'tool-note';
      note.textContent = 'No words are blanked yet';
      sheetBox.append(note);
    }
  };

  const applyStep = () => {
    stage.dataset.step = step;

    Object.keys(steps).forEach((name) => {
      steps[name].setAttribute('aria-pressed', String(name === step));
    });

    if (step === 'mark') {
      renderMark();
    } else if (step === 'sheet') {
      renderSheet();
    }
  };

  function save() {
    WOSState.write({
      step,
      blanks: blanks.join('.'),
      text: source.value.length > 1200 ? '' : source.value
    });
  }

  Object.keys(steps).forEach((name) => {
    steps[name].addEventListener('click', () => {
      step = name;
      applyStep();
      save();
    });
  });

  source.addEventListener('change', save);

  clearButton.addEventListener('click', () => {
    blanks = [];
    applyStep();
    save();
  });

  answersButton.addEventListener('click', () => {
    showAnswers = showAnswers === false;
    answersButton.setAttribute('aria-pressed', String(showAnswers));
    answersButton.textContent = showAnswers ? 'Hide answers' : 'Show answers';

    if (step === 'sheet') {
      renderSheet();
    }
  });

  printButton.addEventListener('click', () => {
    step = 'sheet';
    applyStep();
    window.print();
  });

  saveButton.addEventListener('click', () => {
    const files = WOSState.files();

    if (files === null) {
      saveButton.textContent = 'Files unavailable';
      return;
    }

    const name = `cloze-${new Date().toISOString().substring(0, 10)}.json`;

    files.write(`/documents/${name}`, JSON.stringify({ text: source.value, blanks }));
    saveButton.textContent = `Saved ${name}`;
    window.setTimeout(() => {
      saveButton.textContent = 'Save to files';
    }, 2500);
  });

  const restore = () => {
    const values = WOSState.read();

    if (typeof values.text === 'string') {
      source.value = values.text;
    }

    if (typeof values.blanks === 'string' && values.blanks !== '') {
      blanks = values.blanks.split('.').map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);
    }

    step = ['text', 'mark', 'sheet'].indexOf(values.step) >= 0 ? values.step : 'text';
    applyStep();
  };

  restore();
})();
