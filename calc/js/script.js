'use strict';

(() => {
  const MAX_HISTORY = 40;

  const line = document.getElementById('LINE');
  const result = document.getElementById('RESULT');
  const status = document.getElementById('STATUS');
  const historyBox = document.getElementById('HISTORY');
  const variablesBox = document.getElementById('VARIABLES');
  const angleSelect = document.getElementById('ANGLE');
  const precisionInput = document.getElementById('PRECISION');
  const clearButton = document.getElementById('CLEAR-HISTORY');

  const scope = {};
  let history = [];

  const settings = () => ({
    angles: angleSelect.value,
    precision: Number.parseInt(precisionInput.value, 10) || 10
  });

  const renderVariables = () => {
    variablesBox.textContent = '';

    const names = Object.keys(scope);

    if (names.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');

      cell.className = 'tool-note';
      cell.textContent = 'None yet, try x = 4';
      row.append(cell);
      variablesBox.append(row);
      return;
    }

    names.forEach((name) => {
      const row = document.createElement('tr');
      const label = document.createElement('td');
      const value = document.createElement('td');

      label.textContent = name;
      value.textContent = WOSCalc.format(scope[name], settings().precision);
      row.append(label, value);
      variablesBox.append(row);
    });
  };

  const renderHistory = () => {
    historyBox.textContent = '';

    history.slice().reverse().forEach((entry) => {
      const item = document.createElement('li');
      const value = document.createElement('span');

      value.className = 'calc-history-value';
      value.textContent = ` = ${entry.result}`;
      item.append(document.createTextNode(entry.input), value);
      item.title = 'Put this back in the entry line';
      item.addEventListener('click', () => {
        line.value = entry.input;
        line.focus();
      });

      historyBox.append(item);
    });
  };

  const save = () => {
    WOSState.write({
      angle: angleSelect.value,
      p: precisionInput.value,
      h: history.slice(-12).map((entry) => entry.input).join('\u001f')
    });
  };

  const run = () => {
    const input = line.value.trim();

    if (input === '') {
      return;
    }

    try {
      const outcome = WOSCalc.run(input, scope, settings());

      result.textContent = outcome.text;
      status.textContent = outcome.assigned === null ? '' : `Stored in ${outcome.assigned}`;
      scope.ans = outcome.quantity;

      history.push({ input, result: outcome.text });

      if (history.length > MAX_HISTORY) {
        history.shift();
      }

      line.value = '';
      renderHistory();
      renderVariables();
      save();
    } catch (error) {
      status.textContent = error.message;
    }
  };

  line.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
      return;
    }

    if (event.key === 'ArrowUp' && line.value === '' && history.length > 0) {
      event.preventDefault();
      line.value = history[history.length - 1].input;
    }
  });

  [angleSelect, precisionInput].forEach((control) => {
    control.addEventListener('change', save);
  });

  clearButton.addEventListener('click', () => {
    history = [];
    renderHistory();
    save();
  });

  const restore = () => {
    const values = WOSState.read();

    if (values.angle === 'deg' || values.angle === 'rad') {
      angleSelect.value = values.angle;
    }

    precisionInput.value = String(WOSState.integer(values, 'p', 10));

    if (typeof values.h === 'string' && values.h !== '') {
      values.h.split('\u001f').forEach((input) => {
        try {
          const outcome = WOSCalc.run(input, scope, settings());

          history.push({ input, result: outcome.text });
          scope.ans = outcome.quantity;
        } catch (error) {
          history.push({ input, result: 'could not be repeated' });
        }
      });
    }

    renderHistory();
    renderVariables();
  };

  restore();
})();
