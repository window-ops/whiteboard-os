'use strict';

(() => {
  const MAX_LENGTH = 900;

  const textInput = document.getElementById('TEXT');
  const sessionButton = document.getElementById('USE-SESSION');
  const sizeInput = document.getElementById('SIZE');
  const downloadButton = document.getElementById('DOWNLOAD');
  const holder = document.getElementById('HOLDER');
  const status = document.getElementById('STATUS');

  const draw = () => {
    const text = textInput.value.trim();

    holder.textContent = '';

    if (text === '') {
      status.textContent = '';
      return;
    }

    if (text.length > MAX_LENGTH) {
      status.textContent = `That is ${text.length} characters. A readable code holds about ${MAX_LENGTH}.`;
      return;
    }

    try {
      const code = qrcode(0, 'M');

      code.addData(text);
      code.make();

      const size = Number.parseInt(sizeInput.value, 10);
      const modules = code.getModuleCount();
      const cell = Math.max(2, Math.floor(size / (modules + 8)));

      holder.innerHTML = code.createImgTag(cell, cell * 4);

      const image = holder.querySelector('img');

      if (image !== null) {
        image.setAttribute('alt', `QR code for ${text}`);
      }

      status.textContent = '';
    } catch (error) {
      status.textContent = 'That text could not be encoded';
    }
  };

  const sessionAddress = () => {
    try {
      if (window.parent !== window && window.parent.location.href) {
        return window.parent.location.href;
      }
    } catch (error) {
      return null;
    }

    return window.location.href;
  };

  const save = () => {
    WOSState.write({ t: textInput.value.trim(), size: sizeInput.value });
  };

  /* The code is drawn as an image tag, which carries a data URL that can go
     straight to the computer. */
  downloadButton.addEventListener('click', () => {
    const image = holder.querySelector('img');

    if (image === null) {
      status.textContent = 'Type something to encode first';
      return;
    }

    WOSDownload.file(`qr-${new Date().toISOString().substring(0, 10)}.gif`, image.src, 'image/gif');
    status.textContent = 'Sent a copy to this computer';
  });

  textInput.addEventListener('input', draw);
  textInput.addEventListener('change', save);

  sizeInput.addEventListener('input', draw);
  sizeInput.addEventListener('change', save);

  sessionButton.addEventListener('click', () => {
    const address = sessionAddress();

    if (address === null) {
      status.textContent = 'The session address is out of reach when this page is opened straight from disk';
      return;
    }

    textInput.value = address;
    draw();
    save();
  });

  const restore = () => {
    const values = WOSState.read();

    if (typeof values.t === 'string') {
      textInput.value = values.t;
    }

    sizeInput.value = String(WOSState.integer(values, 'size', 360));
    draw();
  };

  restore();
})();
