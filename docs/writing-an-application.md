# Writing an application

An application is a page. It runs inside the shell, and it runs on its own.
Nothing in it may assume the shell is there.

## 1. The directory

```
<id>/index.html
<id>/js/script.js
<id>/css/custom.css
```

Data that is long and static, such as a table of elements, goes in a second
file beside the script, as `js/data.js`, so the logic stays readable.

## 2. The page

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Name</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/windows-ui.css">
    <link rel="stylesheet" href="../css/winui-icons.css">
    <link rel="stylesheet" href="../css/tool.css">
    <link rel="stylesheet" href="./css/custom.css">
  </head>
  <body class="tool">
    <div class="tool-bar"></div>
    <div class="tool-stage"></div>
    <script src="../js/tool-state.js"></script>
    <script src="../js/click.js"></script>
    <script src="./js/script.js"></script>
  </body>
</html>
```

The five stylesheets are always in that order. `tool-state.js` and `click.js`
are always present. Everything else depends on what the tool does.

## 3. The registry entry

Add an object to `WOS_APPS` in `js/apps.js`:

```js
{
  id: 'example',
  name: 'Example',
  category: 'maths',
  url: './example/index.html',
  description: 'One sentence, as it reads on the tile.'
}
```

The id is used in the address, in `WOS_DOCK`, in `WOS_HELP` and as the
directory name under `/documents`, so it is worth choosing once. The category
has to exist in `WOS_CATEGORIES`.

## 4. The help entry

Add an entry to `WOS_HELP` in `js/help.js`, keyed by the same id. Markup is
limited to `h4`, `p`, `ul`, `li`, `em` and `strong`, and the text is written
for the person teaching, in four parts: using it, what it is for, where it
stops, and saving where the tool saves. Technical material belongs in `docs/`
rather than here.

## 5. Keeping state

Read on load, write on change:

```js
const values = WOSState.read();
const size = WOSState.integer(values, 'size', 12);

const remember = () => {
  WOSState.write({ size: String(size) });
};
```

Keys are short, since they travel in the address and count against the quota.
A value equal to the default is left out. `theme` and `docs` are carried
through by `write` and must not be set by a tool.

## 6. Saving documents

A tool whose state is worth keeping adds one element to the bar:

```html
<div class="tool-row wos-docs" data-kind="example"></div>
```

and loads the supporting scripts:

```html
<script src="../js/wos-fs.js"></script>
<script src="../js/formats.js"></script>
<script src="../js/tool-state.js"></script>
<script src="../js/click.js"></script>
<script src="../js/storage.js"></script>
<script src="../js/tool-docs.js"></script>
<script src="./js/script.js"></script>
```

`js/download.js` joins the list where the tool offers a copy for the computer.
The whiteboard loads it, and loads `tool-docs.js` after its own engine, since
its hooks have to exist first.

`WOSDocs` then builds the save and open controls, and files go to
`/documents/example/`. Add the extension to `WOS_FORMATS` in `js/formats.js`
first, or the documents will be saved as `.wos`.

Nothing else is needed where the state is in the address, because what the tool
keeps there is exactly what needs saving. A tool with state outside the
address, as the whiteboard has, sets `window.WOSDocsHooks` with its own
`collect` and `apply` functions before `tool-docs.js` loads.

Where the project is opened from disk, `WOSStorage.available` is false, the
save row removes itself, and `WOSDocs` is `null`. A tool that reaches for the
filesystem elsewhere checks first:

```js
const files = () => (WOSDocs === null ? WOSStorage.files : WOSDocs.files());
```

## 7. Downloading a copy

`WOSDownload.locally(name, text, mime)` hands a file to the computer. Inside a
frame it asks the shell to start the download, since a download begun in a
frame is restricted in some browsers and fails silently. This is a different
act from saving: a download leaves the project entirely.

## 8. Rules the code follows

- Nothing that did not come from this repository reaches `innerHTML`. Build
  elements and set `textContent`.
- A control that cannot work removes itself rather than failing when pressed.
- A tool opened outside the shell still works, without saving.
- Comments explain why, since what is already in the code.

## 9. Before it is finished

- The tile reads correctly on the launcher, in its category.
- The help entry says where the tool stops being useful.
- The state survives a reload, and survives being opened as a second pane.
- The bar carries no empty row at a wide width.
- The tool follows the theme in both settings.
- Where it saves, the document appears in Files with the right extension.
