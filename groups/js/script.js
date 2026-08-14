'use strict';

(() => {
  const MAX_ATTEMPTS = 40;

  const namesInput = document.getElementById('NAMES');
  const splitSelect = document.getElementById('SPLIT');
  const amountInput = document.getElementById('AMOUNT');
  const amountLabel = document.getElementById('AMOUNT-LABEL');
  const shuffleButton = document.getElementById('SHUFFLE');
  const keepCheckbox = document.getElementById('KEEP');
  const board = document.getElementById('BOARD');
  const status = document.getElementById('STATUS');

  let lastSignature = '';

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  const names = () =>
    namesInput.value
      .split(/[\n,;]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '');

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

  const divide = (list) => {
    const amount = clamp(Number.parseInt(amountInput.value, 10) || 2, 1, 40);
    const count = splitSelect.value === 'groups'
      ? clamp(amount, 1, list.length)
      : Math.max(1, Math.ceil(list.length / amount));
    const groups = [];

    for (let i = 0; i < count; i++) {
      groups.push([]);
    }

    list.forEach((name, index) => {
      groups[index % count].push(name);
    });

    return groups;
  };

  const signatureOf = (groups) =>
    groups.map((group) => group.slice().sort().join(',')).sort().join('|');

  const render = (groups) => {
    board.textContent = '';

    groups.forEach((group, index) => {
      const card = document.createElement('div');
      const heading = document.createElement('h2');
      const list = document.createElement('ul');

      card.className = 'group-card';
      heading.textContent = `Group ${index + 1}`;

      group.forEach((name) => {
        const item = document.createElement('li');

        item.textContent = name;
        list.append(item);
      });

      card.append(heading, list);
      board.append(card);
    });
  };

  const saveState = () => {
    WOSState.write({
      by: splitSelect.value,
      n: amountInput.value,
      keep: keepCheckbox.checked ? '1' : '',
      list: keepCheckbox.checked ? names().join('|') : ''
    });
  };

  const shuffle = () => {
    const list = names();

    if (list.length < 2) {
      status.textContent = 'At least two names are needed';
      board.textContent = '';
      return;
    }

    let groups = divide(shuffled(list));
    let attempts = 0;

    while (signatureOf(groups) === lastSignature && attempts < MAX_ATTEMPTS) {
      groups = divide(shuffled(list));
      attempts += 1;
    }

    const repeated = signatureOf(groups) === lastSignature;

    lastSignature = signatureOf(groups);
    render(groups);

    status.textContent = repeated
      ? `${list.length} names in ${groups.length} groups, with too few arrangements to avoid a repeat`
      : `${list.length} names in ${groups.length} groups`;

    saveState();
  };

  const applySplitLabel = () => {
    amountLabel.textContent = splitSelect.value === 'groups' ? 'Groups' : 'Per group';
  };

  shuffleButton.addEventListener('click', shuffle);

  splitSelect.addEventListener('change', () => {
    applySplitLabel();
    saveState();
  });

  amountInput.addEventListener('change', saveState);
  keepCheckbox.addEventListener('change', saveState);
  namesInput.addEventListener('change', saveState);

  const restore = () => {
    const values = WOSState.read();

    if (values.by === 'size' || values.by === 'groups') {
      splitSelect.value = values.by;
    }

    amountInput.value = String(clamp(WOSState.integer(values, 'n', 4), 1, 40));
    keepCheckbox.checked = values.keep === '1';

    if (keepCheckbox.checked && typeof values.list === 'string' && values.list !== '') {
      namesInput.value = values.list.split('|').join('\n');
    }

    applySplitLabel();
  };

  restore();
})();
