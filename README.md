# Whiteboard OS

A set of classroom tools that run in a browser, held together by a shell that
opens them one or two at a time.

## Running it

Open `index.html` in a browser. Everything works except saving.

For the whole system, serve the directory over http, from the directory that
holds `index.html`:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/`.

Saving needs the http case. Opened from disk, a frame has an opaque origin, the
applications cannot share a filesystem, and every save control removes itself
rather than failing when pressed.

## What is in it

Twenty five applications across seven categories: a whiteboard, a web view, a
map, a timer, dice, a group shuffler, a QR code generator, a function plotter,
a unit converter, a calculator, a periodic table, a molar mass tool, physical
constants, a text counter, a cloze builder, a scrambler, an IPA keyboard, a
colour wheel, a metronome, a tuning tone, a staff, an isometric city, water
ambience, a file browser, and the developer notes.

The shell holds the settings, the open applications and the saved files. All
three travel in the page address, so a session can be copied as a link, or they
move into local storage when the address is too small for them.

## Layout

```
index.html            the shell
js/                   shared scripts
css/                  shared stylesheets
docs/                 developer documentation
<application>/        one directory per application
```

## Documentation

Developer documentation is in [docs/](docs/README.md) and is also readable
inside the system, through the Developer Notes application under the System
category:

- [Architecture](docs/architecture.md)
- [The session address](docs/session-address.md)
- [The filesystem](docs/filesystem.md)
- [Writing an application](docs/writing-an-application.md)
- [Interface conventions](docs/interface.md)
- [Handling untrusted input](SECURITY.md)

The help panel beside each application is written for the person teaching and
carries nothing from the documents above.

## Third party material

- Windows UI, by Vivek Verma, MIT. `css/windows-ui.css`.
- icons8 Windows 10 icon font, embedded in `css/winui-icons.css`.
- Leaflet, in `map/leaflet`, with its attribution beside it.
- IsoCity, in `isocity`, with its licence beside it.
- The QR encoder, in `qr/js/qrcode.js`, with its licence beside it.
- Hyphenation patterns, in `count/patterns`, described in `count/PATTERNS.md`.
- Water recordings, in `water-ambience/sounds`.
