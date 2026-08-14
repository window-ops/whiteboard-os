'use strict';

(() => {
  const LINE_GAP = 16;
  const TOP = 70;
  const LEFT = 120;
  const SPACING = 58;
  const MAX_NOTES = 12;
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  const staff = document.getElementById('STAFF');
  const trebleButton = document.getElementById('CLEF-TREBLE');
  const bassButton = document.getElementById('CLEF-BASS');
  const bpmInput = document.getElementById('BPM');
  const volumeInput = document.getElementById('VOLUME');
  const playButton = document.getElementById('PLAY');
  const undoButton = document.getElementById('UNDO');
  const clearButton = document.getElementById('CLEAR');
  const status = document.getElementById('STATUS');

  const namespace = 'http://www.w3.org/2000/svg';

  let clef = 'treble';
  let notes = [];
  let context = null;
  let playing = false;

  /*
   * A step is one staff position, a line or the space above it. Step 0 is the
   * bottom line of the staff: E4 in treble, G2 in bass.
   */
  const bottomNote = () => (clef === 'treble' ? { letter: 4, octave: 4 } : { letter: 4, octave: 2 });

  const noteAt = (step) => {
    const base = bottomNote();
    const total = base.letter + step;
    const letter = ((total % 7) + 7) % 7;
    const octave = base.octave + Math.floor(total / 7);

    return { letter: LETTERS[letter], octave };
  };

  const frequencyOf = (step) => {
    const note = noteAt(step);
    const semitone = SEMITONES[note.letter] + (note.octave - 4) * 12;

    return 440 * Math.pow(2, (semitone - 9) / 12);
  };

  const yFor = (step) => TOP + LINE_GAP * 4 - step * (LINE_GAP / 2);
  const stepFor = (y) => Math.round((TOP + LINE_GAP * 4 - y) / (LINE_GAP / 2));

  const element = (name, attributes) => {
    const node = document.createElementNS(namespace, name);

    Object.keys(attributes).forEach((key) => {
      node.setAttribute(key, String(attributes[key]));
    });

    return node;
  };

  const draw = () => {
    staff.textContent = '';

    for (let i = 0; i < 5; i++) {
      staff.append(element('line', {
        class: 'staff-line',
        x1: 20,
        x2: 880,
        y1: TOP + i * LINE_GAP,
        y2: TOP + i * LINE_GAP
      }));
    }

    const clefGlyph = element('text', { class: 'staff-clef', x: 34, y: clef === 'treble' ? TOP + 62 : TOP + 46 });

    clefGlyph.textContent = clef === 'treble' ? '\u{1D11E}' : '\u{1D122}';
    staff.append(clefGlyph);

    notes.forEach((step, index) => {
      const x = LEFT + index * SPACING;
      const y = yFor(step);

      /* Ledger lines for anything beyond the five staff lines. */
      for (let extra = 10; extra <= step; extra += 2) {
        staff.append(element('line', { class: 'staff-ledger', x1: x - 16, x2: x + 16, y1: yFor(extra), y2: yFor(extra) }));
      }

      for (let extra = -2; extra >= step; extra -= 2) {
        staff.append(element('line', { class: 'staff-ledger', x1: x - 16, x2: x + 16, y1: yFor(extra), y2: yFor(extra) }));
      }

      const head = element('ellipse', { class: 'staff-note', cx: x, cy: y, rx: 11, ry: 8, 'data-index': index });
      const note = noteAt(step);
      const label = element('text', { class: 'staff-label', x: x - 10, y: TOP + LINE_GAP * 4 + 46 });

      label.textContent = `${note.letter}${note.octave}`;
      staff.append(head, label);
    });
  };

  const save = () => {
    WOSState.write({
      clef,
      notes: notes.join('.'),
      bpm: bpmInput.value,
      vol: volumeInput.value
    });
  };

  const place = (event) => {
    if (notes.length >= MAX_NOTES) {
      status.textContent = `The staff holds ${MAX_NOTES} notes, so remove one first`;
      return;
    }

    const box = staff.getBoundingClientRect();
    const scale = 900 / box.width;
    const y = (event.clientY - box.top) * scale;
    const step = Math.min(18, Math.max(-8, stepFor(y)));

    notes.push(step);
    draw();
    save();

    const note = noteAt(step);

    status.textContent = `Placed ${note.letter}${note.octave}`;
  };

  const play = () => {
    const Context = window.AudioContext || window.webkitAudioContext;

    if (typeof Context !== 'function') {
      status.textContent = 'This browser has no Web Audio support';
      return;
    }

    if (notes.length === 0) {
      status.textContent = 'Place a note first';
      return;
    }

    if (context === null) {
      context = new Context();
    }

    context.resume();
    playing = true;
    playButton.disabled = true;

    const beat = 60 / Math.min(200, Math.max(30, Number.parseInt(bpmInput.value, 10) || 80));
    const level = Number.parseFloat(volumeInput.value);
    const start = context.currentTime + 0.08;

    notes.forEach((step, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + index * beat;

      oscillator.type = 'triangle';
      oscillator.frequency.value = frequencyOf(step);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(level * 0.3, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + beat * 0.9);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + beat);

      window.setTimeout(() => {
        Array.from(staff.querySelectorAll('.staff-note')).forEach((head, position) => {
          head.classList.toggle('is-sounding', position === index);
        });
      }, (at - context.currentTime) * 1000);
    });

    window.setTimeout(() => {
      Array.from(staff.querySelectorAll('.staff-note')).forEach((head) => {
        head.classList.remove('is-sounding');
      });

      playing = false;
      playButton.disabled = false;
    }, (notes.length * beat + 0.3) * 1000);
  };

  const applyClef = () => {
    trebleButton.setAttribute('aria-pressed', String(clef === 'treble'));
    bassButton.setAttribute('aria-pressed', String(clef === 'bass'));
    draw();
  };

  staff.addEventListener('click', place);

  [['treble', trebleButton], ['bass', bassButton]].forEach(([name, button]) => {
    button.addEventListener('click', () => {
      clef = name;
      applyClef();
      save();
    });
  });

  playButton.addEventListener('click', play);

  undoButton.addEventListener('click', () => {
    notes.pop();
    draw();
    save();
  });

  clearButton.addEventListener('click', () => {
    notes = [];
    draw();
    save();
    status.textContent = 'Click on the staff to place a note';
  });

  [bpmInput, volumeInput].forEach((control) => {
    control.addEventListener('change', save);
  });

  const restore = () => {
    const values = WOSState.read();

    clef = values.clef === 'bass' ? 'bass' : 'treble';

    if (typeof values.notes === 'string' && values.notes !== '') {
      notes = values.notes
        .split('.')
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value))
        .slice(0, MAX_NOTES);
    }

    bpmInput.value = String(WOSState.integer(values, 'bpm', 80));
    volumeInput.value = String(WOSState.number(values, 'vol', 0.4));

    applyClef();
  };

  restore();
})();
