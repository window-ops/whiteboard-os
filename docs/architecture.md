# Architecture

## Shape of the repository

```
index.html            the shell
js/                   shared scripts
css/                  shared stylesheets
docs/                 developer documentation
<application>/        one directory per application
  index.html
  js/script.js
  css/custom.css
```

An application is a complete page of its own. It runs in a frame the shell
creates, and it also runs when opened directly, with the parts that need the
shell removed at load time.

## The shell

`js/script.js` builds the launcher, opens applications into panes, holds the
settings and owns the filesystem. It is the only top-level document, which
matters for two things a frame cannot do reliably: starting a download and
writing the page address.

The shell keeps at most two panes, side by side or one above the other. The
divider between them writes a ratio, clamped between 0.2 and 0.8.

## The launcher

`js/apps.js` holds three lists. `WOS_CATEGORIES` gives the categories and their
order, `WOS_APPS` the applications, and `WOS_DOCK` the ids that sit in the
quick access bar. A category with no applications is left out, so a batch of
new tools can be added by appending to `WOS_APPS` alone.

The home screen has two shapes. Paged puts one category on each page of a
scroll-snapping strip, with arrows and dots under it. Single stacks every
category on one scrolling page. The paged strip reads its position once the
scroll has come to rest, since a sliding scroll passes over every page between
the two and the dots would otherwise blink through the categories on the way.

## Frames and the message channel

Applications share a filesystem, which needs the shell and its frames to be
able to talk. Served over http they share an origin and can. Opened from disk
they cannot: a `file://` frame has an opaque origin and property access on the
parent throws. Saving is unavailable from disk, and every control that offers
it removes itself rather than failing later.

Every message in both directions carries `wos: true`. The shell ignores any
message from a window that is not one of its panes.

### Frame to shell

| Type | Carries | Effect |
| --- | --- | --- |
| `hello` | nothing | The shell answers with `image`, `quota` and `backend`. |
| `sound-hello` | nothing | The shell answers with `sound`. |
| `op` | `method`, `args` | Applies `write`, `mkdir`, `unlink` or `rename` to the real filesystem, then broadcasts the new image. |
| `download` | `name`, `text`, `mime` | The shell starts the download on the frame's behalf. |

Any other `method` on an `op` is refused.

### Shell to frame

| Type | Carries | Effect |
| --- | --- | --- |
| `image` | `image`, `backend` | The frame adopts the image into its mirror. |
| `quota` | `quota` | The ceiling the mirror checks writes against. |
| `backend` | `backend` | Where the filesystem currently lives. |
| `sound` | `enabled` | Whether a press makes a click. |

Two greetings exist rather than one because they are answered at different
cost. `hello` brings back the whole filesystem image, and the touch sound has
no reason to ask for that.

## Shared scripts

| File | Provides | Loaded by |
| --- | --- | --- |
| `js/wos-fs.js` | `WOSFS`, the filesystem | shell, and any tool that saves |
| `js/formats.js` | `WOS_FORMATS`, `WOSFormats` | shell, and any tool that saves |
| `js/download.js` | `WOSDownload` | shell, and any tool that downloads |
| `js/tool-state.js` | `WOSState` | every tool |
| `js/click.js` | `WOSClick` | shell and every tool |
| `js/storage.js` | `WOSStorage`, `WOSFiles` | any tool that saves |
| `js/tool-docs.js` | `WOSDocs` | any tool with a save row |
| `js/apps.js` | the registry | shell |
| `js/help.js` | `WOS_HELP` | shell |

Order matters in three places: `wos-fs.js` before `storage.js`, `formats.js`
and `storage.js` before `tool-docs.js`, and `tool-state.js` before both
`tool-docs.js` and the application's own script.

## The filesystem, seen from both sides

The shell holds the real filesystem and exposes it as `window.WOSFiles`. A
frame holds a mirror of it, writes to the mirror directly so its interface
updates at once, and posts the same operation to the shell. The shell applies
it and sends the new image back to every frame. A write the shell refuses,
because it would pass the quota, leaves the mirror ahead of the truth until
the next image arrives and corrects it.

`files.subscribe(listener)` is how anything watches for writes. The shell uses
it to repack the address; an open Files window uses it to redraw.
