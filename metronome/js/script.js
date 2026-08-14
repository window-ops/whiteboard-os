'use strict';

(() => {
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;
  const TAP_MEMORY = 6;
  const TAP_TIMEOUT_MS = 2500;

  const bpmInput = document.getElementById('BPM');
  const meterSelect = document.getElementById('METER');
  const subSelect = document.getElementById('SUB');
  const volumeInput = document.getElementById('VOLUME');
  const tapButton = document.getElementById('TAP');
  const startButton = document.getElementById('START');
  const readout = document.getElementById('TEMPO-READOUT');
  const beatsBox = document.getElementById('BEATS');
  const status = document.getElementById('STATUS');

  let context = null;
  let running = false;
  let ticker = null;
  let nextTime = 0;
  let position = 0;
  let taps = [];

  const meter = () => {
    const parts = meterSelect.value.split('/');

    return { beats: Number.parseInt(parts[0], 10), unit: Number.parseInt(parts[1], 10) };
  };

  const subdivision = () => Number.parseInt(subSelect.value, 10);

  const bpm = () => Math.min(300, Math.max(20, Number.parseInt(bpmInput.value, 10) || 90));

  const stepSeconds = () => {
    const beatSeconds = 60 / bpm();
    const compound = meter().unit === 8;

    return (compound ? beatSeconds / 2 : beatSeconds) / subdivision();
  };

  const stepsPerBar = () => meter().beats * subdivision() * (meter().unit === 8 ? 1 : 1);

  const drawBeats = () => {
    beatsBox.textContent = '';

    for (let i = 0; i < stepsPerBar(); i++) {
      const dot = document.createElement('span');
      const onBeat = i % subdivision() === 0;

      dot.className = onBeat ? (i === 0 ? 'metro-beat is-strong' : 'metro-beat') : 'metro-beat is-sub';
      beatsBox.append(dot);
    }
  };

  const markBeat = (index) => {
    Array.from(beatsBox.children).forEach((dot, position2) => {
      dot.classList.toggle('is-active', position2 === index);
    });
  };

  const click = (time, kind) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const level = Number.parseFloat(volumeInput.value);
    const loudness = kind === 'strong' ? level : (kind === 'beat' ? level * 0.7 : level * 0.35);

    oscillator.type = 'square';
    oscillator.frequency.value = kind === 'strong' ? 1600 : (kind === 'beat' ? 1200 : 900);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(loudness * 0.3, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.06);
  };

  const schedule = () => {
    const perBar = stepsPerBar();

    while (nextTime < context.currentTime + SCHEDULE_AHEAD) {
      const kind = position === 0 ? 'strong' : (position % subdivision() === 0 ? 'beat' : 'sub');
      const index = position;
      const delay = Math.max(0, (nextTime - context.currentTime) * 1000);

      click(nextTime, kind);
      window.setTimeout(() => {
        markBeat(index);
      }, delay);

      nextTime += stepSeconds();
      position = (position + 1) % perBar;
    }
  };

  const start = () => {
    const Context = window.AudioContext || window.webkitAudioContext;

    if (typeof Context !== 'function') {
      status.textContent = 'This browser has no Web Audio support';
      return;
    }

    if (context === null) {
      context = new Context();
    }

    context.resume();
    running = true;
    position = 0;
    nextTime = context.currentTime + 0.05;
    ticker = window.setInterval(schedule, LOOKAHEAD_MS);
    startButton.textContent = 'Stop';
    status.textContent = `Running at ${bpm()} beats per minute in ${meterSelect.value}`;
  };

  const stop = () => {
    running = false;
    window.clearInterval(ticker);
    ticker = null;
    startButton.textContent = 'Start';
    status.textContent = 'Stopped';
    markBeat(-1);
  };

  const save = () => {
    WOSState.write({
      bpm: bpmInput.value,
      meter: meterSelect.value,
      sub: subSelect.value,
      vol: volumeInput.value
    });
  };

  const refresh = () => {
    readout.textContent = String(bpm());
    drawBeats();

    if (running) {
      position = 0;
      nextTime = context.currentTime + 0.05;
      status.textContent = `Running at ${bpm()} beats per minute in ${meterSelect.value}`;
    }
  };

  startButton.addEventListener('click', () => {
    if (running) {
      stop();
      return;
    }

    start();
  });

  tapButton.addEventListener('click', () => {
    const now = Date.now();

    if (taps.length > 0 && now - taps[taps.length - 1] > TAP_TIMEOUT_MS) {
      taps = [];
    }

    taps.push(now);

    if (taps.length > TAP_MEMORY) {
      taps.shift();
    }

    if (taps.length < 2) {
      status.textContent = 'Keep tapping';
      return;
    }

    let total = 0;

    for (let i = 1; i < taps.length; i++) {
      total += taps[i] - taps[i - 1];
    }

    const average = total / (taps.length - 1);

    bpmInput.value = String(Math.round(Math.min(300, Math.max(20, 60000 / average))));
    refresh();
    save();
  });

  [bpmInput, meterSelect, subSelect].forEach((control) => {
    control.addEventListener('change', () => {
      refresh();
      save();
    });
  });

  bpmInput.addEventListener('input', () => {
    readout.textContent = String(bpm());
  });

  volumeInput.addEventListener('change', save);

  const restore = () => {
    const values = WOSState.read();

    bpmInput.value = String(WOSState.integer(values, 'bpm', 90));

    if (Array.from(meterSelect.options).some((option) => option.value === values.meter)) {
      meterSelect.value = values.meter;
    }

    if (['1', '2', '3', '4'].indexOf(values.sub) >= 0) {
      subSelect.value = values.sub;
    }

    volumeInput.value = String(WOSState.number(values, 'vol', 0.6));
    refresh();
  };

  restore();
})();
