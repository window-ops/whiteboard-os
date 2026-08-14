# The session address

Everything the shell knows about a session lives in the fragment of the page
address, or in local storage when the person has chosen that. Nothing is kept
on a server, and there is no server.

The fragment is a list of `key=value` pairs joined with `&`. It is written
through `history.replaceState`, which a `file://` page refuses, so assigning
`window.location.hash` is the fallback.

## Shell parameters

A parameter is written only when it differs from its default, so a plain
session leaves a short address.

| Key | Values | Default | Meaning |
| --- | --- | --- | --- |
| `theme` | `system`, `light`, `dark` | `system` | Appearance. `system` follows the operating system. |
| `home` | `paged`, `single` | `paged` | Shape of the launcher. |
| `swipe` | `on`, `off` | `on` | Whether a category page change slides or jumps. |
| `sound` | `on`, `off` | `off` | Whether a press makes a click. |
| `dock` | `sticky`, `bottom`, `off` | `sticky` | Where the quick access bar sits. |
| `backend` | `address`, `local` | `address` | Where the filesystem is kept. |
| `fs` | packed image | absent | The filesystem, written only while the backend is the address. |
| `apps` | ids joined with `,` | absent | Open applications, at most two. |
| `layout` | `vertical`, `horizontal` | `vertical` | Split direction, written only with two panes. |
| `ratio` | `0.200` to `0.800` | `0.500` | Share of the split taken by the first pane, written only with two panes. |
| `s.<id>` | encoded state | absent | The state of one open application, URI-encoded. |

An unknown value is ignored and the default stands. An id in `apps` that is
not in the registry is dropped, and the list is cut at two.

## Local storage

Two keys are used, both under the `whiteboard-os/` prefix.

| Key | Holds |
| --- | --- |
| `whiteboard-os/settings` | The shell settings as JSON, written only while the backend is `local`. |
| `whiteboard-os/filesystem` | The packed filesystem, written only while the backend is `local`. |

While the backend is `local` the address carries `backend=local` and nothing
else of the settings, so that a fresh tab reading the URL before it reads
local storage still knows where to look. Moving back to the address deletes
both keys, which is a deletion of the copy on that machine, so it is confirmed
first.

On restore, the settings key wins where it exists. Where it does not, the
address is read.

## What a tool writes

The shell opens a frame at `<url>#<state>&theme=<resolved theme>`. The theme
passed in is always `light` or `dark`, never `system`, since the frame has no
setting of its own to resolve.

`WOSState` in `js/tool-state.js` handles this from the tool's side.

- `WOSState.read()` returns the fragment as an object, with each value
  decoded.
- `WOSState.write(values)` replaces the fragment with the pairs given, and
  carries `theme` and `docs` through untouched. A tool writing its own state
  therefore cannot drop the two keys that belong to the system.
- `WOSState.number(values, key, fallback)` and `WOSState.integer(...)` read a
  value that has to be numeric.
- `WOSState.files()` returns the shell's filesystem where there is one, and
  `null` otherwise.

`WOSState.applyTheme()` runs as the script loads, so the frame takes its
appearance before anything is drawn.

The shell reads the fragment back out of each frame, drops `theme`, and stores
what is left as `s.<id>`. A tool that keeps its whole state in its own address
needs no further work to be restored with the session.

## Quotas and the reserve

The address has to hold the settings, the open session and the filesystem
together. Before packing, the shell sets `files.reserve` to the length of
everything else it is about to write, and the filesystem quota covers the whole
string. See [the filesystem](filesystem.md) for the figures.
