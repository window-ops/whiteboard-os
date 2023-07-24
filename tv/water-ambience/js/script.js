// Audio 1

const audio1 = document.getElementById('audio1');
const playPauseButton1 = document.getElementById('play-pause-button1');
const volumeSlider1 = document.getElementById('volume-slider1');

playPauseButton1.addEventListener('click', () => {
  if (audio1.paused) {
    audio1.play();
    playPauseButton1.textContent = 'Pause';
  } else {
    audio1.pause();
    playPauseButton1.textContent = 'Play';
  }
});

volumeSlider1.addEventListener('input', () => {
  audio1.volume = volumeSlider1.value;
});

// Audio 2

const audio2 = document.getElementById('audio2');
const playPauseButton2 = document.getElementById('play-pause-button2');
const volumeSlider2 = document.getElementById('volume-slider2');

playPauseButton2.addEventListener('click', () => {
  if (audio2.paused) {
    audio2.play();
    playPauseButton2.textContent = 'Pause';
  } else {
    audio2.pause();
    playPauseButton2.textContent = 'Play';
  }
});

volumeSlider2.addEventListener('input', () => {
  audio2.volume = volumeSlider2.value;
});

// Audio 3

const audio3 = document.getElementById('audio3');
const playPauseButton3 = document.getElementById('play-pause-button3');
const volumeSlider3 = document.getElementById('volume-slider3');

playPauseButton3.addEventListener('click', () => {
  if (audio3.paused) {
    audio3.play();
    playPauseButton3.textContent = 'Pause';
  } else {
    audio3.pause();
    playPauseButton3.textContent = 'Play';
  }
});

volumeSlider3.addEventListener('input', () => {
  audio3.volume = volumeSlider3.value;
});

// Audio 4

const audio4 = document.getElementById('audio4');
const playPauseButton4 = document.getElementById('play-pause-button4');
const volumeSlider4 = document.getElementById('volume-slider4');

playPauseButton4.addEventListener('click', () => {
  if (audio4.paused) {
    audio4.play();
    playPauseButton4.textContent = 'Pause';
  } else {
    audio4.pause();
    playPauseButton4.textContent = 'Play';
  }
});

volumeSlider4.addEventListener('input', () => {
  audio4.volume = volumeSlider4.value;
});

// Audio 5

const audio5 = document.getElementById('audio5');
const playPauseButton5 = document.getElementById('play-pause-button5');
const volumeSlider5 = document.getElementById('volume-slider5');

playPauseButton5.addEventListener('click', () => {
  if (audio5.paused) {
    audio5.play();
    playPauseButton5.textContent = 'Pause';
  } else {
    audio5.pause();
    playPauseButton5.textContent = 'Play';
  }
});

volumeSlider5.addEventListener('input', () => {
  audio5.volume = volumeSlider5.value;
});