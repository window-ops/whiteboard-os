# Interface conventions

## Stylesheets

| File | Holds |
| --- | --- |
| `css/root.css` | The two brand colours and the adaptive pair built from them. |
| `css/windows-ui.css` | Windows UI, vendored, MIT. Buttons, inputs, the colour variables. |
| `css/winui-icons.css` | The icons8 Windows 10 icon font, embedded. |
| `css/tool.css` | Layout shared by the application pages. |
| `css/shell.css` | The launcher, the panes, the settings panel. |
| `css/custom.css` | Shell-only base rules. |
| `css/no-scrollbar.css` | Removes the scrollbar on the shell document. |
| `<app>/css/custom.css` | Whatever one application needs and nothing else. |

An application page loads the first four and its own. The order is fixed, since
each layer assumes the one before it.

## The tool page

```
body.tool
  .tool-bar        controls, one flexible row that wraps
  .tool-stage      the working area, scrolls
```

Inside the bar:

- `.tool-field` for a labelled input, `.is-tight` for a narrow one, `.is-wide`
  for a wide one and `.is-wide-select` for a menu that has to show long
  entries.
- `.tool-row` for a group of buttons. `.is-end` pushes a group to the right.
- `.tool-note` for a line of status text.

A row with nothing in it, or a row that has been put away with `hidden`, takes
no line of the bar. A status row is hidden while it has nothing to say, since
otherwise it costs a full line at every width.

`.tool-stage` takes `.is-centred` to centre its contents and `.is-fitted` to
drop the padding, which a canvas wants.

## Icons

The icon font is `icons10`, used as an empty element with the class:

```html
<i class="icons10-pencil" aria-hidden="true"></i>
```

A button carrying only an icon needs `title` and `aria-label` both. The list of
names is at the end of `css/winui-icons.css`.

## Theme

The shell resolves `system` against `prefers-color-scheme` and sets
`data-theme` to `light` or `dark` on the document element, then passes the
resolved value to each frame in its address. `WOSState.applyTheme()` applies it
as the frame loads.

Colours come from the variables in `windows-ui.css`, never as literals, with
one deliberate exception: the whiteboard's drawing surface stays white under
both themes, because the default stroke is dark and the white sheet is standard.

## Touch sound

`js/click.js` provides `WOSClick`. The sound is synthesised rather than
shipped as a file: a bandpassed noise burst at 1.5 kHz for the contact, and a
sine falling from 2600 Hz to 1150 Hz for the body, both decaying inside about
30 ms.

- `WOSClick.set(enabled)` turns it on or off.
- `WOSClick.play()` sounds it once.
- `WOSClick.enabled` reads the current setting.

The module binds one `pointerdown` listener on the document, in the capture
phase, so a control that stops the event still sounds, and on pointerdown
rather than click so the sound arrives with the finger. Buttons, tiles, dots,
links, selects, ranges, ticks, radios and the captions beside a tick or a radio
all sound. Typing fields and disabled controls stay silent, and so does a
caption beside a typing field.

The shell owns the setting and hands it to each frame, which is why a tool page
loads `click.js` and does nothing else about it. A frame greets the shell with
`sound-hello` as the module loads and applies whatever comes back.

The audio context is created on the first press, since a context built before
any gesture starts suspended.

## Motion

The paged launcher slides between category pages, and the Swiping animation
setting turns that into a jump. Both the arrows and the dots obey it, through
`scroll-behavior` in `css/shell.css` and the `behavior` passed to `scrollTo`.
Anything else that animates should be reachable from the same setting rather
than adding a second one.
