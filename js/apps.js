'use strict';

/*
 * Application registry.
 *
 * Categories render in the order given below. A category with no applications
 * is left out of the launcher, so later batches can add tools by appending to
 * WOS_APPS alone.
 *
 * Each application needs: id, name, category, url, description.
 */

const WOS_CATEGORIES = [
  { id: 'cross-curricular', name: 'Cross-curricular' },
  { id: 'maths', name: 'Maths' },
  { id: 'science', name: 'Science' },
  { id: 'geography', name: 'Geography' },
  { id: 'languages', name: 'Languages' },
  { id: 'arts', name: 'Arts' },
  { id: 'system', name: 'System' }
];

const WOS_APPS = [
  {
    id: 'whiteboard',
    name: 'Whiteboard',
    category: 'cross-curricular',
    url: './whiteboard/index.html',
    description: 'A canvas-based tool that allows you to present ideas, concepts, and information with ease.'
  },
  {
    id: 'webview',
    name: 'Web View',
    category: 'cross-curricular',
    url: './webview/index.html',
    description: 'Web View is a tool where you can easily bring up websites, online resources, and other online content that can enhance your lesson plans, presentations, or lectures.'
  },
  {
    id: 'ambience',
    name: 'Water Ambience',
    category: 'cross-curricular',
    url: './water-ambience/index.html',
    description: 'Enjoy water sounds while you are out.'
  },
  {
    id: 'timer',
    name: 'Timer',
    category: 'cross-curricular',
    url: './timer/index.html',
    description: 'A countdown and a stopwatch, with the end signal chosen for the session.'
  },
  {
    id: 'dice',
    name: 'Dice and Spinner',
    category: 'cross-curricular',
    url: './dice/index.html',
    description: 'Polyhedral dice and a spinner with labels of your own.'
  },
  {
    id: 'groups',
    name: 'Group Shuffler',
    category: 'cross-curricular',
    url: './groups/index.html',
    description: 'Divide a list of names by number of groups or by group size.'
  },
  {
    id: 'qr',
    name: 'QR Code',
    category: 'cross-curricular',
    url: './qr/index.html',
    description: 'Turn a link or a piece of text into a code the room can scan.'
  },
  {
    id: 'plot',
    name: 'Function Plotter',
    category: 'maths',
    url: './plot/index.html',
    description: 'Plot up to three functions of x with sliders for their parameters.'
  },
  {
    id: 'convert',
    name: 'Unit Converter',
    category: 'maths',
    url: './convert/index.html',
    description: 'Convert between metric units, with the full family shown alongside.'
  },
  {
    id: 'periodic',
    name: 'Periodic Table',
    category: 'science',
    url: './periodic/index.html',
    description: 'The elements, with overlays for electronegativity, radius, ionisation energy and mass.'
  },
  {
    id: 'count',
    name: 'Text Counter',
    category: 'languages',
    url: './count/index.html',
    description: 'Characters, words, sentences, syllables and reading time, in 23 languages.'
  },
  {
    id: 'cloze',
    name: 'Cloze Builder',
    category: 'languages',
    url: './cloze/index.html',
    description: 'Click the words to blank, then print the sheet.'
  },
  {
    id: 'scramble',
    name: 'Scrambler',
    category: 'languages',
    url: './scramble/index.html',
    description: 'Scramble word order or the letters inside words, with a reveal.'
  },
  {
    id: 'ipa',
    name: 'IPA Keyboard',
    category: 'languages',
    url: './ipa/index.html',
    description: 'The full phonetic alphabet, ready to type a transcription.'
  },
  {
    id: 'colour',
    name: 'Colour Wheel',
    category: 'arts',
    url: './colour/index.html',
    description: 'The artist\'s wheel or the screen\'s, with harmonies and mixing.'
  },
  {
    id: 'metronome',
    name: 'Metronome',
    category: 'arts',
    url: './metronome/index.html',
    description: 'Tempo, time signatures, subdivisions and tap tempo.'
  },
  {
    id: 'tone',
    name: 'Tuning Tone',
    category: 'arts',
    url: './tone/index.html',
    description: 'A chromatic reference tone with an adjustable pitch standard.'
  },
  {
    id: 'staff',
    name: 'Staff',
    category: 'arts',
    url: './staff/index.html',
    description: 'Place notes on a treble or bass staff and hear them back.'
  },
  {
    id: 'files',
    name: 'Files',
    category: 'cross-curricular',
    url: './files/index.html',
    description: 'Browse, edit and delete everything saved by the other applications.'
  },
  {
    id: 'calc',
    name: 'Calculator',
    category: 'maths',
    url: './calc/index.html',
    description: 'Arithmetic with units, variables, percentages, bases and a history.'
  },
  {
    id: 'molar',
    name: 'Molar Mass',
    category: 'science',
    url: './molar/index.html',
    description: 'Work out the mass of a formula and what each element contributes.'
  },
  {
    id: 'constants',
    name: 'Physical Constants',
    category: 'science',
    url: './constants/index.html',
    description: 'The CODATA values, searchable, with their uncertainties.'
  },
  {
    id: 'map',
    name: 'Map',
    category: 'geography',
    url: './map/index.html',
    description: "The world's map. Show locations and maps to your students."
  },
  {
    id: 'dev',
    name: 'Developer Notes',
    category: 'system',
    url: './dev/index.html',
    description: 'The documents in docs/, read inside the system: architecture, the address, the filesystem and how to add a tool.'
  },
  {
    id: 'isocity',
    name: 'IsoCity',
    category: 'geography',
    url: './isocity/index.html',
    description: 'Build a temporary isometric city.'
  }
];

/*
 * The dock along the bottom of the home screen. These are the applications a
 * lesson reaches for without thinking, kept one press away whichever category
 * is showing. Ids must exist in WOS_APPS above.
 */

const WOS_DOCK = ['whiteboard', 'webview', 'timer', 'calc', 'map', 'files'];
