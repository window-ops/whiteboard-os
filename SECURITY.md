# Handling untrusted input

Everything this project stores can arrive from somewhere it does not control:
a pasted storage string, a shared address, a file another person wrote. These
are the rules the code follows.

## Nothing untrusted reaches innerHTML

Filenames, file contents, transcriptions, formulas, plotted expressions and
element data are written with `textContent` or as text nodes. The only
`innerHTML` assignments in the project use literals written here: the help
texts in `js/help.js` and the icon markup in the shells.

## Paths are cleaned before use

`WOSFS.sanitiseName` strips path separators, control characters and leading
dots, and caps a name at 120 characters. `normalise` resolves `..` before
cleaning and clamps at the root, so `/documents/../../escape.txt` becomes
`/escape.txt` rather than reaching outside the filesystem.

## Directory lookups cannot be tricked by a key

Directory entries come from parsed JSON, which can carry names such as
`__proto__` or `constructor`. `entryOf` checks `hasOwnProperty` and requires
the value to be a number inside the inode table, so an inherited property can
never be mistaken for an inode.

## Images are validated before adoption

`WOSFS.parse` and `WOSFS.open` check the magic string, the shape of the inode
table, that every block is a string, and that every block number a file refers
to exists. A malformed or foreign image is refused rather than half loaded.

## Imported strings are checked

The Storage section accepts either a base64 token this project wrote or a raw
address. It refuses anything that does not look like one before touching the
address, and the filesystem inside is then validated as above.

## Addresses are only ever fragments

The address is rewritten through `history.replaceState`, falling back to
assigning `location.hash`. Neither can navigate away from the current
document.

## Web View

The address bar accepts http and https only. Anything else fails to parse and
is refused, so a `javascript:` address cannot be loaded into the frame.
