'use strict';

(() => {
  const CATEGORY_COLOURS = {
    'alkali-metal': '#F6C6C6',
    'alkaline-earth-metal': '#F8DEC0',
    'transition-metal': '#F6E6B4',
    'post-transition-metal': '#D8E7C5',
    metalloid: '#C6E3E0',
    nonmetal: '#C6D9F0',
    halogen: '#D9CCEC',
    'noble-gas': '#EFC9E0',
    lanthanide: '#DCE3EE',
    actinide: '#E5DCEE',
    unknown: '#E4E4E4'
  };

  const OVERLAYS = {
    en: { label: 'Pauling electronegativity', unit: '' },
    r: { label: 'Covalent radius', unit: ' pm' },
    ie: { label: 'First ionisation energy', unit: ' eV' },
    mass: { label: 'Standard atomic weight', unit: '' }
  };

  const overlaySelect = document.getElementById('OVERLAY');
  const legend = document.getElementById('LEGEND');
  const legendLow = document.getElementById('LEGEND-LOW');
  const legendHigh = document.getElementById('LEGEND-HIGH');
  const grid = document.getElementById('GRID');
  const detail = document.getElementById('DETAIL');

  let selected = null;

  const range = (key) => {
    const values = WOS_ELEMENTS
      .map((entry) => entry[key])
      .filter((value) => typeof value === 'number');

    return { low: Math.min.apply(null, values), high: Math.max.apply(null, values) };
  };

  const heatColour = (fraction) => {
    const hue = 210 - 210 * fraction;
    const lightness = 86 - 26 * fraction;

    return `hsl(${hue.toFixed(0)}, 62%, ${lightness.toFixed(0)}%)`;
  };

  const round = (value) => {
    if (typeof value !== 'number') {
      return null;
    }

    return Number.parseFloat(value.toPrecision(6));
  };

  const paint = () => {
    const key = overlaySelect.value;

    if (key === 'cat') {
      legend.hidden = true;
    } else {
      const bounds = range(key);
      const overlay = OVERLAYS[key];

      legend.hidden = false;
      legendLow.textContent = `${round(bounds.low)}${overlay.unit}`;
      legendHigh.textContent = `${round(bounds.high)}${overlay.unit}`;
      legend.setAttribute('aria-label', `${overlay.label} from ${round(bounds.low)} to ${round(bounds.high)}`);
    }

    Array.from(grid.querySelectorAll('.pt-cell')).forEach((cell) => {
      const entry = WOS_ELEMENTS[Number.parseInt(cell.dataset.index, 10)];
      const readout = cell.querySelector('.pt-value');

      if (key === 'cat') {
        cell.style.backgroundColor = CATEGORY_COLOURS[entry.cat] || CATEGORY_COLOURS.unknown;
        cell.classList.remove('is-unknown');
        readout.textContent = entry.mass === null ? '' : String(round(entry.mass));
        return;
      }

      const value = entry[key];

      if (typeof value !== 'number') {
        cell.style.backgroundColor = '';
        cell.classList.add('is-unknown');
        readout.textContent = '';
        return;
      }

      const bounds = range(key);
      const span = bounds.high - bounds.low;

      cell.classList.remove('is-unknown');
      cell.style.backgroundColor = heatColour(span === 0 ? 0 : (value - bounds.low) / span);
      readout.textContent = String(round(value));
    });
  };

  const describe = (entry) => {
    detail.textContent = '';
    detail.hidden = false;

    const heading = document.createElement('h2');
    const subtitle = document.createElement('p');
    const table = document.createElement('table');
    const body = document.createElement('tbody');

    heading.textContent = `${entry.name} (${entry.sym})`;
    subtitle.className = 'tool-note';
    subtitle.textContent = `Element ${entry.z}, period ${entry.period}, ${entry.block} block, ${entry.cat.split('-').join(' ')}`;
    table.className = 'pt-detail-table';

    const rows = [
      ['Standard atomic weight', entry.mass === null ? 'no value' : String(round(entry.mass)), ''],
      ['Group', entry.group === null ? 'outside the numbered groups' : String(entry.group), ''],
      ['Electron configuration', entry.cfg || 'no value', ''],
      ['Pauling electronegativity', entry.en === null ? 'no value' : String(entry.en), ''],
      ['Covalent radius', entry.r === null ? 'no value' : String(entry.r), entry.r === null ? '' : 'pm'],
      ['First ionisation energy', entry.ie === null ? 'no value' : String(entry.ie), entry.ie === null ? '' : 'eV']
    ];

    rows.forEach(([term, value, unit]) => {
      const row = document.createElement('tr');
      const label = document.createElement('th');
      const figure = document.createElement('td');
      const units = document.createElement('td');

      label.scope = 'row';
      label.textContent = term;
      figure.textContent = value;
      units.textContent = unit;

      row.append(label, figure, units);
      body.append(row);
    });

    table.append(body);
    detail.append(heading, subtitle, table);
  };

  const select = (cell, entry) => {
    if (selected !== null) {
      selected.classList.remove('is-selected');
      selected.setAttribute('aria-selected', 'false');
    }

    selected = cell;
    cell.classList.add('is-selected');
    cell.setAttribute('aria-selected', 'true');
    describe(entry);

    WOSState.write({ o: overlaySelect.value, z: entry.z });
  };

  const build = () => {
    WOS_ELEMENTS.forEach((entry, index) => {
      const cell = document.createElement('button');
      const number = document.createElement('span');
      const symbol = document.createElement('span');
      const value = document.createElement('span');

      cell.type = 'button';
      cell.className = 'pt-cell';
      cell.dataset.index = String(index);
      cell.style.gridColumn = String(entry.col);
      cell.style.gridRow = String(entry.row);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-selected', 'false');
      cell.setAttribute('aria-label', `${entry.name}, element ${entry.z}`);

      number.className = 'pt-z';
      number.textContent = String(entry.z);
      symbol.className = 'pt-sym';
      symbol.textContent = entry.sym;
      value.className = 'pt-value';

      cell.append(number, symbol, value);
      cell.addEventListener('click', () => {
        select(cell, entry);
      });

      grid.append(cell);
    });

    /* Row 8 is the gap that separates the main body from the f block. */
  };

  overlaySelect.addEventListener('change', () => {
    paint();

    const entry = selected === null ? null : WOS_ELEMENTS[Number.parseInt(selected.dataset.index, 10)];

    WOSState.write({ o: overlaySelect.value, z: entry === null ? '' : entry.z });
  });

  const restore = () => {
    const values = WOSState.read();

    if (Object.prototype.hasOwnProperty.call(OVERLAYS, values.o) || values.o === 'cat') {
      overlaySelect.value = values.o;
    }

    paint();

    const wanted = WOSState.integer(values, 'z', 0);

    if (wanted > 0) {
      const index = WOS_ELEMENTS.findIndex((entry) => entry.z === wanted);

      if (index >= 0) {
        select(grid.querySelectorAll('.pt-cell')[index], WOS_ELEMENTS[index]);
      }
    }
  };

  build();
  restore();
})();
