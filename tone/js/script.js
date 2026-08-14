'use strict';

(() => {
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  const referenceInput = document.getElementById('REFERENCE');
  const waveSelect = document.getElementById('WAVE');
  const octaveInput = document.getElementById('OCTAVE');
  const volumeInput = document.getElementById('VOLUME');
  const stopButton = document.getElementById('STOP');
  const keysBox = document.getElementById('KEYS');
  const readout = document.getElementById('READOUT');
  const status = document.getElementById('STATUS');

  let context = null;
  let oscillator = null;
  let gain = null;
  let sounding = null;

  const reference = () => {
    const value = Number.parseFloat(referenceInput.value);

    return Number.isFinite(value) ? Math.min(500, Math.max(380, value)) : 440;
  };

  const octave = () => Math.min(7, Math.max(1, Number.parseInt(octaveInput.value, 10) || 4));

  /* Equal temperament: every semitone is the twelfth root of two apart. */
  const frequency = (semitone) => reference() * Math.pow(2, (semitone - 9 + (octave() - 4) * 12) / 12);

  const stop = () => {
    if (oscillator !== null) {
      const now = context.currentTime;

      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      oscillator.stop(now + 0.1);
      oscillator = null;
      gain = null;
    }

    if (sounding !== null) {
      sounding.classList.remove('is-sounding');
      sounding = null;
    }
  };

  const play = (semitone, key) => {
    const Context = window.AudioContext || window.webkitAudioContext;

    if (typeof Context !== 'function') {
      status.textContent = 'This browser has no Web Audio support';
      return;
    }

    if (context === null) {
      context = new Context();
    }

    context.resume();
    stop();

    const hertz = frequency(semitone);

    oscillator = context.createOscillator();
    gain = context.createGain();

    oscillator.type = waveSelect.value;
    oscillator.frequency.value = hertz;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(Number.parseFloat(volumeInput.value) * 0.3, context.currentTime + 0.02);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();

    sounding = key;
    key.classList.add('is-sounding');
    readout.textContent = `${NAMES[semitone]}${octave()}  ${hertz.toFixed(2)} Hz`;
  };

  const build = () => {
    keysBox.textContent = '';

    NAMES.forEach((name, semitone) => {
      const key = document.createElement('button');

      key.type = 'button';
      key.className = name.length > 1 ? 'tone-key is-sharp' : 'tone-key';
      key.textContent = name;
      key.setAttribute('aria-label', `Sound ${name}`);

      key.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        play(semitone, key);
      });

      key.addEventListener('pointerup', stop);
      key.addEventListener('pointerleave', stop);
      key.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          play(semitone, key);
        }
      });

      key.addEventListener('keyup', stop);

      keysBox.append(key);
    });
  };

  const save = () => {
    WOSState.write({
      ref: referenceInput.value,
      wave: waveSelect.value,
      oct: octaveInput.value,
      vol: volumeInput.value
    });
  };

  stopButton.addEventListener('click', stop);

  [referenceInput, waveSelect, octaveInput, volumeInput].forEach((control) => {
    control.addEventListener('change', save);
  });

  const restore = () => {
    const values = WOSState.read();

    referenceInput.value = String(WOSState.number(values, 'ref', 440));
    octaveInput.value = String(WOSState.integer(values, 'oct', 4));
    volumeInput.value = String(WOSState.number(values, 'vol', 0.4));

    if (Array.from(waveSelect.options).some((option) => option.value === values.wave)) {
      waveSelect.value = values.wave;
    }
  };

  build();
  restore();
})();
