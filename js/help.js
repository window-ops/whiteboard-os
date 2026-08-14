'use strict';

/*
 * Help texts, keyed by application id.
 *
 * Structure per entry: what the controls do, what the tool is for, and where
 * it stops being useful. Markup is limited to h4, p, ul, li, em and strong.
 */

const WOS_HELP = {
  whiteboard: `
    <h4>Using it</h4>
    <p>
      Tools sit along the top: pen, line, arrow, rectangle, ellipse, text,
      eraser and pan. Colour and thickness apply to whatever is drawn next, and
      Fill shapes decides whether a rectangle or an ellipse is solid. The text
      tool opens an entry box at the point that was clicked; Enter places the
      text and Escape abandons it.
    </p>
    <p>
      Drag with the pan tool, or hold Shift with any tool, to move the board.
      The wheel zooms around the pointer, the plus and minus buttons zoom
      around the centre, and Fit returns to the original position and scale.
      Undo and redo cover the whole session and use to Ctrl+Z and Ctrl+Y.
      The eraser removes whole marks rather than pixels, so a drawing continues
      to be a list of objects that can be exported as vectors at any size.
    </p>
    <p>
      The format control chooses what the two buttons beside it produce: a PNG
      image, an SVG drawing that scales without loss, or a JSON snapshot this
      application can reload. Keep in Files puts the result in the project,
      beside the board it came from, where it can be opened again. Download
      a copy hands the file to the computer but does not save it here.
    </p>
    <h4>What it is for</h4>
    <p>
      Building a diagram, a proof or a correction in front of the class, so the
      order of the steps stays visible.
    </p>
    <h4>Where it stops</h4>
    <p>
      A board filled in advance works as a slide with extra steps. A PNG export
      is stored as text and is bigger than the adress quota, so a full board is
      better downloaded than kept in files; an SVG of the same drawing is usually
      a fraction of the size.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wbd document into /documents/whiteboard. Exports go to a
      separate exports folder beside it. Served over http these appear in the
      Files application while opened from disk the Save controls are hidden entirely.
    </p>
  `,
  webview: `
    <h4>Using it</h4>
    <p>
      Type an address and press Enter. The https prefix is added when missing.
      Some sites refuse to load inside another page.
    </p>
    <h4>What it is for</h4>
    <p>
      Showing a source in its original form, with its authorship and date
      intact.
    </p>
    <h4>Where it stops</h4>
    <p>
      A page projected at the front is read once, at one speed. When the text
      matters, students need their own copy.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wwv document into /documents/webview. Documents appear in
      the Files application beside everything else. Saving needs the project
      served over http; opened from disk the Save controls are hidden, since
      applications cannot share a filesystem there.
    </p>
  `,
  map: `
    <h4>Using it</h4>
    <p>
      Drag to pan, scroll or pinch to zoom, and use the corner control to
      switch between street, satellite and topographic imagery. Measure
      distance drops points on each click and totals the line between them in
      metres or kilometres.
    </p>
    <p>
      Tiles come from Esri by default. The OpenStreetMap layer needs the
      application served over http, since its usage policy requires a Referer
      header that a page opened from disk cannot send.
    </p>
    <h4>What it is for</h4>
    <p>
      Questions that need the map to answer them: why a settlement sits where
      it does, what a border follows, how far a route runs.
    </p>
    <h4>Where it stops</h4>
    <p>
      Naming capitals on demand tests a list. Satellite imagery is dated and
      uneven in resolution.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wmp document into /documents/map. Documents appear in the Files
      application beside everything else. Saving needs the project served over http;
      opened from disk the Save controls are hidden, since applications cannot share a
      filesystem there.
    </p>
  `,
  isocity: `
    <h4>Using it</h4>
    <p>
      Pick a tile and click or drag on the grid to place it. The right mouse
      button clears a single square, and Clear the grid empties everything. The
      layout is stored in the page address, so it travels with a saved document
      or a copied address.
    </p>
    <h4>What it is for</h4>
    <p>
      A fixed grid forces trade-offs, which gives students something to defend
      and revise.
    </p>
    <h4>Where it stops</h4>
    <p>
      The finished picture carries little on its own, and the stylised tile set
      says nothing about how real places are built.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wic document into /documents/isocity. Documents appear in 
      the Files application beside everything else. Saving needs the project served 
      over http; opened from disk the Save controls are hidden, since applications 
      cannot share a filesystem there.
    </p>
  `,
  ambience: `
    <h4>Using it</h4>
    <p>
      Each track has its own play control and volume, and several can run
      together. Stop everything silences the lot. A track downloads only when
      it is first played, so the first press is slower than the rest, and a
      saved document keeps which tracks were running at what volume.
    </p>
    <h4>What it is for</h4>
    <p>
      Marking the start and end of an activity without an announcement.
    </p>
    <h4>Where it stops</h4>
    <p>
      Left running, it stops being a signal. Some students work badly with
      continuous sound, so it is worth asking the class.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wam document into /documents/ambience. Documents appear in 
      the Files application beside everything else. Saving needs the project served
      over http; opened from disk the Save controls are hidden, since applications
      cannot share a filesystem there.
    </p>
  `,
  timer: `
    <h4>Using it</h4>
    <p>
      Countdown and stopwatch share the same display. Set minutes and seconds,
      then start, pause or reset. The end signal is chosen per session: a
      visual flash alone, or a flash with a chime at the volume set here.
    </p>
    <h4>What it is for</h4>
    <p>
      Giving an activity a length everyone can see, so the remaining time stops
      being something only the teacher knows.
    </p>
    <h4>Where it stops</h4>
    <p>
      A visible clock hurries some students more than it focuses them. Work
      that rewards thinking time is worth timing loosely or not at all.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wtm document into /documents/timer. Documents appear in
      the Files application beside everything else. Saving needs the project served
      over http; opened from disk the Save controls are hidden, since applications
      cannot share a filesystem there.
    </p>
  `,
  dice: `
    <h4>Using it</h4>
    <p>
      Choose a die and how many to roll; each face and the total are shown. The
      spinner takes one label per line and lands on one of them.
    </p>
    <h4>What it is for</h4>
    <p>
      Generating data for probability work, and settling arbitrary choices
      openly.
    </p>
    <h4>Where it stops</h4>
    <p>
      Small samples are far from the expected distribution. Rolls come from the browser's
      cryptographic random source, so they are not reproducible; a lesson that needs the
      same sequence twice needs the numbers written down.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wsp document into /documents/dice. Documents appear in the Files
      application beside everything else. Saving needs the project served over http; opened
      from disk the Save controls are hidden, since applications cannot share a
      filesystem there.
    </p>
  `,
  groups: `
    <h4>Using it</h4>
    <p>
      Paste or type one name per line. Split by number of groups or by group
      size. Each shuffle avoids repeating the previous arrangement. The list is
      kept in the page address only while the box below is ticked.
    </p>
    <h4>What it is for</h4>
    <p>
      Mixing groups quickly when the composition should change between tasks.
    </p>
    <h4>Where it stops</h4>
    <p>
      Random assignment ignores who works well together and who needs support.
      Some tasks need groups chosen deliberately.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wgr document into /documents/groups. Documents appear in the
      Files application beside everything else. Saving needs the project served over
      http; opened from disk the Save controls are hidden, since applications cannot
      share a filesystem there.
    </p>
  `,
  qr: `
    <h4>Using it</h4>
    <p>
      Type or paste text, or copy the current session address, and a code is
      drawn on this machine. Nothing is sent anywhere. The size control makes
      the code readable from the back of the room, and Download a copy saves
      the image to the computer for a worksheet or a slide.
    </p>
    <h4>What it is for</h4>
    <p>
      Handing a long address to a room without dictating it.
    </p>
    <p>
      The session address button copies whatever the shell currently holds,
      which is the open applications, their settings and every saved file. A
      class scanning that code lands on the same arrangement of tools, which is
      quicker than describing where to click.
    </p>
    <h4>Where it stops</h4>
    <p>
      A code hides its destination, so saying where it leads before the class
      scans it costs one sentence. Longer text makes a denser code, and past
      roughly 900 characters it stops being readable across a room. Anything
      built from the session address is long by nature, so project it large.
    </p>
  `,
  plot: `
    <h4>Using it</h4>
    <p>
      Enter up to three expressions in x. The letters a, b, c and d are tied to
      the sliders, so a curve can be changed without retyping it. Drag to pan,
      scroll to zoom, and open the table for values at even intervals.
    </p>
    <h4>What it is for</h4>
    <p>
      Watching what one parameter does to a graph, which is hard to convey with
      static examples.
    </p>
    <h4>Where it stops</h4>
    <p>
      The picture is sampled pixel by pixel, so poles, gaps and very steep
      sections can be drawn misleadingly. Anything asserted from the shape
      needs checking algebraically.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wpl document into /documents/plot. Documents appear in the
      Files application beside everything else. Saving needs the project served
      over http; opened from disk the Save controls are hidden, since applications
      cannot share a filesystem there.
    </p>
  `,
  periodic: `
    <h4>Using it</h4>
    <p>
      Select an element for its details. The overlay control recolours the
      table by electronegativity, covalent radius, first ionisation energy or
      atomic mass, and the bar in the corner gives the range that colouring
      covers. Elements without an accepted value stay grey. Category colouring
      follows the usual grouping of the table.
    </p>
    <h4>What it is for</h4>
    <p>
      Making periodic trends visible as a pattern across the table rather than
      as a sentence to memorise.
    </p>
    <p>
      The overlays are where the table earns its shape. Colouring by
      electronegativity makes the diagonal from caesium to fluorine visible in
      one glance; colouring by covalent radius shows atoms shrinking left to
      right across a period and growing down a group.
    </p>
    <h4>Where it stops</h4>
    <p>
      Values for the heaviest elements are predicted or missing, and those
      elements sit grey rather than guessed at. A colour scale shows order and
      nothing more, so precise comparisons need the numbers in the panel
      underneath.
    </p>
  `,
  convert: `
    <h4>Using it</h4>
    <p>
      Pick a quantity, then the units to convert between. Temperature uses
      degrees Celsius and kelvin, which are offset rather than scaled.
    </p>
    <h4>What it is for</h4>
    <p>
      Checking a conversion during work, and showing prefix steps as powers of
      ten.
    </p>
    <p>
      Every unit of the chosen quantity is listed beside the result, which is
      the part worth showing a class: converting 2.5 km to metres is one step,
      seeing the same length as 250 000 cm and 0.0025 Mm is what makes the
      prefixes mean something.
    </p>
    <h4>Where it stops</h4>
    <p>
      Results are rounded for display, and values far from one are shown in
      exponent form. Doing the conversion by hand first, and using this to
      check, keeps the arithmetic with the student.
    </p>
    <p>
      Only metric units are offered. Where a curriculum needs an imperial
      conversion, the factor belongs written on the board.
    </p>
  `,
  count: `
    <h4>Using it</h4>
    <p>
      Type or paste on the left and the figures update as you go. The language
      control chooses which hyphenation patterns are used for syllables, and
      those patterns load the first time a language is picked. The Syllables
      view shows where each word divides.
    </p>
    <h4>What it is for</h4>
    <p>
      Checking that a text sits at the length and density a task calls for, and
      showing students where words break.
    </p>
    <p>
      Twenty three languages are available, each carrying the pattern set its
      typesetters use, and the licence of every one is recorded in
      count/PATTERNS.md. Choosing the wrong language gives visibly wrong
      breaks, which is itself a useful demonstration that these rules belong to
      a language rather than to writing in general.
    </p>
    <h4>Where it stops</h4>
    <p>
      Hyphenation points approximate syllable boundaries. They come from
      typesetting rules, so a count can differ from what a speaker hears,
      particularly in English, where compound words and silent endings are
      handled for the printer rather than the ear. Reading time assumes a
      steady speed and ignores how hard the text is.
    </p>
  `,
  cloze: `
    <h4>Using it</h4>
    <p>
      Paste the passage, move to Choose blanks, and click any word to blank it.
      Clicking again puts it back. The Sheet stage numbers the gaps and prints
      without the toolbar. Show answers fills them in for marking, and Save to
      files keeps the passage and its blanks.
    </p>
    <h4>What it is for</h4>
    <p>
      Building a gap exercise from a text the class already knows, choosing the
      gaps by hand.
    </p>
    <h4>Where it stops</h4>
    <p>
      Blanking every content word turns comprehension into guessing. Gaps are
      worth choosing for what they test.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wcz document into /documents/cloze. Documents appear in the
      Files applicationbeside everything else. Saving needs the project served over
      http; opened from disk the Save controls are hidden, since applications cannot
      share a filesystem there.
    </p>
  `,
  scramble: `
    <h4>Using it</h4>
    <p>
      One sentence or word per line. Word order shuffles the words of each
      line, Letters shuffles inside each word. Difficulty sets how much is
      allowed to move, and Reveal shows the originals underneath.
    </p>
    <h4>What it is for</h4>
    <p>
      Word order work, spelling practice, and starters that need reordering
      before they can be read.
    </p>
    <h4>Where it stops</h4>
    <p>
      A scrambled sentence often has more than one valid reading, so the
      original is one answer rather than the answer.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wsc document into /documents/scramble. Documents appear in the
      Files application beside everything else. Saving needs the project served over
      http; opened from disk the Save controls are hidden, since applications cannot
      share a filesystem there.
    </p>
  `,
  ipa: `
    <h4>Using it</h4>
    <p>
      Symbols insert at the cursor. Diacritics and tone marks are combining
      characters and appear on a dotted circle in the chart; they attach to
      whatever precedes them. Slashes mark a phonemic transcription, square
      brackets a phonetic one.
    </p>
    <h4>What it is for</h4>
    <p>
      Writing a transcription in front of a class without hunting through a
      character map.
    </p>
    <h4>Where it stops</h4>
    <p>
      Whether the symbols display correctly depends on the fonts installed. Rare
      symbols and stacked diacritics are most likely to fail to render.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wip document into /documents/ipa. Documents appear in the Files
      application beside everything else. Saving needs the project served over http;
      opened from disk the Save controls are hidden, since applications cannot share a
      filesystem there.
    </p>
  `,
  colour: `
    <h4>Using it</h4>
    <p>
      Click a segment to choose a hue. The harmony control adds the related
      hues for that scheme. RYB spaces the wheel the way paint mixing does,
      RGB the way a screen does, and the mixer follows the same choice:
      subtractive under RYB, additive under RGB.
    </p>
    <h4>What it is for</h4>
    <p>
      Showing why two colours sit well together, and why mixing paint and
      mixing light give different answers.
    </p>
    <h4>Where it stops</h4>
    <p>
      Screen colour is an approximation of pigment. A palette that works here
      still has to be tested in the medium being used.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wcp document into /documents/colour. Documents appear in the
      Files application beside everything else. Saving needs the project served over
      http; opened from disk the Save controls are hidden, since applications cannot
      share a filesystem there.
    </p>
  `,
  metronome: `
    <h4>Using it</h4>
    <p>
      Set the tempo, or tap it in on the Tap tempo button. The time signature
      sets how many beats fall in a bar and marks the first one; compound
      signatures group in threes. Subdivision adds quieter clicks between
      beats.
    </p>
    <h4>What it is for</h4>
    <p>
      Holding a steady pulse for ensemble work, and hearing subdivisions
      against it.
    </p>
    <h4>Where it stops</h4>
    <p>
      A click trains playing to a grid. Rubato, phrasing and ensemble listening
      need it turned off.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wmt document into /documents/metronome. Documents appear in the
      Files application beside everything else. Saving needs the project served over
      http; opened from disk the Save controls are hidden, since applications cannot
      share a filesystem there.
    </p>
  `,
  tone: `
    <h4>Using it</h4>
    <p>
      Press and hold a key to sound it, by mouse, by touch, or with Enter once
      the key has focus. The reference field sets A4 in hertz,
      so historical and orchestral pitch standards can be used, and the rest of
      the notes follow it by equal temperament.
    </p>
    <h4>What it is for</h4>
    <p>
      Giving a class a pitch to tune to or to sing from.
    </p>
    <p>
      Changing the reference pitch moves every note with it, so a class can
      hear what a baroque ensemble at 415 Hz sounds like against a modern one
      at 440 or 442. The waveform control changes timbre without changing
      pitch, which separates the two ideas cleanly.
    </p>
    <h4>Where it stops</h4>
    <p>
      Equal temperament is one tuning among several, and intervals here will
      not match a just or meantone instrument. Sustained pure tones at volume
      are tiring, so short is better than loud.
    </p>
  `,
  staff: `
    <h4>Using it</h4>
    <p>
      Click on the staff to place a note at that height; ledger lines appear
      when notes sit outside the five lines. Play sounds them in order at the
      tempo given, highlighting each as it sounds. The clef switch moves the
      same positions between treble and bass.
    </p>
    <h4>What it is for</h4>
    <p>
      Connecting a position on the staff to a pitch that can be heard.
    </p>
    <h4>Where it stops</h4>
    <p>
      Every note lasts one beat and there are no accidentals or rests, so this
      shows pitch and not rhythm or key.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wsf document into /documents/staff. Documents appear in the
      Files application beside everything else. Saving needs the project served over
      http; opened from disk the Save controls are hidden, since applications cannot
      share a filesystem there.
    </p>
  `,
  files: `
    <h4>Using it</h4>
    <p>
      The listing shows one directory at a time; a folder opens it, a file
      opens its contents on the right for editing. New folder and New file name
      themselves in a row under the toolbar, and the path box takes a path
      directly. The listing redraws whenever anything is written, including
      saves made in another application, so a document appears here the moment
      it is kept. Every application saves under /documents, each with its own
      extension: .wbd for a board, .wcz for a cloze exercise, .wgr for a class
      list, and so on through the rest.
    </p>
    <h4>What it is for</h4>
    <p>
      Seeing what has been kept, tidying it, and repairing a document by hand.
    </p>
    <p>
      Settings decides where the filesystem lives. In the page address it holds
      up to 512 KB and travels with a copied or bookmarked link. In local
      storage it holds up to 4 MB and stays on this machine, which suits a
      board full of exported images. Moving back into the address needs the
      filesystem to fit, so the switch offers a list of files by size and takes
      the change once enough has been removed.
    </p>
    <h4>Where it stops</h4>
    <p>
      Neither place is a backup. An address can be lost and local storage is
      cleared with the browsing data, so anything that matters must be downloaded
      from Settings, as a string or as a .wosdata file.
    </p>
  `,
  calc: `
    <h4>Using it</h4>
    <p>
      Type an expression and press Enter. Units are carried through the
      arithmetic, so 3 km + 250 m knows what it means and 1 m in kg is refused.
      The word in converts a result, either to another unit or to hex, binary
      or octal. A name followed by = stores a value, ans holds the last result,
      and the history puts an entry back on the line when clicked.
    </p>
    <h4>What it is for</h4>
    <p>
      Working through a calculation where the units matter as much as the
      numbers.
    </p>
    <h4>Where it stops</h4>
    <p>
      Arithmetic runs in the browser's own floating point, so long chains
      accumulate small errors, and the significant figures setting changes only
      what is shown. There is no symbolic algebra, no matrices and no complex
      numbers.
    </p>
    <h4>Saving</h4>
    <p>
      Save writes a .wcl document into /documents/calc. Documents appear in the
      Files application beside everything else. Saving needs the project served over
      http; opened from disk the Save controls are hidden, since applications cannot
      share a filesystem there.
    </p>
  `,
  molar: `
    <h4>Using it</h4>
    <p>
      Write a formula the usual way: element symbols with their counts, and
      brackets for groups, as in Ca(OH)2 or CuSO4. The table breaks the total
      down by element and gives each one's share by mass. The mass field
      converts grams into moles and particles.
    </p>
    <h4>What it is for</h4>
    <p>
      Checking a molar mass, and showing why the heaviest element is rarely the
      one with the biggest share.
    </p>
    <p>
      The share column answers a question classes ask often: in copper sulfate
      the four oxygens together outweigh the sulfur, and in water the oxygen
      carries almost nine tenths of the mass despite being one atom in three.
      Counting atoms and weighing them are different questions.
    </p>
    <h4>Where it stops</h4>
    <p>
      Standard atomic weights are averages over natural isotope abundances, so
      a sample enriched in one isotope will differ. Hydrates written with a dot
      need their parts entered separately, and charges on an ion are ignored,
      since an electron changes the mass by too little to show.
    </p>
  `,
  dev: `
    <h4>Using it</h4>
    <p>
      The Document control chooses which of the developer documents to read,
      and the arrows move through them in order. A link inside a document that
      points at another one opens it here.
    </p>
    <h4>What it is for</h4>
    <p>
      Reading how this project is built without leaving it: how the shell and
      the applications talk, what travels in the page address, how the
      filesystem works, and what a new application needs.
    </p>
    <h4>Where it stops</h4>
    <p>
      This is written for someone changing the code, not for a lesson. The help
      panel beside each application is the one written for teaching.
    </p>
    <p>
      The documents are read from the docs folder as the page needs them, which
      a browser allows only when the project is served over http. Opened from
      disk it says so, and the same text is in the files themselves.
    </p>
  `,
  constants: `
    <h4>Using it</h4>
    <p>
      Search by name, symbol or unit, or narrow to one group. The uncertainty
      column gives the standard uncertainty on the last digits shown, and reads
      exact where the value defines a unit.
    </p>
    <h4>What it is for</h4>
    <p>
      Looking up a value without leaving the lesson, and showing which constants
      are measured and which are fixed by definition.
    </p>
    <p>
      The groups are worth reading as a story: seven constants at the top are
      fixed by definition, and every other value in the table is measured
      against them. That is why the second, the metre and the kilogram no
      longer depend on any physical object.
    </p>
    <h4>Where it stops</h4>
    <p>
      This is a selection of about twenty five values, not the full CODATA set
      of several hundred. Anything needed at full published precision, or with
      its correlation to other constants, needs to use full sources.
    </p>
  `
};
