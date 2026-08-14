'use strict';

(() => {
  const TICK_MS = 100;

  const modeSelect = document.getElementById('MODE');
  const minutesInput = document.getElementById('MINUTES');
  const secondsInput = document.getElementById('SECONDS');
  const signalSelect = document.getElementById('SIGNAL');
  const volumeInput = document.getElementById('VOLUME');
  const volumeField = document.getElementById('VOLUME-FIELD');
  const durationField = document.getElementById('DURATION-FIELD');
  const secondsField = document.getElementById('SECONDS-FIELD');
  const startButton = document.getElementById('START');
  const resetButton = document.getElementById('RESET');
  const readout = document.getElementById('READOUT');
  const status = document.getElementById('STATUS');

  let running = false;
  let remaining = 0;
  let elapsed = 0;
  let lastTick = 0;
  let ticker = null;
  let audioContext = null;

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  const durationMs = () => {
    const minutes = clamp(Number.parseInt(minutesInput.value, 10) || 0, 0, 180);
    const seconds = clamp(Number.parseInt(secondsInput.value, 10) || 0, 0, 59);

    return (minutes * 60 + seconds) * 1000;
  };

  const format = (milliseconds) => {
    const total = Math.max(0, Math.round(milliseconds / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (value) => String(value).padStart(2, '0');

    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  };

  const saveState = () => {
    WOSState.write({
      mode: modeSelect.value,
      m: minutesInput.value,
      s: secondsInput.value,
      sig: signalSelect.value,
      vol: volumeInput.value
    });
  };

  const chime = () => {
    if (signalSelect.value !== 'chime') {
      return;
    }

    const Context = window.AudioContext || window.webkitAudioContext;

    if (typeof Context !== 'function') {
      return;
    }

    if (audioContext === null) {
      audioContext = new Context();
    }

    const level = Number.parseFloat(volumeInput.value);
    const now = audioContext.currentTime;

    [880, 1174.66].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = now + index * 0.28;

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level * 0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 1.2);
    });
  };

  const clearFinish = () => {
    document.body.classList.remove('is-finished');
  };

  const finish = () => {
    running = false;
    window.clearInterval(ticker);
    ticker = null;
    startButton.textContent = 'Start';
    status.textContent = 'Finished';
    readout.textContent = '00:00';
    document.body.classList.add('is-finished');
    window.setTimeout(clearFinish, 4500);
    chime();
  };

  const render = () => {
    if (modeSelect.value === 'stopwatch') {
      readout.textContent = format(elapsed);
      return;
    }

    readout.textContent = format(remaining);
  };

  const tick = () => {
    const now = Date.now();
    const delta = now - lastTick;

    lastTick = now;

    if (modeSelect.value === 'stopwatch') {
      elapsed += delta;
      render();
      return;
    }

    remaining -= delta;

    if (remaining <= 0) {
      remaining = 0;
      finish();
      return;
    }

    render();
  };

  const start = () => {
    if (modeSelect.value === 'countdown') {
      if (remaining <= 0) {
        remaining = durationMs();
      }

      if (remaining <= 0) {
        status.textContent = 'Set a duration first';
        return;
      }
    }

    clearFinish();
    running = true;
    lastTick = Date.now();
    ticker = window.setInterval(tick, TICK_MS);
    startButton.textContent = 'Pause';
    status.textContent = 'Running';
  };

  const pause = () => {
    running = false;
    window.clearInterval(ticker);
    ticker = null;
    startButton.textContent = 'Start';
    status.textContent = 'Paused';
  };

  const reset = () => {
    pause();
    clearFinish();
    remaining = durationMs();
    elapsed = 0;
    status.textContent = 'Ready';
    render();
  };

  const applyMode = () => {
    const isCountdown = modeSelect.value === 'countdown';

    durationField.hidden = isCountdown === false;
    secondsField.hidden = isCountdown === false;
    readout.classList.toggle('is-elapsed', isCountdown === false);
    reset();
  };

  const applySignal = () => {
    volumeField.hidden = signalSelect.value !== 'chime';
  };

  startButton.addEventListener('click', () => {
    if (running) {
      pause();
      return;
    }

    start();
  });

  resetButton.addEventListener('click', reset);

  modeSelect.addEventListener('change', () => {
    applyMode();
    saveState();
  });

  signalSelect.addEventListener('change', () => {
    applySignal();
    saveState();
  });

  volumeInput.addEventListener('change', saveState);

  [minutesInput, secondsInput].forEach((input) => {
    input.addEventListener('change', () => {
      if (running === false) {
        reset();
      }

      saveState();
    });
  });

  const restore = () => {
    const values = WOSState.read();

    if (values.mode === 'stopwatch' || values.mode === 'countdown') {
      modeSelect.value = values.mode;
    }

    if (values.sig === 'chime' || values.sig === 'visual') {
      signalSelect.value = values.sig;
    }

    minutesInput.value = String(clamp(WOSState.integer(values, 'm', 5), 0, 180));
    secondsInput.value = String(clamp(WOSState.integer(values, 's', 0), 0, 59));
    volumeInput.value = String(clamp(WOSState.number(values, 'vol', 0.5), 0, 1));

    applySignal();
    applyMode();
  };

  restore();
})();
