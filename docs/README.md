# Developer documentation

These documents describe how Whiteboard OS is put together. They are written
for someone changing the code. The help panel inside the shell is written for
the person using an application in front of a class, and carries nothing from
here.

The same text is readable inside the system itself, through the Developer Notes
application under the System category.

## Documents

- [Architecture](architecture.md). The shell, the frames, and the message
  channel between them.
- [The session address](session-address.md). Every parameter the shell and a
  tool write, where each one is kept, and what happens on restore.
- [The filesystem](filesystem.md). WOSFS, the image format, the two backends
  and the quotas.
- [Writing an application](writing-an-application.md). What a new tool needs,
  in the order it needs it.
- [Interface conventions](interface.md). Stylesheets, the tool bar, the icon
  font, the theme and the touch sound.

## Elsewhere in the repository

- [SECURITY.md](../SECURITY.md). The rules the code follows for input it did
  not write.
- `js/`. Shared scripts, each with a header comment that states its purpose.
- `TODO.md`. Work that is known and not yet done.

## Rules the documentation follows

A document describes what the code does now. Where behaviour is a choice
rather than a necessity, the reason is given, because the reason is what a
later change has to argue with.
