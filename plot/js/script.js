'use strict';

(() => {
  const COLOURS = ['#1C6FD6', '#D64545', '#14866D'];
  const PARAMETERS = ['a', 'b', 'c', 'd'];
  const DEFAULT_VIEW = { xmin: -10, xmax: 10, ymin: -6, ymax: 6 };
  const TABLE_ROWS = 21;

  const inputs = [document.getElementById('F1'), document.getElementById('F2'), document.getElementById('F3')];
  const canvas = document.getElementById('CANVAS');
  const status = document.getElementById('STATUS');
  const slidersBox = document.getElementById('SLIDERS');
  const resetButton = document.getElementById('RESET-VIEW');
  const stage = document.getElementById('STAGE');
  const graphButton = document.getElementById('VIEW-GRAPH');
  const tableButton = document.getElementById('VIEW-TABLE');
  const table = document.getElementById('TABLE');
  const tableHead = document.getElementById('TABLE-HEAD');
  const tableBody = document.getElementById('TABLE-BODY');

  const context = canvas.getContext('2d');
  const view = Object.assign({}, DEFAULT_VIEW);
  const scope = { x: 0, a: 1, b: 1, c: 0, d: 0 };
  const sliders = {};

  let compiled = [null, null, null];
  let dragging = null;
  let stageView = 'graph';

  const toPixelX = (x, width) => (x - view.xmin) / (view.xmax - view.xmin) * width;
  const toPixelY = (y, height) => height - (y - view.ymin) / (view.ymax - view.ymin) * height;
  const toValueX = (px, width) => view.xmin + px / width * (view.xmax - view.xmin);
  const toValueY = (py, height) => view.ymin + (height - py) / height * (view.ymax - view.ymin);

  const niceStep = (span) => {
    const rough = span / 10;
    const power = Math.pow(10, Math.floor(Math.log10(rough)));
    const scaled = rough / power;
    const step = scaled >= 5 ? 5 : (scaled >= 2 ? 2 : 1);

    return step * power;
  };

  const tidy = (value) => Number.parseFloat(value.toPrecision(6));

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawAxes = (width, height) => {
    const stepX = niceStep(view.xmax - view.xmin);
    const stepY = niceStep(view.ymax - view.ymin);

    context.lineWidth = 1;
    context.font = '11px Arial, sans-serif';
    context.fillStyle = '#666666';
    context.strokeStyle = '#e2e2e2';
    context.beginPath();

    for (let x = Math.ceil(view.xmin / stepX) * stepX; x <= view.xmax; x += stepX) {
      const px = Math.round(toPixelX(x, width)) + 0.5;

      context.moveTo(px, 0);
      context.lineTo(px, height);
    }

    for (let y = Math.ceil(view.ymin / stepY) * stepY; y <= view.ymax; y += stepY) {
      const py = Math.round(toPixelY(y, height)) + 0.5;

      context.moveTo(0, py);
      context.lineTo(width, py);
    }

    context.stroke();

    const originX = Math.round(toPixelX(0, width)) + 0.5;
    const originY = Math.round(toPixelY(0, height)) + 0.5;

    context.strokeStyle = '#8c8c8c';
    context.beginPath();
    context.moveTo(originX, 0);
    context.lineTo(originX, height);
    context.moveTo(0, originY);
    context.lineTo(width, originY);
    context.stroke();

    for (let x = Math.ceil(view.xmin / stepX) * stepX; x <= view.xmax; x += stepX) {
      if (Math.abs(x) > stepX / 100) {
        context.fillText(String(tidy(x)), toPixelX(x, width) + 3, Math.min(height - 3, Math.max(11, originY + 12)));
      }
    }

    for (let y = Math.ceil(view.ymin / stepY) * stepY; y <= view.ymax; y += stepY) {
      if (Math.abs(y) > stepY / 100) {
        context.fillText(String(tidy(y)), Math.min(width - 30, Math.max(3, originX + 4)), toPixelY(y, height) - 3);
      }
    }
  };

  const drawCurve = (evaluate, colour, width, height) => {
    const limit = (view.ymax - view.ymin) * 4;
    let previous = null;

    context.strokeStyle = colour;
    context.lineWidth = 2;
    context.beginPath();

    for (let px = 0; px <= width; px += 1) {
      scope.x = toValueX(px, width);

      let y;

      try {
        y = evaluate(scope);
      } catch (error) {
        y = Number.NaN;
      }

      if (Number.isFinite(y) === false) {
        previous = null;
        continue;
      }

      const py = toPixelY(y, height);

      /* A jump larger than the whole window is a pole, not a line. */
      if (previous !== null && Math.abs(y - previous) > limit) {
        context.moveTo(px, py);
      } else if (previous === null) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }

      previous = y;
    }

    context.stroke();
  };

  const compileAll = () => {
    const problems = [];

    compiled = inputs.map((input, index) => {
      const source = input.value.trim();

      input.parentElement.classList.remove('input-danger');

      if (source === '') {
        return null;
      }

      try {
        return WOSExpression.compile(source);
      } catch (error) {
        problems.push(`${'fgh'[index]}(x): ${error.message}`);
        return null;
      }
    });

    status.textContent = problems.length === 0
      ? `x from ${tidy(view.xmin)} to ${tidy(view.xmax)}, y from ${tidy(view.ymin)} to ${tidy(view.ymax)}. Drag to pan, scroll to zoom.`
      : problems.join('. ');
  };

  const draw = () => {
    if (stageView === 'table') {
      fillTable();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    context.clearRect(0, 0, width, height);
    drawAxes(width, height);

    compiled.forEach((evaluate, index) => {
      if (evaluate !== null) {
        drawCurve(evaluate, COLOURS[index], width, height);
      }
    });
  };

  const applyStageView = () => {
    stage.dataset.view = stageView;
    graphButton.setAttribute('aria-pressed', String(stageView === 'graph'));
    tableButton.setAttribute('aria-pressed', String(stageView === 'table'));

    if (stageView === 'graph') {
      resize();
    }

    draw();
  };

  const fillTable = () => {
    const active = compiled
      .map((evaluate, index) => ({ evaluate, index }))
      .filter((entry) => entry.evaluate !== null);

    tableHead.textContent = '';
    tableBody.textContent = '';

    const headRow = document.createElement('tr');
    const xHead = document.createElement('th');

    xHead.scope = 'col';
    xHead.textContent = 'x';
    headRow.append(xHead);

    active.forEach((entry) => {
      const cell = document.createElement('th');

      cell.scope = 'col';
      cell.textContent = `${'fgh'[entry.index]}(x)`;
      headRow.append(cell);
    });

    tableHead.append(headRow);

    const step = (view.xmax - view.xmin) / (TABLE_ROWS - 1);

    for (let i = 0; i < TABLE_ROWS; i++) {
      const x = view.xmin + i * step;
      const row = document.createElement('tr');
      const xCell = document.createElement('th');

      xCell.scope = 'row';
      xCell.textContent = String(tidy(x));
      row.append(xCell);

      active.forEach((entry) => {
        const cell = document.createElement('td');

        scope.x = x;

        let value;

        try {
          value = entry.evaluate(scope);
        } catch (error) {
          value = Number.NaN;
        }

        cell.textContent = Number.isFinite(value) ? String(tidy(value)) : 'undefined';
        row.append(cell);
      });

      tableBody.append(row);
    }
  };

  const save = () => {
    WOSState.write({
      f1: inputs[0].value.trim(),
      f2: inputs[1].value.trim(),
      f3: inputs[2].value.trim(),
      a: scope.a,
      b: scope.b,
      c: scope.c,
      d: scope.d,
      v: [view.xmin, view.xmax, view.ymin, view.ymax].map((value) => tidy(value)).join(','),
      show: stageView === 'table' ? 'table' : ''
    });
  };

  const buildSliders = () => {
    PARAMETERS.forEach((name) => {
      const wrap = document.createElement('label');
      const caption = document.createElement('span');
      const input = document.createElement('input');
      const readout = document.createElement('output');

      wrap.className = 'plot-slider';
      caption.textContent = name;
      input.type = 'range';
      input.min = '-10';
      input.max = '10';
      input.step = '0.1';
      input.value = String(scope[name]);
      input.setAttribute('aria-label', `Parameter ${name}`);
      readout.textContent = String(scope[name]);

      input.addEventListener('input', () => {
        scope[name] = Number.parseFloat(input.value);
        readout.textContent = input.value;
        draw();
      });

      input.addEventListener('change', save);

      wrap.append(caption, input, readout);
      slidersBox.append(wrap);
      sliders[name] = { input, readout };
    });
  };

  const zoom = (factor, centreX, centreY) => {
    view.xmin = centreX + (view.xmin - centreX) * factor;
    view.xmax = centreX + (view.xmax - centreX) * factor;
    view.ymin = centreY + (view.ymin - centreY) * factor;
    view.ymax = centreY + (view.ymax - centreY) * factor;
  };

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();

    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-panning');
    dragging = { x: toValueX(event.clientX - rect.left, rect.width), y: toValueY(event.clientY - rect.top, rect.height) };
  });

  canvas.addEventListener('pointermove', (event) => {
    if (dragging === null) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = toValueX(event.clientX - rect.left, rect.width);
    const y = toValueY(event.clientY - rect.top, rect.height);
    const dx = dragging.x - x;
    const dy = dragging.y - y;

    view.xmin += dx;
    view.xmax += dx;
    view.ymin += dy;
    view.ymax += dy;
    draw();
  });

  const endDrag = (event) => {
    if (dragging === null) {
      return;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    dragging = null;
    canvas.classList.remove('is-panning');
    compileAll();
    draw();
    save();
  };

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const factor = event.deltaY > 0 ? 1.12 : 1 / 1.12;

    zoom(factor, toValueX(event.clientX - rect.left, rect.width), toValueY(event.clientY - rect.top, rect.height));
    compileAll();
    draw();
    save();
  }, { passive: false });

  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      compileAll();
      draw();
    });

    input.addEventListener('change', save);
  });

  resetButton.addEventListener('click', () => {
    Object.assign(view, DEFAULT_VIEW);
    compileAll();
    draw();
    save();
  });

  [['graph', graphButton], ['table', tableButton]].forEach(([name, button]) => {
    button.addEventListener('click', () => {
      stageView = name;
      applyStageView();
      save();
    });
  });

  window.addEventListener('resize', () => {
    if (stageView === 'graph') {
      resize();
      draw();
    }
  });

  const restore = () => {
    const values = WOSState.read();

    ['f1', 'f2', 'f3'].forEach((key, index) => {
      if (typeof values[key] === 'string' && values[key] !== '') {
        inputs[index].value = values[key];
      }
    });

    PARAMETERS.forEach((name) => {
      scope[name] = WOSState.number(values, name, scope[name]);
    });

    stageView = values.show === 'table' ? 'table' : 'graph';

    if (typeof values.v === 'string') {
      const parts = values.v.split(',').map((part) => Number.parseFloat(part));

      if (parts.length === 4 && parts.every((part) => Number.isFinite(part)) && parts[0] < parts[1] && parts[2] < parts[3]) {
        view.xmin = parts[0];
        view.xmax = parts[1];
        view.ymin = parts[2];
        view.ymax = parts[3];
      }
    }
  };

  restore();
  buildSliders();
  resize();
  compileAll();
  applyStageView();
})();
