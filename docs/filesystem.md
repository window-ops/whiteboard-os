# The filesystem

`js/wos-fs.js` implements a small filesystem in memory, with inodes, fixed
blocks and a superblock. It exists so that every application can save into one
place that the Files application can list, and so that the whole of it can be
written as a single string.

## Layout of an image

```
{
  superblock: { magic: "WOSFS", version: 1, blockSize: 512, created, modified },
  inodes:     [null, { mode: "d", entries: { name: inode }, ctime, mtime }, ...],
  blocks:     ["...", "..."],
  freeInodes: [],
  freeBlocks: []
}
```

Inode 0 is always `null` and inode 1 is always the root directory. A file inode
carries `mode: "f"`, a list of block numbers, and a size. A block holds up to
512 characters of the file's text, and a released block returns to
`freeBlocks` for the next write.

Everything stored is text. A tool with binary data encodes it first, which is
why an exported PNG costs more room than the image it came from.

## Module functions

| Call | Returns |
| --- | --- |
| `WOSFS.create()` | An empty filesystem. |
| `WOSFS.parse(token)` | A filesystem from an uncompressed token, or `null`. |
| `WOSFS.open(token)` | A promise of a filesystem from any token, or `null`. |
| `WOSFS.pack(text)` | A promise of a packed token. |
| `WOSFS.unpack(token)` | A promise of the text inside. |
| `WOSFS.encode(text)` | base64url, without padding. |
| `WOSFS.decode(token)` | The text back. |
| `WOSFS.canPack()` | Whether this browser has compression streams. |
| `WOSFS.sanitiseName(name)` | A name safe to store. |

Constants: `BLOCK_SIZE` 512, `ADDRESS_QUOTA` 512 KB, `LOCAL_QUOTA` 4 MB,
`MAGIC` `WOSFS`, `VERSION` 1.

## Instance methods

| Call | Effect |
| --- | --- |
| `mkdir(path)` | Creates a directory and every parent it needs. |
| `write(path, text)` | Writes a file, creating parents. Throws where the quota would be passed. |
| `read(path)` | The file's text, or `null`. |
| `unlink(path)` | Removes a file, or an empty directory. Throws on a directory with contents. |
| `rename(from, to)` | Copies the contents across and removes the original. |
| `exists(path)` | Whether anything is there. |
| `stat(path)` | `{ inode, mode, size, ctime, mtime }`, or `null`. |
| `list(path)` | One directory, sorted by name. |
| `walk(path, into)` | Every entry under a path, each with its full `path`. Pass `false` to stay at one level. |
| `usage()` | The figures below. |
| `image()` | The plain object above. |
| `toString()` | The image as an uncompressed token. |
| `pack()` | A promise of the packed token. |
| `adopt(other)` | Takes on another image in place, without notifying. |
| `subscribe(listener)` | Registers a listener, and returns a function that removes it. |
| `touched()` | Marks a change and calls every listener. |
| `projectedLength(path, text)` | What the encoded image would measure after a write. |

Properties: `quota`, the ceiling in characters, and `reserve`, the characters
the rest of the address already spends.

`usage()` gives `files`, `directories`, `blocks`, `bytes`, `allocated`, `free`,
`quota`, `encoded`, `reserve`, `remaining` and `share`. The quota is checked
against `encoded`, which is the length of the encoded image plus the reserve,
because the whole string is what has to fit.

## Packing

`pack` uses the browser's own gzip through `CompressionStream`, and prefixes
the result with `z`. Where the streams are missing, the image travels
uncompressed with the prefix `r`. `unpack` reads either prefix, and treats a
token with neither as a bare base64url image, which is what older sessions
carry.

Compression here is weaker than a dedicated archiver would be, and for JSON
that repeats key names in every inode the difference is real. It is used
anyway because it needs no dependency and no vendored decoder.

## The two backends

| Backend | Ceiling | Kept in | Travels |
| --- | --- | --- | --- |
| `address` | 512 KB | the page fragment | with a copied or bookmarked link |
| `local` | 4 MB | `whiteboard-os/filesystem` | not at all |

Moving into local storage is always possible. Moving back needs the filesystem
to fit in an address, so where it does not, the Storage section lists the files
by size and takes the change once enough has been removed. The move deletes the
local copy, and is confirmed before anything is touched.

Neither place is a backup. An address can be lost and local storage is cleared
with the browsing data. Settings offers an export, as a string or as a
`.wosdata` file, and that is the only thing that survives either.

## Where documents go

A saved document goes to `/documents/<kind>/<name>.<extension>`, where the
extension comes from `WOS_FORMATS` in `js/formats.js`. Exports from the
whiteboard go to a separate folder beside the documents.

Adding a kind means adding one line to `WOS_FORMATS`. The prefix `w` marks the
family, as `.wbd` for a whiteboard drawing.

## Validation

An image can arrive from a pasted string, so `parse` and `open` check it before
trusting it: the magic string, the shape of the inode table, that every block
is a string, and that every block number a file refers to exists. Directory
lookups go through `entryOf`, which requires an own property and a number
inside the inode table, so a name such as `__proto__` in parsed JSON cannot be
mistaken for an inode. The full set of rules is in
[SECURITY.md](../SECURITY.md).
