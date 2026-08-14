'use strict';

/*
 * Saving a file to the computer.
 *
 * An application runs inside a frame, and a download started from a frame is
 * the kind of thing browsers restrict: some refuse it outright, some ask, and
 * the failure is silent either way. The shell is the top-level document and
 * has no such problem, so a frame asks the shell to do it and only falls back
 * to trying for itself when there is no shell to ask.
 *
 * This is a different act from saving a document. Save keeps something inside
 * the project, where it can be opened again. Download hands a copy to the
 * computer, and the project then knows nothing about it.
 */

const WOSDownload = (() => {
  const clean = (name) => String(name)
    .split('/').join('-')
    .split('\\').join('-')
    .replace(/[\u0000-\u001f\u007f"]/g, '')
    .trim()
    .substring(0, 120) || 'download';

  const locally = (name, text, mime) => {
    const link = document.createElement('a');
    const isDataUrl = typeof text === 'string' && text.startsWith('data:');
    const url = isDataUrl ? text : URL.createObjectURL(new Blob([text], { type: mime || 'text/plain' }));

    link.download = clean(name);
    link.href = url;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();

    if (isDataUrl === false) {
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 8000);
    }
  };

  const framed = (() => {
    try {
      return window.parent !== window;
    } catch (error) {
      return true;
    }
  })();

  return {
    clean,

    file(name, text, mime) {
      if (framed === false) {
        locally(name, text, mime);
        return;
      }

      try {
        window.parent.postMessage({
          wos: true,
          type: 'download',
          name: clean(name),
          text: String(text),
          mime: mime || 'text/plain'
        }, '*');
      } catch (error) {
        locally(name, text, mime);
      }
    },

    locally
  };
})();
