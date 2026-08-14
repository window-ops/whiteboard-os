'use strict';

(() => {
  const TRACKS = [1, 2, 3, 4, 5];

  const stopAllButton = document.getElementById('STOP-ALL');
  const controls = [];

  const save = () => {
    WOSState.write({
      mix: controls.map((entry) => `${entry.audio.paused ? 0 : 1}:${entry.slider.value}`).join(',')
    });
  };

  TRACKS.forEach((index) => {
    const audio = document.getElementById(`audio${index}`);
    const button = document.getElementById(`play-pause-button${index}`);
    const slider = document.getElementById(`volume-slider${index}`);

    if (audio === null || button === null || slider === null) {
      return;
    }

    const card = button.closest('.sound');
    const name = card === null ? `track ${index}` : card.querySelector('.sound-name').textContent;

    controls.push({ audio, button, slider });
    audio.volume = Number(slider.value);
    button.setAttribute('aria-label', `Play ${name}`);

    button.addEventListener('click', () => {
      if (audio.paused) {
        audio.play();
        return;
      }

      audio.pause();
    });

    /* Labels follow the element's own events, so an interrupted play promise
       cannot leave the button reading the wrong state. */
    audio.addEventListener('play', () => {
      button.textContent = 'Pause';
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('aria-label', `Pause ${name}`);
      save();
    });

    audio.addEventListener('pause', () => {
      button.textContent = 'Play';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `Play ${name}`);
      save();
    });

    slider.addEventListener('input', () => {
      audio.volume = Number(slider.value);
    });

    slider.addEventListener('change', save);
  });

  stopAllButton.addEventListener('click', () => {
    controls.forEach((entry) => {
      entry.audio.pause();
    });
  });

  const restore = () => {
    const values = WOSState.read();

    if (typeof values.mix !== 'string' || values.mix === '') {
      return;
    }

    values.mix.split(',').forEach((part, position) => {
      const entry = controls[position];
      const pieces = part.split(':');

      if (entry === undefined || pieces.length !== 2) {
        return;
      }

      entry.slider.value = pieces[1];
      entry.audio.volume = Number(pieces[1]);

      if (pieces[0] === '1') {
        const started = entry.audio.play();

        if (started && typeof started.catch === 'function') {
          started.catch(() => {
            /* A browser that blocks autoplay leaves the track paused. */
          });
        }
      }
    });
  };

  restore();
})();
