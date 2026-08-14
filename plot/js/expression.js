'use strict';

/*
 * A small shunting-yard parser for expressions in x with the parameters
 * a, b, c and d. It compiles once to reverse Polish notation and evaluates
 * that, which keeps the redraw loop cheap and avoids eval.
 *
 * Supported: + - * / % ^, parentheses, unary minus, the constants pi and e,
 * and the functions listed in FUNCTIONS.
 */

const WOSExpression = (() => {
  const FUNCTIONS = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log10,
    log2: Math.log2,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sign: Math.sign
  };

  const CONSTANTS = { pi: Math.PI, e: Math.E };

  const OPERATORS = {
    '+': { precedence: 1, right: false, apply: (a, b) => a + b },
    '-': { precedence: 1, right: false, apply: (a, b) => a - b },
    '*': { precedence: 2, right: false, apply: (a, b) => a * b },
    '/': { precedence: 2, right: false, apply: (a, b) => a / b },
    '%': { precedence: 2, right: false, apply: (a, b) => a % b },
    '^': { precedence: 4, right: true, apply: (a, b) => Math.pow(a, b) }
  };

  const UNARY = { precedence: 3, right: true };

  const VARIABLES = ['x', 'a', 'b', 'c', 'd'];

  const tokenize = (source) => {
    const tokens = [];
    let index = 0;

    while (index < source.length) {
      const character = source[index];

      if (character === ' ') {
        index += 1;
        continue;
      }

      if (/[0-9.]/.test(character)) {
        let number = '';

        while (index < source.length && /[0-9.]/.test(source[index])) {
          number += source[index];
          index += 1;
        }

        if (Number.isFinite(Number.parseFloat(number)) === false) {
          throw new Error(`bad number "${number}"`);
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

        if (Object.prototype.hasOwnProperty.call(FUNCTIONS, word)) {
          tokens.push({ type: 'function', value: word });
        } else if (Object.prototype.hasOwnProperty.call(CONSTANTS, word)) {
          tokens.push({ type: 'number', value: CONSTANTS[word] });
        } else if (VARIABLES.indexOf(word) >= 0) {
          tokens.push({ type: 'variable', value: word });
        } else {
          throw new Error(`unknown name "${word}"`);
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

      throw new Error(`unexpected character "${character}"`);
    }

    return tokens;
  };

  /* Implicit multiplication: 2x, 3(x+1), x(x+1), )( and similar. */
  const insertProducts = (tokens) => {
    const output = [];

    tokens.forEach((token, position) => {
      if (position > 0) {
        const previous = tokens[position - 1];
        const closes = previous.type === 'number' || previous.type === 'variable' || previous.type === ')';
        const opens = token.type === 'number' || token.type === 'variable' || token.type === 'function' || token.type === '(';

        if (closes && opens) {
          output.push({ type: 'operator', value: '*' });
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
    const isUnary = previous === null
      || previous.type === 'operator'
      || previous.type === '(';

    return isUnary ? { type: 'unary' } : token;
  });

  const toRpn = (tokens) => {
    const output = [];
    const stack = [];

    tokens.forEach((token) => {
      if (token.type === 'number' || token.type === 'variable') {
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

          /* Unary minus binds looser than a power, so -x^2 is -(x^2). */
          const other = top.type === 'unary' ? UNARY : (top.type === 'operator' ? OPERATORS[top.value] : null);

          if (other !== null) {
            const takes = current.right
              ? other.precedence > current.precedence
              : other.precedence >= current.precedence;

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
          throw new Error('unbalanced parentheses');
        }
      }
    });

    while (stack.length > 0) {
      const top = stack.pop();

      if (top.type === '(') {
        throw new Error('unbalanced parentheses');
      }

      output.push(top);
    }

    return output;
  };

  /* Reject anything that would leave the value stack unbalanced, so "2+"
     fails at compile time rather than quietly evaluating to NaN. */
  const checkArity = (rpn) => {
    let depth = 0;

    rpn.forEach((token) => {
      if (token.type === 'number' || token.type === 'variable') {
        depth += 1;
      } else if (token.type === 'operator') {
        depth -= 1;
      }

      if (depth < 1) {
        throw new Error('incomplete expression');
      }
    });

    if (depth !== 1) {
      throw new Error('incomplete expression');
    }
  };

  const compile = (source) => {
    const rpn = toRpn(markUnary(insertProducts(tokenize(source))));
    const stack = [];

    checkArity(rpn);

    return (scope) => {
      stack.length = 0;

      for (let i = 0; i < rpn.length; i++) {
        const token = rpn[i];

        if (token.type === 'number') {
          stack.push(token.value);
        } else if (token.type === 'variable') {
          stack.push(scope[token.value]);
        } else if (token.type === 'unary') {
          stack.push(-stack.pop());
        } else if (token.type === 'function') {
          stack.push(FUNCTIONS[token.value](stack.pop()));
        } else {
          const right = stack.pop();
          const left = stack.pop();

          stack.push(OPERATORS[token.value].apply(left, right));
        }
      }

      return stack.length === 1 ? stack[0] : Number.NaN;
    };
  };

  return { compile, functionNames: Object.keys(FUNCTIONS) };
})();
