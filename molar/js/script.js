'use strict';

(() => {
  const formulaInput = document.getElementById('FORMULA');
  const massInput = document.getElementById('MASS');
  const result = document.getElementById('RESULT');
  const amount = document.getElementById('AMOUNT');
  const tableBody = document.getElementById('TABLE-BODY');
  const status = document.getElementById('STATUS');

  const bySymbol = {};

  WOS_ELEMENTS.forEach((element) => {
    bySymbol[element.sym] = element;
  });

  /*
   * A formula is read left to right: a symbol is a capital and any lowercase
   * letters after it, brackets group, and a number multiplies whatever came
   * immediately before.
   */
  const parse = (source) => {
    const counts = {};
    const stack = [counts];
    let index = 0;

    const add = (symbol, quantity) => {
      const top = stack[stack.length - 1];

      top[symbol] = (top[symbol] || 0) + quantity;
    };

    const number = () => {
      let digits = '';

      while (index < source.length && /[0-9]/.test(source[index])) {
        digits += source[index];
        index += 1;
      }

      return digits === '' ? 1 : Number.parseInt(digits, 10);
    };

    while (index < source.length) {
      const character = source[index];

      if (character === ' ') {
        index += 1;
        continue;
      }

      if (character === '(' || character === '[') {
        stack.push({});
        index += 1;
        continue;
      }

      if (character === ')' || character === ']') {
        if (stack.length < 2) {
          throw new Error('the brackets do not match');
        }

        const group = stack.pop();

        index += 1;

        const multiplier = number();
        const top = stack[stack.length - 1];

        Object.keys(group).forEach((symbol) => {
          top[symbol] = (top[symbol] || 0) + group[symbol] * multiplier;
        });

        continue;
      }

      if (/[A-Z]/.test(character) === false) {
        throw new Error(`"${character}" cannot start an element symbol`);
      }

      let symbol = character;

      index += 1;

      while (index < source.length && /[a-z]/.test(source[index])) {
        symbol += source[index];
        index += 1;
      }

      if (Object.prototype.hasOwnProperty.call(bySymbol, symbol) === false) {
        throw new Error(`there is no element ${symbol}`);
      }

      add(symbol, number());
    }

    if (stack.length !== 1) {
      throw new Error('the brackets do not match');
    }

    return counts;
  };

  const tidy = (value, digits) => Number.parseFloat(value.toPrecision(digits || 6));

  const update = () => {
    tableBody.textContent = '';

    let counts;

    try {
      counts = parse(formulaInput.value.trim());
    } catch (error) {
      result.textContent = '';
      amount.textContent = '';
      status.textContent = error.message;
      return;
    }

    const symbols = Object.keys(counts);

    if (symbols.length === 0) {
      result.textContent = '';
      amount.textContent = '';
      status.textContent = 'Type a formula, for example H2SO4 or Ca(OH)2';
      return;
    }

    let total = 0;
    let missing = false;

    symbols.forEach((symbol) => {
      const element = bySymbol[symbol];

      if (element.mass === null) {
        missing = true;
        return;
      }

      total += element.mass * counts[symbol];
    });

    if (missing) {
      status.textContent = 'One of these elements has no accepted atomic weight, so the total is incomplete';
    } else {
      status.textContent = '';
    }

    result.textContent = `${tidy(total, 7)} g/mol`;

    const grams = Number.parseFloat(massInput.value.replace(',', '.'));

    amount.textContent = Number.isFinite(grams) && total > 0
      ? `${tidy(grams, 6)} g is ${tidy(grams / total, 5)} mol, which is ${tidy(grams / total * 6.02214076e23, 4)} particles.`
      : '';

    symbols.forEach((symbol) => {
      const element = bySymbol[symbol];
      const contribution = element.mass === null ? null : element.mass * counts[symbol];
      const row = document.createElement('tr');
      const cells = [
        `${element.name} (${symbol})`,
        String(counts[symbol]),
        element.mass === null ? 'no value' : String(tidy(element.mass, 6)),
        contribution === null ? 'no value' : String(tidy(contribution, 6)),
        contribution === null || total === 0 ? '-' : `${(contribution / total * 100).toFixed(2)} %`
      ];

      cells.forEach((text, position) => {
        const cell = document.createElement(position === 0 ? 'th' : 'td');

        if (position === 0) {
          cell.scope = 'row';
        }

        cell.textContent = text;
        row.append(cell);
      });

      tableBody.append(row);
    });
  };

  const save = () => {
    WOSState.write({ f: formulaInput.value, m: massInput.value });
  };

  formulaInput.addEventListener('input', update);
  massInput.addEventListener('input', update);

  [formulaInput, massInput].forEach((control) => {
    control.addEventListener('change', save);
  });

  const restore = () => {
    const values = WOSState.read();

    if (typeof values.f === 'string' && values.f !== '') {
      formulaInput.value = values.f;
    }

    if (typeof values.m === 'string' && values.m !== '') {
      massInput.value = values.m;
    }

    update();
  };

  restore();
})();
