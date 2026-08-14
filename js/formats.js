'use strict';

/*
 * Document formats.
 *
 * Every kind of document this project saves gets its own extension, so a
 * listing says what a file is without opening it. All of them hold plain text:
 * the state string a tool keeps in its page address, or a snapshot for the
 * whiteboard.
 *
 * The prefix w marks the family, as .wbd for a whiteboard document.
 */

const WOS_FORMATS = {
  whiteboard: { extension: 'wbd', label: 'Whiteboard drawing' },
  cloze: { extension: 'wcz', label: 'Cloze exercise' },
  scramble: { extension: 'wsc', label: 'Scrambling set' },
  ipa: { extension: 'wip', label: 'Phonetic transcription' },
  groups: { extension: 'wgr', label: 'Class list and grouping' },
  timer: { extension: 'wtm', label: 'Timer setting' },
  dice: { extension: 'wsp', label: 'Dice and spinner setting' },
  plot: { extension: 'wpl', label: 'Plotted functions' },
  calc: { extension: 'wcl', label: 'Calculator session' },
  colour: { extension: 'wcp', label: 'Colour palette' },
  metronome: { extension: 'wmt', label: 'Metronome setting' },
  staff: { extension: 'wsf', label: 'Staff notes' },
  isocity: { extension: 'wic', label: 'IsoCity layout' },
  webview: { extension: 'wwv', label: 'Saved address' },
  map: { extension: 'wmp', label: 'Map view' },
  ambience: { extension: 'wam', label: 'Ambient mix' }
};

const WOSFormats = {
  extensionFor(kind) {
    const format = WOS_FORMATS[kind];

    return format === undefined ? 'wos' : format.extension;
  },

  labelFor(name) {
    const parts = String(name).split('.');
    const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    const match = Object.keys(WOS_FORMATS).filter((kind) => WOS_FORMATS[kind].extension === extension)[0];

    return match === undefined ? '' : WOS_FORMATS[match].label;
  }
};
