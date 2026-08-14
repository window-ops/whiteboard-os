'use strict';

/*
 * Liang's hyphenation algorithm, the one TeX uses.
 *
 * A pattern such as "a3ic" says: between the letters of this fragment, insert
 * the odd or even numbers given. Odd numbers allow a break, even numbers
 * forbid one, and the highest number at each position wins. Pattern files call
 * register() when they load, so only the language in use is fetched.
 *
 * Hyphenation points approximate syllable boundaries. They are close enough to
 * count syllables and are not a syllabification in the phonological sense.
 */

const WOSHyphen = (() => {
  const languages = {};
  const pending = {};

  const buildTrie = (source) => {
    const trie = {};

    source.split(' ').forEach((entry) => {
      if (entry === '') {
        return;
      }

      const letters = [];
      const points = [];
      let expecting = true;

      for (let i = 0; i < entry.length; i++) {
        const character = entry[i];

        if (character >= '0' && character <= '9') {
          points.push(Number.parseInt(character, 10));
          expecting = false;
        } else {
          if (expecting) {
            points.push(0);
          }

          letters.push(character);
          expecting = true;
        }
      }

      if (expecting) {
        points.push(0);
      }

      let node = trie;

      letters.forEach((letter) => {
        if (Object.prototype.hasOwnProperty.call(node, letter) === false) {
          node[letter] = {};
        }

        node = node[letter];
      });

      node.$ = points;
    });

    return trie;
  };

  const register = (code, definition) => {
    languages[code] = {
      left: definition.left || 2,
      right: definition.right || 2,
      trie: buildTrie(definition.patterns),
      exceptions: {}
    };

    definition.exceptions.split(' ').forEach((word) => {
      if (word !== '') {
        languages[code].exceptions[word.split('-').join('')] = word.split('-');
      }
    });

    if (Object.prototype.hasOwnProperty.call(pending, code)) {
      pending[code].forEach((resolve) => {
        resolve(languages[code]);
      });
      delete pending[code];
    }
  };

  const load = (code, basePath) => new Promise((resolve, reject) => {
    if (Object.prototype.hasOwnProperty.call(languages, code)) {
      resolve(languages[code]);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(pending, code)) {
      pending[code].push(resolve);
      return;
    }

    pending[code] = [resolve];

    const script = document.createElement('script');

    script.src = `${basePath}${code}.js`;
    script.addEventListener('error', () => {
      delete pending[code];
      reject(new Error(`patterns for ${code} could not be loaded`));
    });

    document.head.append(script);
  });

  /*
   * The left and right minimums in a pattern file are typographic: they stop
   * a single letter being stranded on a line. Counting syllables wants some of
   * the breaks those rules suppress, so tight mode allows a break after the
   * first letter while still keeping two letters at the end, which stops a
   * lone consonant being counted as a syllable of its own.
   */
  const split = (code, word, tight) => {
    const language = languages[code];
    const lower = word.toLowerCase();
    const left = tight === true ? 1 : (language === undefined ? 2 : language.left);
    const right = tight === true ? 2 : (language === undefined ? 2 : language.right);

    if (language === undefined) {
      return [word];
    }

    if (Object.prototype.hasOwnProperty.call(language.exceptions, lower)) {
      return language.exceptions[lower];
    }

    if (lower.length < left + right) {
      return [word];
    }

    const padded = `.${lower}.`;
    const levels = new Array(padded.length + 1).fill(0);

    for (let i = 0; i < padded.length; i++) {
      let node = language.trie;

      for (let j = i; j < padded.length; j++) {
        node = node[padded[j]];

        if (node === undefined) {
          break;
        }

        if (node.$ !== undefined) {
          node.$.forEach((value, offset) => {
            const position = i + offset;

            if (value > levels[position]) {
              levels[position] = value;
            }
          });
        }
      }
    }

    const pieces = [];
    let current = '';

    for (let i = 0; i < word.length; i++) {
      current += word[i];

      const boundary = levels[i + 2] % 2 === 1;
      const farEnoughIn = i + 1 >= left;
      const farEnoughFromEnd = word.length - (i + 1) >= right;

      if (boundary && farEnoughIn && farEnoughFromEnd) {
        pieces.push(current);
        current = '';
      }
    }

    if (current !== '') {
      pieces.push(current);
    }

    return pieces;
  };

  const count = (code, word) => split(code, word, true).length;

  return { register, load, split, count, has: (code) => Object.prototype.hasOwnProperty.call(languages, code) };
})();
