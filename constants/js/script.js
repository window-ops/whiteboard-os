'use strict';

(() => {
  const search = document.getElementById('SEARCH');
  const groupSelect = document.getElementById('GROUP');
  const tableBody = document.getElementById('TABLE-BODY');

  const groups = [];

  WOS_CONSTANTS.forEach((entry) => {
    if (groups.indexOf(entry.group) < 0) {
      groups.push(entry.group);
    }
  });

  const render = () => {
    const needle = search.value.trim().toLowerCase();
    const wanted = groupSelect.value;

    tableBody.textContent = '';

    groups.forEach((group) => {
      if (wanted !== 'all' && wanted !== group) {
        return;
      }

      const matches = WOS_CONSTANTS.filter((entry) =>
        entry.group === group
        && (needle === ''
          || entry.name.toLowerCase().indexOf(needle) >= 0
          || entry.symbol.toLowerCase().indexOf(needle) >= 0
          || entry.unit.toLowerCase().indexOf(needle) >= 0));

      if (matches.length === 0) {
        return;
      }

      const header = document.createElement('tr');
      const headerCell = document.createElement('th');

      header.className = 'constants-group';
      headerCell.colSpan = 5;
      headerCell.scope = 'colgroup';
      headerCell.textContent = group;
      header.append(headerCell);
      tableBody.append(header);

      matches.forEach((entry) => {
        const row = document.createElement('tr');
        const cells = [entry.name, entry.symbol, entry.value, entry.unit, entry.exact ? 'exact' : entry.uncertainty];

        cells.forEach((text, position) => {
          const cell = document.createElement(position === 0 ? 'th' : 'td');

          if (position === 0) {
            cell.scope = 'row';
          }

          if (position === 4 && entry.exact) {
            cell.className = 'is-exact';
          }

          cell.textContent = text || '';
          row.append(cell);
        });

        tableBody.append(row);
      });
    });

    if (tableBody.children.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');

      cell.colSpan = 5;
      cell.className = 'tool-note';
      cell.textContent = 'Nothing matches that search';
      row.append(cell);
      tableBody.append(row);
    }
  };

  const save = () => {
    WOSState.write({ q: search.value, g: groupSelect.value });
  };

  const allOption = document.createElement('option');

  allOption.value = 'all';
  allOption.textContent = 'Every group';
  groupSelect.append(allOption);

  groups.forEach((group) => {
    const option = document.createElement('option');

    option.value = group;
    option.textContent = group;
    groupSelect.append(option);
  });

  search.addEventListener('input', render);
  search.addEventListener('change', save);

  groupSelect.addEventListener('change', () => {
    render();
    save();
  });

  const restore = () => {
    const values = WOSState.read();

    if (typeof values.q === 'string') {
      search.value = values.q;
    }

    if (groups.indexOf(values.g) >= 0 || values.g === 'all') {
      groupSelect.value = values.g;
    }

    render();
  };

  restore();
})();
