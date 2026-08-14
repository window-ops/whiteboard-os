'use strict';

/*
 * Storage, as an application sees it.
 *
 * Saving needs one filesystem that every application shares, and that needs
 * the shell and its frames to be able to talk. Served over http they share an
 * origin and can. Opened from disk they cannot: a file:// frame has an opaque
 * origin, property access on the parent throws, and the history interface
 * refuses to write the address. Rather than keep a second, weaker mechanism
 * alive for that case, saving is simply unavailable from disk, and every part
 * of the interface that offers it removes itself.
 *
 * Where storage does exist, this frame keeps a mirror of the filesystem and
 * writes to it directly, so the interface updates at once, then posts the same
 * operation to the shell. The shell applies it to the real filesystem, keeps
 * it wherever the person chose, and sends the new image back to every frame.
 */

const WOSStorage = (() => {
  const MUTATORS = ['write', 'mkdir', 'unlink', 'rename'];

  const served = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  const framed = (() => {
    try {
      return window.parent !== window;
    } catch (error) {
      return true;
    }
  })();

  const available = served && framed;
  const mirror = WOSFS.create();

  let applying = false;

  if (available === false) {
    return {
      files: mirror,
      available: false,
      served,
      backend: 'address',
      reason: served
        ? 'This page is open on its own, outside the shell that holds the filesystem.'
        : 'Saving needs the project served over http. Opened from disk, applications cannot share a filesystem.'
    };
  }

  const post = (message) => {
    try {
      window.parent.postMessage(Object.assign({ wos: true }, message), '*');
    } catch (error) {
      /* The shell has gone; the mirror keeps working for this session. */
    }
  };

  MUTATORS.forEach((method) => {
    const original = mirror[method].bind(mirror);

    mirror[method] = function forwarded() {
      const args = Array.prototype.slice.call(arguments);
      const result = original.apply(null, args);

      if (applying === false) {
        post({ type: 'op', method, args });
      }

      return result;
    };
  });

  let backend = 'address';

  window.addEventListener('message', (event) => {
    const data = event.data;

    if (data === null || typeof data !== 'object' || data.wos !== true) {
      return;
    }

    if (data.type === 'backend' && (data.backend === 'local' || data.backend === 'address')) {
      backend = data.backend;
      return;
    }

    if (data.type === 'quota' && typeof data.quota === 'number') {
      mirror.quota = data.quota;
      return;
    }

    if (data.type !== 'image') {
      return;
    }

    const restored = data.image === '' ? WOSFS.create() : WOSFS.parse(data.image);

    if (restored === null) {
      return;
    }

    applying = true;
    mirror.adopt(restored);

    if (typeof data.quota === 'number') {
      mirror.quota = data.quota;
    }

    mirror.touched();

    if (data.backend === 'local' || data.backend === 'address') {
      backend = data.backend;
    }

    applying = false;
  });

  post({ type: 'hello' });

  const result = { files: mirror, available: true, served, reason: '' };

  Object.defineProperty(result, 'backend', {
    get() { return backend; },
    enumerable: true
  });

  return result;
})();

const WOSFiles = WOSStorage.files;
