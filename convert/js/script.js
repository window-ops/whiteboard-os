'use strict';

(() => {
  const familySelect = document.getElementById('FAMILY');
  const valueInput = document.getElementById('VALUE');
  const fromSelect = document.getElementById('FROM');
  const toSelect = document.getElementById('TO');
  const swapButton = document.getElementById('SWAP');
  const result = document.getElementById('RESULT');
  const working = document.getElementById('WORKING');
  const tableBody = document.getElementById('TABLE-BODY');

  const familyById = (id) => WOS_UNITS.filter((family) => family.id === id)[0] || WOS_UNITS[0];

  const unitById = (family, id) => family.units.filter((unit) => unit.id === id)[0] || family.units[0];

  const toBase = (family, unit, value) =>
    family.offset === true ? unit.toBase(value) : value * unit.factor;

  const fromBase = (family, unit, value) =>
    family.offset === true ? unit.fromBase(value) : value / unit.factor;

  const present = (value) => {
    if (Number.isFinite(value) === false) {
      return '';
    }

    const magnitude = Math.abs(value);

    if (magnitude !== 0 && (magnitude < 0.0001 || magnitude >= 1000000000)) {
      return value.toExponential(6).replace(/e([+-])(\d)$/, 'e$10$2');
    }

    return String(Number.parseFloat(value.toPrecision(10)));
  };

  const fillOptions = (select, units, selected) => {
    select.textContent = '';

    units.forEach((unit) => {
      const option = document.createElement('option');

      option.value = unit.id;
      option.textContent = unit.name;
      select.append(option);
    });

    if (units.some((unit) => unit.id === selected)) {
      select.value = selected;
    }
  };

  const save = () => {
    WOSState.write({
      q: familySelect.value,
      v: valueInput.value,
      from: fromSelect.value,
      to: toSelect.value
    });
  };

  const convert = () => {
    const family = familyById(familySelect.value);
    const source = unitById(family, fromSelect.value);
    const target = unitById(family, toSelect.value);
    const raw = Number.parseFloat(valueInput.value.replace(',', '.'));

    tableBody.textContent = '';

    if (Number.isFinite(raw) === false) {
      result.textContent = '';
      working.textContent = 'Enter a number.';
      return;
    }

    const base = toBase(family, source, raw);
    const converted = fromBase(family, target, base);

    result.textContent = `${present(raw)} ${source.name.replace(/ \(.*\)$/, '')} = ${present(converted)} ${target.name.replace(/ \(.*\)$/, '')}`;

    if (family.offset === true) {
      working.textContent = 'Celsius and kelvin differ by an offset of 273.15, so a ratio between them means nothing.';
    } else {
      const ratio = source.factor / target.factor;
      working.textContent = `One ${source.name.replace(/ \(.*\)$/, '')} is ${present(ratio)} of a ${target.name.replace(/ \(.*\)$/, '')}.`;
    }

    family.units.forEach((unit) => {
      const row = document.createElement('tr');
      const label = document.createElement('th');
      const cell = document.createElement('td');

      label.scope = 'row';
      label.textContent = unit.name;
      cell.textContent = present(fromBase(family, unit, base));

      row.append(label, cell);
      tableBody.append(row);
    });
  };

  const applyFamily = (fromId, toId) => {
    const family = familyById(familySelect.value);

    fillOptions(fromSelect, family.units, fromId || family.units[0].id);
    fillOptions(toSelect, family.units, toId || family.units[Math.min(1, family.units.length - 1)].id);
    convert();
  };

  WOS_UNITS.forEach((family) => {
    const option = document.createElement('option');

    option.value = family.id;
    option.textContent = family.name;
    familySelect.append(option);
  });

  familySelect.addEventListener('change', () => {
    applyFamily(null, null);
    save();
  });

  [fromSelect, toSelect].forEach((select) => {
    select.addEventListener('change', () => {
      convert();
      save();
    });
  });

  valueInput.addEventListener('input', convert);
  valueInput.addEventListener('change', save);

  swapButton.addEventListener('click', () => {
    const held = fromSelect.value;

    fromSelect.value = toSelect.value;
    toSelect.value = held;
    convert();
    save();
  });

  const restore = () => {
    const values = WOSState.read();

    if (WOS_UNITS.some((family) => family.id === values.q)) {
      familySelect.value = values.q;
    }

    if (typeof values.v === 'string' && values.v !== '') {
      valueInput.value = values.v;
    }

    applyFamily(values.from, values.to);
  };

  restore();
})();
