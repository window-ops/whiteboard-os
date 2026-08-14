'use strict';

/*
 * The calculator engine.
 *
 * Qalculate is a C++ library, so a fork of it cannot run inside a static page
 * without a WebAssembly build and the toolchain that produces one. This is a
 * smaller engine written for the same job: it parses to reverse Polish
 * notation, carries a unit with every quantity, and converts on request.
 *
 * A quantity is { value, units }, where units maps a base unit to its
 * exponent, so 3 km/h is { value: 0.8333, units: { m: 1, s: -1 } }.
 */

const WOSCalc = (() => {
  const CONSTANTS = {
    pi: { value: Math.PI, units: {} },
    e: { value: Math.E, units: {} },
    phi: { value: (1 + Math.sqrt(5)) / 2, units: {} },
    c: { value: 299792458, units: { m: 1, s: -1 } },
    g0: { value: 9.80665, units: { m: 1, s: -2 } }
  };

  /* Every unit reduces to a base of metre, kilogram, second, kelvin or byte. */
  const UNITS = {
    m: [1, { m: 1 }], km: [1000, { m: 1 }], cm: [0.01, { m: 1 }], mm: [0.001, { m: 1 }],
    km2: [1000000, { m: 2 }], m2: [1, { m: 2 }], cm2: [0.0001, { m: 2 }], ha: [10000, { m: 2 }],
    m3: [1, { m: 3 }], l: [0.001, { m: 3 }], ml: [0.000001, { m: 3 }],
    kg: [1, { kg: 1 }], g: [0.001, { kg: 1 }], mg: [0.000001, { kg: 1 }], t: [1000, { kg: 1 }],
    s: [1, { s: 1 }], ms: [0.001, { s: 1 }], min: [60, { s: 1 }], h: [3600, { s: 1 }],
    d: [86400, { s: 1 }], week: [604800, { s: 1 }], year: [31557600, { s: 1 }],
    K: [1, { K: 1 }],
    N: [1, { kg: 1, m: 1, s: -2 }], J: [1, { kg: 1, m: 2, s: -2 }], kJ: [1000, { kg: 1, m: 2, s: -2 }],
    W: [1, { kg: 1, m: 2, s: -3 }], kW: [1000, { kg: 1, m: 2, s: -3 }],
    Pa: [1, { kg: 1, m: -1, s: -2 }], kPa: [1000, { kg: 1, m: -1, s: -2 }], bar: [100000, { kg: 1, m: -1, s: -2 }],
    Hz: [1, { s: -1 }],
    B: [1, { B: 1 }], kB: [1000, { B: 1 }], MB: [1000000, { B: 1 }], GB: [1000000000, { B: 1 }],
    KiB: [1024, { B: 1 }], MiB: [1048576, { B: 1 }], GiB: [1073741824, { B: 1 }]
  };

  const FUNCTIONS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp,
    floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign
  };

  const ANGLE_FUNCTIONS = ['sin', 'cos', 'tan'];
  const INVERSE_ANGLE_FUNCTIONS = ['asin', 'acos', 'atan'];

  const BINARY_FUNCTIONS = {
    min: Math.min,
    max: Math.max,
    gcd: (a, b) => {
      let x = Math.abs(Math.round(a));
      let y = Math.abs(Math.round(b));

      while (y !== 0) {
        const held = y;

        y = x % y;
        x = held;
      }

      return x;
    },
    lcm: (a, b) => Math.abs(Math.round(a) * Math.round(b)) / BINARY_FUNCTIONS.gcd(a, b)
  };

  const OPERATORS = {
    '+': { precedence: 1, right: false },
    '-': { precedence: 1, right: false },
    '*': { precedence: 2, right: false },
    '/': { precedence: 2, right: false },
    '%': { precedence: 2, right: false },
    '^': { precedence: 4, right: true },
    /* A unit binds to the number in front of it more tightly than division
       does, so 100 km / 2 h reads as 100 km divided by 2 hours. */
    '\u00b7': { precedence: 3, right: false }
  };

  const UNARY = { precedence: 3.5, right: true };

  const sameUnits = (a, b) => {
    const keys = new Set(Object.keys(a).concat(Object.keys(b)));
    let equal = true;

    keys.forEach((key) => {
      if ((a[key] || 0) !== (b[key] || 0)) {
        equal = false;
      }
    });

    return equal;
  };

  const combine = (a, b, sign) => {
    const result = {};

    Object.keys(a).forEach((key) => {
      result[key] = a[key];
    });

    Object.keys(b).forEach((key) => {
      result[key] = (result[key] || 0) + sign * b[key];
    });

    Object.keys(result).forEach((key) => {
      if (result[key] === 0) {
        delete result[key];
      }
    });

    return result;
  };

  const describeUnits = (units) => {
    const positive = [];
    const negative = [];

    Object.keys(units).sort().forEach((key) => {
      const power = units[key];
      const text = Math.abs(power) === 1 ? key : `${key}^${Math.abs(power)}`;

      if (power > 0) {
        positive.push(text);
      } else {
        negative.push(text);
      }
    });

    if (positive.length === 0 && negative.length === 0) {
      return '';
    }

    const top = positive.length === 0 ? '1' : positive.join('·');

    return negative.length === 0 ? top : `${top}/${negative.join('·')}`;
  };

  const tokenize = (source, scope) => {
    const tokens = [];
    let index = 0;

    while (index < source.length) {
      const character = source[index];

      if (character === ' ') {
        index += 1;
        continue;
      }

      if (character === ',') {
        tokens.push({ type: 'comma' });
        index += 1;
        continue;
      }

      if (/[0-9.]/.test(character)) {
        if (character === '0' && /[xb]/i.test(source[index + 1] || '')) {
          const radix = source[index + 1].toLowerCase() === 'x' ? 16 : 2;
          const digits = radix === 16 ? /[0-9a-f]/i : /[01]/;
          let text = '';

          index += 2;

          while (index < source.length && digits.test(source[index])) {
            text += source[index];
            index += 1;
          }

          tokens.push({ type: 'number', value: Number.parseInt(text, radix) });
          continue;
        }

        let number = '';

        while (index < source.length && /[0-9.]/.test(source[index])) {
          number += source[index];
          index += 1;
        }

        tokens.push({ type: 'number', value: Number.parseFloat(number) });
        continue;
      }

      if (/[a-zA-Z_]/.test(character)) {
        let word = '';

        while (index < source.length && /[a-zA-Z_0-9]/.test(source[index])) {
          word += source[index];
          index += 1;
        }

        const isFunction = Object.prototype.hasOwnProperty.call(FUNCTIONS, word)
          || Object.prototype.hasOwnProperty.call(BINARY_FUNCTIONS, word)
          || word === 'fact';
        let after = index;

        while (after < source.length && source[after] === ' ') {
          after += 1;
        }

        /* min is both a function and a unit of time. A bracket after the name
           settles which one was meant. */
        const calls = source[after] === '(';

        if (isFunction && (calls || Object.prototype.hasOwnProperty.call(UNITS, word) === false)) {
          tokens.push({ type: 'function', value: word });
        } else if (Object.prototype.hasOwnProperty.call(UNITS, word)) {
          tokens.push({ type: 'unit', value: word });
        } else if (Object.prototype.hasOwnProperty.call(CONSTANTS, word)) {
          tokens.push({ type: 'quantity', value: CONSTANTS[word] });
        } else if (Object.prototype.hasOwnProperty.call(scope, word)) {
          tokens.push({ type: 'quantity', value: scope[word] });
        } else {
          throw new Error(`"${word}" is not a name this calculator knows`);
        }

        continue;
      }

      if (Object.prototype.hasOwnProperty.call(OPERATORS, character)) {
        tokens.push({ type: 'operator', value: character });
        index += 1;
        continue;
      }

      if (character === '(' || character === ')') {
        tokens.push({ type: character });
        index += 1;
        continue;
      }

      if (character === '!') {
        tokens.push({ type: 'postfix', value: '!' });
        index += 1;
        continue;
      }

      throw new Error(`"${character}" has no meaning here`);
    }

    return tokens;
  };

  /* A unit token directly after a value multiplies it, and so does a bracket. */
  const insertProducts = (tokens) => {
    const output = [];

    tokens.forEach((token, position) => {
      if (position > 0) {
        const previous = tokens[position - 1];
        const closes = ['number', 'quantity', 'unit', 'postfix'].indexOf(previous.type) >= 0 || previous.type === ')';
        const opens = ['number', 'quantity', 'unit', 'function'].indexOf(token.type) >= 0 || token.type === '(';

        if (closes && opens) {
          output.push({ type: 'operator', value: token.type === 'unit' ? '\u00b7' : '*' });
        }
      }

      output.push(token);
    });

    return output;
  };

  const markUnary = (tokens) => tokens.map((token, position) => {
    if (token.type !== 'operator' || token.value !== '-') {
      return token;
    }

    const previous = position === 0 ? null : tokens[position - 1];

    return previous === null || previous.type === 'operator' || previous.type === '(' ? { type: 'unary' } : token;
  });

  const toRpn = (tokens) => {
    const output = [];
    const stack = [];

    tokens.forEach((token) => {
      if (['number', 'quantity', 'unit', 'postfix'].indexOf(token.type) >= 0) {
        output.push(token);
        return;
      }

      if (token.type === 'function' || token.type === 'unary') {
        stack.push(token);
        return;
      }

      if (token.type === 'operator') {
        const current = OPERATORS[token.value];

        while (stack.length > 0) {
          const top = stack[stack.length - 1];

          if (top.type === 'function') {
            output.push(stack.pop());
            continue;
          }

          const other = top.type === 'unary' ? UNARY : (top.type === 'operator' ? OPERATORS[top.value] : null);

          if (other !== null) {
            const takes = current.right ? other.precedence > current.precedence : other.precedence >= current.precedence;

            if (takes) {
              output.push(stack.pop());
              continue;
            }
          }

          break;
        }

        stack.push(token);
        return;
      }

      if (token.type === 'comma') {
        while (stack.length > 0 && stack[stack.length - 1].type !== '(') {
          output.push(stack.pop());
        }

        return;
      }

      if (token.type === '(') {
        stack.push(token);
        return;
      }

      if (token.type === ')') {
        let matched = false;

        while (stack.length > 0) {
          const top = stack.pop();

          if (top.type === '(') {
            matched = true;
            break;
          }

          output.push(top);
        }

        if (matched === false) {
          throw new Error('the brackets do not match');
        }
      }
    });

    while (stack.length > 0) {
      const top = stack.pop();

      if (top.type === '(') {
        throw new Error('the brackets do not match');
      }

      output.push(top);
    }

    return output;
  };

  const factorial = (value) => {
    const whole = Math.round(value);

    if (whole < 0 || whole > 170) {
      throw new Error('a factorial needs a whole number up to 170');
    }

    let total = 1;

    for (let i = 2; i <= whole; i++) {
      total *= i;
    }

    return total;
  };

  const evaluate = (rpn, angles) => {
    const stack = [];
    const toRadians = (value) => (angles === 'deg' ? value * Math.PI / 180 : value);
    const fromRadians = (value) => (angles === 'deg' ? value * 180 / Math.PI : value);

    rpn.forEach((token) => {
      if (token.type === 'number') {
        stack.push({ value: token.value, units: {} });
        return;
      }

      if (token.type === 'quantity') {
        stack.push({ value: token.value.value, units: Object.assign({}, token.value.units) });
        return;
      }

      if (token.type === 'unit') {
        const definition = UNITS[token.value];

        stack.push({ value: definition[0], units: Object.assign({}, definition[1]) });
        return;
      }

      if (token.type === 'postfix') {
        const operand = stack.pop();

        stack.push({ value: factorial(operand.value), units: {} });
        return;
      }

      if (token.type === 'unary') {
        const operand = stack.pop();

        stack.push({ value: -operand.value, units: operand.units });
        return;
      }

      if (token.type === 'function') {
        if (Object.prototype.hasOwnProperty.call(BINARY_FUNCTIONS, token.value)) {
          const second = stack.pop();
          const first = stack.pop();

          stack.push({ value: BINARY_FUNCTIONS[token.value](first.value, second.value), units: {} });
          return;
        }

        const operand = stack.pop();

        if (token.value === 'fact') {
          stack.push({ value: factorial(operand.value), units: {} });
          return;
        }

        if (ANGLE_FUNCTIONS.indexOf(token.value) >= 0) {
          stack.push({ value: FUNCTIONS[token.value](toRadians(operand.value)), units: {} });
          return;
        }

        if (INVERSE_ANGLE_FUNCTIONS.indexOf(token.value) >= 0) {
          stack.push({ value: fromRadians(FUNCTIONS[token.value](operand.value)), units: {} });
          return;
        }

        stack.push({ value: FUNCTIONS[token.value](operand.value), units: operand.units });
        return;
      }

      const right = stack.pop();
      const left = stack.pop();

      if (left === undefined || right === undefined) {
        throw new Error('the expression is incomplete');
      }

      if (token.value === '+' || token.value === '-') {
        if (sameUnits(left.units, right.units) === false) {
          throw new Error(`${describeUnits(left.units) || 'a plain number'} and ${describeUnits(right.units) || 'a plain number'} cannot be added`);
        }

        stack.push({
          value: token.value === '+' ? left.value + right.value : left.value - right.value,
          units: left.units
        });
        return;
      }

      if (token.value === '*' || token.value === '\u00b7') {
        stack.push({ value: left.value * right.value, units: combine(left.units, right.units, 1) });
        return;
      }

      if (token.value === '/') {
        stack.push({ value: left.value / right.value, units: combine(left.units, right.units, -1) });
        return;
      }

      if (token.value === '%') {
        stack.push({ value: left.value % right.value, units: left.units });
        return;
      }

      if (Object.keys(right.units).length > 0) {
        throw new Error('an exponent cannot carry a unit');
      }

      const power = {};

      Object.keys(left.units).forEach((key) => {
        power[key] = left.units[key] * right.value;
      });

      stack.push({ value: Math.pow(left.value, right.value), units: power });
    });

    if (stack.length !== 1) {
      throw new Error('the expression is incomplete');
    }

    return stack[0];
  };

  const format = (quantity, precision) => {
    const magnitude = Math.abs(quantity.value);
    const digits = Math.min(15, Math.max(2, precision));
    let text;

    if (magnitude !== 0 && (magnitude < 1e-6 || magnitude >= 1e15)) {
      text = quantity.value.toExponential(Math.min(digits, 12));
    } else {
      text = String(Number.parseFloat(quantity.value.toPrecision(digits)));
    }

    const units = describeUnits(quantity.units);

    return units === '' ? text : `${text} ${units}`;
  };

  /*
   * "in" chooses how to present a result: a unit converts the value, and a
   * base rewrites a plain number.
   */
  const present = (quantity, target, precision) => {
    if (target === '') {
      return format(quantity, precision);
    }

    const bases = { hex: 16, binary: 2, bin: 2, octal: 8, oct: 8, decimal: 10 };

    if (Object.prototype.hasOwnProperty.call(bases, target)) {
      if (Object.keys(quantity.units).length > 0) {
        throw new Error('only a plain number can change base');
      }

      const whole = Math.round(quantity.value);
      const prefix = bases[target] === 16 ? '0x' : (bases[target] === 2 ? '0b' : '');

      return prefix + whole.toString(bases[target]);
    }

    if (Object.prototype.hasOwnProperty.call(UNITS, target) === false) {
      throw new Error(`"${target}" is not a unit this calculator knows`);
    }

    const definition = UNITS[target];

    if (sameUnits(quantity.units, definition[1]) === false) {
      throw new Error(`${describeUnits(quantity.units) || 'a plain number'} cannot be shown in ${target}`);
    }

    const digits = Math.min(15, Math.max(2, precision));

    return `${Number.parseFloat((quantity.value / definition[0]).toPrecision(digits))} ${target}`;
  };

  /* "200 + 15%" means 200 plus fifteen percent of 200. */
  const expandPercentages = (source) =>
    source.replace(/([+-])\s*([0-9.]+)\s*%/g, (whole, sign, number) => `${sign}(${number}/100)*`);

  const run = (line, scope, options) => {
    const settings = options || {};
    const precision = settings.precision || 10;
    const angles = settings.angles || 'rad';
    let text = line.trim();
    let assignTo = null;
    let target = '';

    const assignment = /^([a-zA-Z_][a-zA-Z_0-9]*)\s*=\s*(.+)$/.exec(text);

    if (assignment !== null && Object.prototype.hasOwnProperty.call(CONSTANTS, assignment[1]) === false) {
      assignTo = assignment[1];
      text = assignment[2];
    }

    const conversion = /\s+(?:in|to)\s+([a-zA-Z_][a-zA-Z_0-9]*)\s*$/.exec(text);

    if (conversion !== null) {
      target = conversion[1];
      text = text.substring(0, conversion.index);
    }

    if (text.trim() === '') {
      throw new Error('there is nothing to work out');
    }

    let prepared = expandPercentages(text);

    if (prepared.endsWith('*')) {
      prepared = `${prepared}${text.match(/^\s*([0-9.]+)/) ? text.match(/^\s*([0-9.]+)/)[1] : '1'}`;
    }

    const quantity = evaluate(toRpn(markUnary(insertProducts(tokenize(prepared, scope)))), angles);

    if (assignTo !== null) {
      scope[assignTo] = quantity;
    }

    return { quantity, text: present(quantity, target, precision), assigned: assignTo };
  };

  return { run, format, describeUnits, units: Object.keys(UNITS), constants: Object.keys(CONSTANTS) };
})();
