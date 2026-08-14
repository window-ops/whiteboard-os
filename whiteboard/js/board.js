'use strict';

/*
 * The board is started before the shared document bar loads, so the bar finds
 * the hooks it needs. A drawing is far too large for the page address the
 * other applications save from, so this one supplies its own collect and
 * apply.
 */

window.WOS_BOARD = WOSBoard.create(document.getElementById('BOARD'), {
  onTextRequest(point, event) {
    if (typeof window.WOS_BOARD_TEXT === 'function') {
      window.WOS_BOARD_TEXT(point, event);
    }
  }
});

window.WOSDocsHooks = {
  collect() {
    return window.WOS_BOARD.snapshot();
  },
  apply(text) {
    window.WOS_BOARD.load(text);
  }
};
