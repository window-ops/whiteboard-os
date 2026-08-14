'use strict';

(() => {
  const PALETTE = ['#4C6EF5', '#12B886', '#F59F00', '#E8590C', '#7048E8', '#0CA678', '#D6336C', '#1C7ED6'];
  const DEFAULT_LABELS = 'Yes\nNo';

  const sidesSelect = document.getElementById('SIDES');
  const countInput = document.getElementById('COUNT');
  const actionButton = document.getElementById('ACTION');
  const diceModeButton = document.getElementById('MODE-DICE');
  const spinModeButton = document.getElementById('MODE-SPIN');
  const facesBox = document.getElementById('FACES');
  const totalBox = document.getElementById('TOTAL');
  const labelsInput = document.getElementById('LABELS');
  const wheel = document.getElementById('WHEEL');
  const resultBox = document.getElementById('RESULT');

  let rotation = 0;
  let view = 'dice';

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  const randomInt = (max) => {
    const buffer = new Uint32Array(1);

    window.crypto.getRandomValues(buffer);

    return buffer[0] % max;
  };

  const labels = () =>
    labelsInput.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

  const saveState = () => {
    WOSState.write({
      view,
      d: sidesSelect.value,
      n: countInput.value,
      l: labels().join('|')
    });
  };

  const applyView = () => {
    document.body.dataset.view = view;
    diceModeButton.setAttribute('aria-pressed', String(view === 'dice'));
    spinModeButton.setAttribute('aria-pressed', String(view === 'spinner'));
    actionButton.textContent = view === 'dice' ? 'Roll' : 'Spin';
  };

  const roll = () => {
    const sides = Number.parseInt(sidesSelect.value, 10);
    const count = clamp(Number.parseInt(countInput.value, 10) || 1, 1, 8);
    const results = [];

    facesBox.textContent = '';

    for (let i = 0; i < count; i++) {
      const value = randomInt(sides) + 1;
      const face = document.createElement('div');

      face.className = 'dice-face';
      face.textContent = String(value);
      facesBox.append(face);
      results.push(value);
    }

    totalBox.textContent = count > 1 ? `Total ${results.reduce((sum, value) => sum + value, 0)}` : '';
  };

  const polar = (angle, radius) => {
    const radians = (angle - 90) * Math.PI / 180;

    return [100 + radius * Math.cos(radians), 100 + radius * Math.sin(radians)];
  };

  const drawWheel = () => {
    const entries = labels();

    wheel.textContent = '';

    if (entries.length === 0) {
      return;
    }

    const step = 360 / entries.length;
    const namespace = 'http://www.w3.org/2000/svg';

    entries.forEach((label, index) => {
      const start = index * step;
      const end = start + step;
      const [x1, y1] = polar(start, 96);
      const [x2, y2] = polar(end, 96);
      const path = document.createElementNS(namespace, 'path');
      const text = document.createElementNS(namespace, 'text');
      const [tx, ty] = polar(start + step / 2, 62);

      path.setAttribute('d', entries.length === 1
        ? 'M 4 100 A 96 96 0 1 1 196 100 A 96 96 0 1 1 4 100'
        : `M 100 100 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 96 96 0 ${step > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`);
      path.setAttribute('fill', PALETTE[index % PALETTE.length]);
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', '1');

      text.setAttribute('x', tx.toFixed(2));
      text.setAttribute('y', ty.toFixed(2));
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('font-size', '11');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('transform', `rotate(${(start + step / 2).toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)})`);
      text.textContent = label.length > 14 ? `${label.substring(0, 13)}…` : label;

      wheel.append(path, text);
    });
  };

  const spin = () => {
    const entries = labels();

    if (entries.length === 0) {
      resultBox.textContent = 'Add at least one label.';
      return;
    }

    const index = randomInt(entries.length);
    const step = 360 / entries.length;
    const centre = index * step + step / 2;
    const turns = 4 + randomInt(3);

    rotation += turns * 360 + ((360 - (rotation % 360)) - centre + 360) % 360;
    wheel.style.transform = `rotate(${rotation}deg)`;
    resultBox.textContent = '';

    window.setTimeout(() => {
      resultBox.textContent = entries[index];
    }, 2650);
  };

  actionButton.addEventListener('click', () => {
    if (view === 'dice') {
      roll();
      return;
    }

    spin();
  });

  [['dice', diceModeButton], ['spinner', spinModeButton]].forEach(([name, button]) => {
    button.addEventListener('click', () => {
      view = name;
      applyView();
      saveState();
    });
  });

  sidesSelect.addEventListener('change', saveState);
  countInput.addEventListener('change', saveState);

  labelsInput.addEventListener('change', () => {
    drawWheel();
    saveState();
  });

  labelsInput.addEventListener('input', drawWheel);

  const restore = () => {
    const values = WOSState.read();
    const sides = String(WOSState.integer(values, 'd', 6));

    if (Array.from(sidesSelect.options).some((option) => option.value === sides)) {
      sidesSelect.value = sides;
    }

    countInput.value = String(clamp(WOSState.integer(values, 'n', 2), 1, 8));
    labelsInput.value = typeof values.l === 'string' && values.l !== ''
      ? values.l.split('|').join('\n')
      : DEFAULT_LABELS;

    view = values.view === 'spinner' ? 'spinner' : 'dice';
    applyView();
    drawWheel();
  };

  restore();
})();
