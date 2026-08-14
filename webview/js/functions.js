'use strict';

(() => {
  const LOAD_TIMEOUT_MS = 8000;

  const frame = document.getElementById('FRAME');
  const urlBar = document.getElementById('URLBAR');
  const navigateButton = document.getElementById('NAVIGATE');
  const openTabButton = document.getElementById('OPEN-TAB');
  const banner = document.getElementById('BANNER');
  const bannerText = document.getElementById('BANNER-TEXT');
  const dismissButton = document.getElementById('DISMISS');

  let requested = null;
  let timeoutId = null;

  const hideBanner = () => {
    banner.hidden = true;
    bannerText.textContent = '';
  };

  const showBanner = (message) => {
    bannerText.textContent = message;
    banner.hidden = false;
  };

  const clearTimer = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const toAbsoluteUrl = (value) => {
    const trimmed = value.trim();

    if (trimmed === '') {
      return null;
    }

    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const parsed = new URL(candidate);

      /* Only the two schemes a page can safely be shown from. Anything else,
         a javascript: or data: address in particular, is refused. */
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      return parsed.href;
    } catch (error) {
      return null;
    }
  };

  /*
   * A cross-origin document that really loaded denies access to its location.
   * A frame stopped by X-Frame-Options or a frame-ancestors policy stays on
   * about:blank, which is same-origin and therefore readable.
   */
  const framePlaceholderIsIntact = () => {
    try {
      const href = frame.contentWindow.location.href;

      return href === 'about:blank' || href === '';
    } catch (error) {
      return false;
    }
  };

  const save = () => {
    WOSState.write({ url: requested === null ? '' : requested });
  };

  const navigate = (url) => {
    const target = url || toAbsoluteUrl(urlBar.value);

    if (target === null) {
      showBanner('That address could not be understood');
      return;
    }

    hideBanner();
    clearTimer();

    requested = target;
    urlBar.value = target;
    frame.src = target;
    save();

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      showBanner('This site is taking a long time to answer');
    }, LOAD_TIMEOUT_MS);
  };

  frame.addEventListener('load', () => {
    clearTimer();

    if (requested === null) {
      return;
    }

    if (framePlaceholderIsIntact()) {
      showBanner('This site refused to open inside a frame, so use the button beside the address');
      return;
    }

    hideBanner();
  });

  navigateButton.addEventListener('click', () => {
    navigate(null);
  });

  urlBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      navigate(null);
    }
  });

  openTabButton.addEventListener('click', () => {
    const target = requested === null ? toAbsoluteUrl(urlBar.value) : requested;

    if (target !== null) {
      window.open(target, '_blank', 'noopener');
    }
  });

  dismissButton.addEventListener('click', hideBanner);

  const restore = () => {
    const values = WOSState.read();

    if (typeof values.url === 'string' && values.url !== '') {
      navigate(values.url);
    }
  };

  restore();
})();
