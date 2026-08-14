'use strict';

(() => {
  const SEGMENTS = 24;

  const wheel = document.getElementById('WHEEL');
  const swatches = document.getElementById('SWATCHES');
  const schemeSelect = document.getElementById('SCHEME');
  const lightInput = document.getElementById('LIGHT');
  const satInput = document.getElementById('SAT');
  const rybButton = document.getElementById('MODEL-RYB');
  const rgbButton = document.getElementById('MODEL-RGB');
  const mixA = document.getElementById('MIX-A');
  const mixB = document.getElementById('MIX-B');
  const mixRatio = document.getElementById('MIX-RATIO');
  const mixResult = document.getElementById('MIX-RESULT');
  const mixNote = document.getElementById('MIX-NOTE');

  let model = 'ryb';
  let angle = 0;

  /*
   * The traditional artist's wheel puts red, yellow and blue at equal spacing.
   * Screens work in RGB, where the primaries are red, green and blue. Mapping
   * one onto the other keeps the wheel recognisable in either model.
   */
  const RYB_ANCHORS = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345];
  const RGB_FOR_RYB = [0, 12, 24, 36, 48, 60, 78, 96, 114, 132, 150, 168, 186, 204, 222, 240, 252, 264, 276, 288, 300, 318, 336, 354];

  const hueFor = (degrees) => {
    if (model === 'rgb') {
      return ((degrees % 360) + 360) % 360;
    }

    const normalised = ((degrees % 360) + 360) % 360;
    const step = 360 / RYB_ANCHORS.length;
    const index = Math.floor(normalised / step);
    const within = (normalised - index * step) / step;
    const low = RGB_FOR_RYB[index];
    const high = RGB_FOR_RYB[(index + 1) % RGB_FOR_RYB.length] || 360;

    return (low + (high - low + 360) % 360 * within) % 360;
  };

  const hslToRgb = (h, s, l) => {
    const a = s * Math.min(l, 1 - l);
    const channel = (n) => {
      const k = (n + h / 30) % 12;

      return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    };

    return [channel(0), channel(8), channel(4)].map((value) => Math.round(value * 255));
  };

  const toHex = (rgb) => `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;

  const fromHex = (text) => {
    const match = /^#?([0-9a-f]{6})$/i.exec(text.trim());

    if (match === null) {
      return null;
    }

    const value = Number.parseInt(match[1], 16);

    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };

  const colourAt = (degrees) => {
    const saturation = Number.parseInt(satInput.value, 10) / 100;
    const lightness = Number.parseInt(lightInput.value, 10) / 100;

    return toHex(hslToRgb(hueFor(degrees), saturation, lightness));
  };

  const scheme = () => {
    const offsets = {
      none: [0],
      complementary: [0, 180],
      analogous: [0, -30, 30],
      triadic: [0, 120, 240],
      tetradic: [0, 90, 180, 270],
      split: [0, 150, 210]
    };

    return (offsets[schemeSelect.value] || offsets.none).map((offset) => angle + offset);
  };

  const polar = (degrees, radius) => {
    const radians = (degrees - 90) * Math.PI / 180;

    return [110 + radius * Math.cos(radians), 110 + radius * Math.sin(radians)];
  };

  const drawWheel = () => {
    const namespace = 'http://www.w3.org/2000/svg';
    const step = 360 / SEGMENTS;
    const picked = scheme().map((value) => ((value % 360) + 360) % 360);

    wheel.textContent = '';

    for (let i = 0; i < SEGMENTS; i++) {
      const start = i * step;
      const end = start + step;
      const [x1, y1] = polar(start, 104);
      const [x2, y2] = polar(end, 104);
      const [x3, y3] = polar(end, 58);
      const [x4, y4] = polar(start, 58);
      const path = document.createElementNS(namespace, 'path');
      const centre = start + step / 2;

      path.setAttribute('d', `M ${x1.toFixed(2)} ${y1.toFixed(2)} A 104 104 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A 58 58 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`);
      path.setAttribute('fill', colourAt(centre));
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute('aria-label', `Hue at ${Math.round(centre)} degrees`);

      if (picked.some((value) => Math.abs(value - centre) < step / 2)) {
        path.setAttribute('class', 'is-picked');
      }

      path.addEventListener('click', () => {
        angle = centre;
        render();
        save();
      });

      path.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          angle = centre;
          render();
          save();
        }
      });

      wheel.append(path);
    }
  };

  const drawSwatches = () => {
    swatches.textContent = '';

    scheme().forEach((degrees) => {
      const hex = colourAt(degrees);
      const holder = document.createElement('div');
      const chip = document.createElement('div');
      const code = document.createElement('div');

      holder.className = 'colour-swatch';
      chip.className = 'colour-chip';
      chip.style.backgroundColor = hex;
      code.className = 'colour-code';
      code.textContent = `${hex}  ${Math.round(hueFor(degrees))}°`;

      holder.append(chip, code);
      swatches.append(holder);
    });
  };

  /*
   * Averaging inverted channels is arithmetically the same as averaging the
   * channels themselves, so it says nothing about pigment. Multiplying the
   * channels does: each layer absorbs part of the light the other reflects,
   * and the mix comes out darker than either parent, the way paint does.
   */
  const mix = () => {
    const first = fromHex(mixA.value);
    const second = fromHex(mixB.value);

    if (first === null || second === null) {
      mixNote.textContent = 'Both colours need six hexadecimal digits, for example #d62828.';
      return;
    }

    const share = Number.parseFloat(mixRatio.value);

    if (model === 'ryb') {
      const blended = first.map((value, index) => {
        const low = Math.max(1, value);
        const high = Math.max(1, second[index]);

        return Math.round(Math.min(255, Math.pow(low, 1 - share) * Math.pow(high, share)));
      });

      mixResult.style.backgroundColor = toHex(blended);
      mixNote.textContent = `Subtractive mix, the way pigments behave: ${toHex(blended)}. Both parents are lighter than this.`;
      return;
    }

    const blended = first.map((value, index) => Math.round(value * (1 - share) + second[index] * share));

    mixResult.style.backgroundColor = toHex(blended);
    mixNote.textContent = `Additive mix, the way light behaves: ${toHex(blended)}. This is the average of the two channels.`;
  };

  const applyModel = () => {
    rybButton.setAttribute('aria-pressed', String(model === 'ryb'));
    rgbButton.setAttribute('aria-pressed', String(model === 'rgb'));
  };

  const render = () => {
    drawWheel();
    drawSwatches();
    mix();
  };

  const save = () => {
    WOSState.write({
      model,
      a: Math.round(angle),
      scheme: schemeSelect.value,
      l: lightInput.value,
      s: satInput.value,
      m1: mixA.value,
      m2: mixB.value,
      r: mixRatio.value
    });
  };

  [['ryb', rybButton], ['rgb', rgbButton]].forEach(([name, button]) => {
    button.addEventListener('click', () => {
      model = name;
      applyModel();
      render();
      save();
    });
  });

  [schemeSelect, lightInput, satInput].forEach((control) => {
    control.addEventListener('input', render);
    control.addEventListener('change', save);
  });

  [mixA, mixB, mixRatio].forEach((control) => {
    control.addEventListener('input', mix);
    control.addEventListener('change', save);
  });

  const restore = () => {
    const values = WOSState.read();

    model = values.model === 'rgb' ? 'rgb' : 'ryb';
    angle = WOSState.number(values, 'a', 0);

    if (Array.from(schemeSelect.options).some((option) => option.value === values.scheme)) {
      schemeSelect.value = values.scheme;
    }

    lightInput.value = String(WOSState.integer(values, 'l', 50));
    satInput.value = String(WOSState.integer(values, 's', 80));

    if (typeof values.m1 === 'string' && values.m1 !== '') {
      mixA.value = values.m1;
    }

    if (typeof values.m2 === 'string' && values.m2 !== '') {
      mixB.value = values.m2;
    }

    mixRatio.value = String(WOSState.number(values, 'r', 0.5));

    applyModel();
    render();
  };

  restore();
})();
