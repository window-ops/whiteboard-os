'use strict';

/*
 * Touch sound.
 *
 * Interactive whiteboards answer a press with a short click, so the person at
 * the board knows the panel took the press without having to look for a
 * highlight. The sound is synthesised here rather than shipped as a file: a
 * filtered noise burst for the contact and a fast decaying tone for the body,
 * about thirty milliseconds in all.
 *
 * The shell owns the setting. Every tool runs in a frame of its own with its
 * own document, so each frame loads this file and is told the setting through
 * the same message channel the filesystem uses.
 */

const WOSClick = (() => {
  const VOLUME = 0.22;
  const NOISE_SECONDS = 0.05;

  /* Anything that behaves like a control. The dots, tiles and swatches carry
     their own classes, so they are named alongside the plain elements. */
  const CONTROLS = [
    'button',
    'summary',
    'a[href]',
    '[role="button"]',
    '[role="tab"]',
    'select',
    'input[type="radio"]',
    'input[type="checkbox"]',
    'input[type="range"]',
    'input[type="color"]',
    'input[type="file"]',
    '.app',
    '.app-btn'
  ].join(', ');

  const framed = (() => {
    try {
      return window.parent !== window;
    } catch (error) {
      return true;
    }
  })();

  let enabled = false;
  let context = null;
  let noise = null;

  const audio = () => {
    if (context !== null) {
      return context;
    }

    const Constructor = window.AudioContext || window.webkitAudioContext;

    if (Constructor === undefined) {
      return null;
    }

    try {
      context = new Constructor();
    } catch (error) {
      return null;
    }

    return context;
  };

  /* One buffer of white noise serves every press. */
  const noiseBuffer = (ctx) => {
    if (noise !== null) {
      return noise;
    }

    const frames = Math.floor(ctx.sampleRate * NOISE_SECONDS);

    noise = ctx.createBuffer(1, frames, ctx.sampleRate);

    const channel = noise.getChannelData(0);

    for (let index = 0; index < frames; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    return noise;
  };

  const play = () => {
    const ctx = audio();

    if (ctx === null) {
      return;
    }

    /* A context created before the first gesture starts suspended. */
    if (ctx.state === 'suspended') {
      try {
        ctx.resume();
      } catch (error) {
        /* The press that follows will try again. */
      }
    }

    const now = ctx.currentTime;
    const master = ctx.createGain();

    master.gain.value = VOLUME;
    master.connect(ctx.destination);

    const source = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const contact = ctx.createGain();

    source.buffer = noiseBuffer(ctx);
    band.type = 'bandpass';
    band.frequency.value = 1500;
    band.Q.value = 0.9;
    contact.gain.setValueAtTime(0.0001, now);
    contact.gain.exponentialRampToValueAtTime(0.9, now + 0.001);
    contact.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);

    source.connect(band);
    band.connect(contact);
    contact.connect(master);

    const tone = ctx.createOscillator();
    const body = ctx.createGain();

    tone.type = 'sine';
    tone.frequency.setValueAtTime(2600, now);
    tone.frequency.exponentialRampToValueAtTime(1150, now + 0.03);
    body.gain.setValueAtTime(0.0001, now);
    body.gain.exponentialRampToValueAtTime(0.45, now + 0.002);
    body.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

    tone.connect(body);
    body.connect(master);

    source.start(now);
    source.stop(now + NOISE_SECONDS);
    tone.start(now);
    tone.stop(now + 0.05);
  };

  const ticked = (caption) => {
    const held = caption.control || caption.querySelector('input');

    if (held === null || held === undefined || held.disabled === true) {
      return false;
    }

    return held.type === 'checkbox' || held.type === 'radio';
  };

  /*
   * Capture, so a control that stops the event on its own still sounds, and
   * pointerdown rather than click, so the sound arrives with the finger.
   */
  document.addEventListener('pointerdown', (event) => {
    if (enabled === false) {
      return;
    }

    const target = event.target;

    if (target === null || typeof target.closest !== 'function') {
      return;
    }

    const control = target.closest(CONTROLS);

    if (control === null) {
      /* A press on the caption beside a tick or a radio is a press on the
         control it belongs to. Captions beside a typing field are not. */
      const caption = target.closest('label');

      if (caption !== null && ticked(caption)) {
        play();
      }

      return;
    }

    if (control.disabled === true) {
      return;
    }

    play();
  }, true);

  const api = {
    play,

    set(value) {
      enabled = value === true;
    },

    get enabled() {
      return enabled;
    }
  };

  if (framed) {
    window.addEventListener('message', (event) => {
      const data = event.data;

      if (data === null || typeof data !== 'object' || data.wos !== true) {
        return;
      }

      if (data.type === 'sound') {
        api.set(data.enabled);
      }
    });

    /* The shell answers this greeting with the current setting. It is a
       greeting of its own, so a frame is not sent the filesystem again. */
    try {
      window.parent.postMessage({ wos: true, type: 'sound-hello' }, '*');
    } catch (error) {
      /* No shell to greet: the frame stays silent. */
    }
  }

  return api;
})();
