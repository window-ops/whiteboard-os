'use strict';

/*
 * A small filesystem that lives in a string.
 *
 * The layout borrows its shape from ext-family filesystems: a superblock, a
 * table of inodes, and a pool of fixed-size data blocks. Directories are
 * inodes whose payload is a name-to-inode map, files are inodes holding a list
 * of block numbers, and freed inodes and blocks go on free lists for reuse.
 * The whole image serialises to JSON and then to URL-safe base64, which is
 * what travels in the page address.
 *
 * Inode 1 is the root directory, as it is on ext4. Inode 0 stays unused so a
 * zero can keep meaning "nothing".
 */

const WOSFS = (() => {
  const MAGIC = 'WOSFS';
  const VERSION = 1;
  const BLOCK_SIZE = 512;
  const ROOT = 1;
  const ADDRESS_QUOTA = 512 * 1024;
  const LOCAL_QUOTA = 4 * 1024 * 1024;
  const RAW_PREFIX = 'r';
  const PACKED_PREFIX = 'z';

  const encode = (text) => {
    const bytes = new TextEncoder().encode(text);
    let binary = '';

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary).split('+').join('-').split('/').join('_').split('=').join('');
  };

  const decode = (token) => {
    const padded = token.split('-').join('+').split('_').join('/');
    const binary = atob(padded + '==='.slice((padded.length + 3) % 4));
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new TextDecoder().decode(bytes);
  };

  const bytesToBase64 = (bytes) => {
    let binary = '';

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary).split('+').join('-').split('/').join('_').split('=').join('');
  };

  const base64ToBytes = (token) => {
    const padded = token.split('-').join('+').split('_').join('/');
    const binary = atob(padded + '==='.slice((padded.length + 3) % 4));
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  };

  /*
   * Compression uses the browser's own gzip, which needs no dependency and no
   * vendored decoder. It is weaker than xz on the same input, and for the JSON
   * this filesystem produces, which repeats key names in every inode, the
   * difference matters far less than the fact that it is already there. Where
   * the streams are missing the image travels uncompressed.
   */
  const canPack = () => typeof CompressionStream === 'function' && typeof Response === 'function';

  const pack = async (text) => {
    if (canPack() === false) {
      return RAW_PREFIX + encode(text);
    }

    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();

    return PACKED_PREFIX + bytesToBase64(new Uint8Array(buffer));
  };

  const unpack = async (token) => {
    if (token.charAt(0) === RAW_PREFIX) {
      return decode(token.substring(1));
    }

    if (token.charAt(0) !== PACKED_PREFIX) {
      return decode(token);
    }

    if (typeof DecompressionStream !== 'function') {
      throw new Error('this browser cannot read a compressed image');
    }

    const bytes = base64ToBytes(token.substring(1));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));

    return new Response(stream).text();
  };

  /*
   * A name that arrives from a person, a pasted image or another application
   * is cleaned before it becomes part of a path: no separators, no control
   * characters, no leading dots that would hide an entry, and a fixed ceiling
   * on length.
   */
  const sanitiseName = (name) => {
    const cleaned = String(name)
      .split('/').join('-')
      .split('\\').join('-')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/^\.+/, '')
      .trim();

    return cleaned.substring(0, 120);
  };

  const normalise = (path) => {
    const parts = String(path).split('/').filter((part) => part !== '' && part !== '.');
    const stack = [];

    parts.forEach((part) => {
      if (part === '..') {
        stack.pop();
        return;
      }

      const cleaned = sanitiseName(part);

      if (cleaned !== '') {
        stack.push(cleaned);
      }
    });

    return stack;
  };

  const now = () => Date.now();

  class FileSystem {
    constructor(image) {
      this.onChange = null;
      /* More than one part of the system watches for writes: the shell repacks
         the address, and any open Files window redraws its listing. */
      this.listeners = [];
      /* Characters the rest of the address already spends: settings, the open
         session, per-application state. The quota covers the whole string. */
      this.reserve = 0;
      this.quota = ADDRESS_QUOTA;

      if (image === undefined) {
        this.superblock = { magic: MAGIC, version: VERSION, blockSize: BLOCK_SIZE, created: now(), modified: now() };
        this.inodes = [null, { mode: 'd', entries: {}, ctime: now(), mtime: now() }];
        this.blocks = [];
        this.freeInodes = [];
        this.freeBlocks = [];
        return;
      }

      this.superblock = image.superblock;
      this.inodes = image.inodes;
      this.blocks = image.blocks;
      this.freeInodes = image.freeInodes || [];
      this.freeBlocks = image.freeBlocks || [];
    }

    subscribe(listener) {
      this.listeners.push(listener);

      return () => {
        this.listeners = this.listeners.filter((entry) => entry !== listener);
      };
    }

    touched() {
      this.superblock.modified = now();

      if (typeof this.onChange === 'function') {
        this.onChange(this);
      }

      this.listeners.slice().forEach((listener) => {
        try {
          listener(this);
        } catch (error) {
          /* A window that has gone away must not stop the others. */
        }
      });
    }

    allocateInode(inode) {
      const reused = this.freeInodes.pop();

      if (reused !== undefined) {
        this.inodes[reused] = inode;
        return reused;
      }

      this.inodes.push(inode);

      return this.inodes.length - 1;
    }

    allocateBlock(text) {
      const reused = this.freeBlocks.pop();

      if (reused !== undefined) {
        this.blocks[reused] = text;
        return reused;
      }

      this.blocks.push(text);

      return this.blocks.length - 1;
    }

    releaseBlocks(numbers) {
      numbers.forEach((number) => {
        this.blocks[number] = '';
        this.freeBlocks.push(number);
      });
    }

    entryOf(node, name) {
      if (node === null || node === undefined || node.mode !== 'd') {
        return 0;
      }

      if (Object.prototype.hasOwnProperty.call(node.entries, name) === false) {
        return 0;
      }

      const value = node.entries[name];

      return typeof value === 'number' && value > 0 && value < this.inodes.length ? value : 0;
    }

    resolve(parts) {
      let inode = ROOT;

      for (let i = 0; i < parts.length; i++) {
        inode = this.entryOf(this.inodes[inode], parts[i]);

        if (inode === 0) {
          return 0;
        }
      }

      return inode;
    }

    parentOf(parts) {
      return this.resolve(parts.slice(0, -1));
    }

    exists(path) {
      return this.resolve(normalise(path)) !== 0;
    }

    mkdir(path) {
      const parts = normalise(path);
      let inode = ROOT;

      parts.forEach((part) => {
        const node = this.inodes[inode];

        if (node.mode !== 'd') {
          throw new Error(`${part} sits under a file`);
        }

        if (this.entryOf(node, part) === 0) {
          node.entries[part] = this.allocateInode({ mode: 'd', entries: {}, ctime: now(), mtime: now() });
          node.mtime = now();
        }

        inode = node.entries[part];
      });

      this.touched();

      return inode;
    }

    write(path, text) {
      const parts = normalise(path);

      if (parts.length === 0) {
        throw new Error('a file needs a name');
      }

      /*
       * The limit is on the encoded string, since that is what has to fit in
       * the address, so the check measures an image with this write applied
       * rather than the raw bytes of the file.
       */
      const projected = this.projectedLength(path, String(text));

      if (projected > this.quota) {
        throw new Error(`this would need ${Math.ceil(projected / 1024)} KB of the ${Math.round(this.quota / 1024)} KB available`);
      }

      const name = parts[parts.length - 1];

      if (parts.length > 1) {
        this.mkdir(parts.slice(0, -1).join('/'));
      }

      const parent = this.inodes[this.parentOf(parts)];
      const content = String(text);
      const numbers = [];

      for (let i = 0; i < content.length; i += BLOCK_SIZE) {
        numbers.push(this.allocateBlock(content.substring(i, i + BLOCK_SIZE)));
      }

      const existing = this.entryOf(parent, name) || undefined;

      if (existing !== undefined) {
        const node = this.inodes[existing];

        if (node.mode === 'd') {
          throw new Error(`${name} is a directory`);
        }

        this.releaseBlocks(node.blocks);
        node.blocks = numbers;
        node.size = content.length;
        node.mtime = now();
      } else {
        parent.entries[name] = this.allocateInode({
          mode: 'f',
          blocks: numbers,
          size: content.length,
          ctime: now(),
          mtime: now()
        });
        parent.mtime = now();
      }

      this.touched();

      return content.length;
    }

    read(path) {
      const inode = this.resolve(normalise(path));

      if (inode === 0) {
        return null;
      }

      const node = this.inodes[inode];

      if (node.mode !== 'f') {
        return null;
      }

      return node.blocks.map((number) => this.blocks[number]).join('');
    }

    unlink(path) {
      const parts = normalise(path);
      const parent = this.inodes[this.parentOf(parts)];

      if (parent === undefined || parent === null) {
        return false;
      }

      const name = parts[parts.length - 1];
      const inode = this.entryOf(parent, name);

      if (inode === 0) {
        return false;
      }

      const node = this.inodes[inode];

      if (node.mode === 'd' && Object.keys(node.entries).length > 0) {
        throw new Error(`${name} is not empty`);
      }

      if (node.mode === 'f') {
        this.releaseBlocks(node.blocks);
      }

      this.inodes[inode] = null;
      this.freeInodes.push(inode);
      delete parent.entries[name];
      parent.mtime = now();
      this.touched();

      return true;
    }

    rename(from, to) {
      const content = this.read(from);

      if (content === null) {
        return false;
      }

      this.write(to, content);
      this.unlink(from);

      return true;
    }

    stat(path) {
      const inode = this.resolve(normalise(path));

      if (inode === 0) {
        return null;
      }

      const node = this.inodes[inode];

      return {
        inode,
        mode: node.mode,
        size: node.mode === 'f' ? node.size : Object.keys(node.entries).length,
        ctime: node.ctime,
        mtime: node.mtime
      };
    }

    list(path) {
      const inode = this.resolve(normalise(path || '/'));

      if (inode === 0) {
        return [];
      }

      const node = this.inodes[inode];

      if (node.mode !== 'd') {
        return [];
      }

      return Object.keys(node.entries).sort().filter((name) => this.entryOf(node, name) !== 0).map((name) => {
        const child = this.inodes[this.entryOf(node, name)];

        return {
          name,
          mode: child.mode,
          size: child.mode === 'f' ? child.size : Object.keys(child.entries).length,
          mtime: child.mtime
        };
      });
    }

    walk(path, into) {
      const base = path || '/';
      const found = [];

      this.list(base).forEach((entry) => {
        const full = `${base === '/' ? '' : base}/${entry.name}`;

        found.push(Object.assign({ path: full }, entry));

        if (entry.mode === 'd' && into !== false) {
          this.walk(full, into).forEach((child) => {
            found.push(child);
          });
        }
      });

      return found;
    }

    /* Length of the encoded image, which is what the quota counts. */
    encodedLength() {
      return this.toString().length;
    }

    projectedLength(path, text) {
      const held = this.exists(path) ? this.read(path) : null;
      const parts = normalise(path);
      const name = parts[parts.length - 1];
      const overhead = JSON.stringify({ mode: 'f', blocks: [], size: 0, ctime: 0, mtime: 0 }).length + name.length + 8;
      const blocks = Math.ceil(String(text).length / BLOCK_SIZE) - (held === null ? 0 : Math.ceil(held.length / BLOCK_SIZE));
      const delta = String(text).length - (held === null ? 0 : held.length) + (held === null ? overhead : 0) + Math.max(0, blocks) * 4;

      /* Base64 spends four characters on every three bytes. */
      return Math.ceil((this.encodedLength() + delta * 4 / 3)) + this.reserve;
    }

    usage() {
      const used = this.blocks.length - this.freeBlocks.length;
      const files = this.inodes.filter((node) => node !== null && node.mode === 'f');
      const bytes = files.reduce((total, node) => total + (node.size || 0), 0);
      const encoded = this.encodedLength() + this.reserve;

      return {
        files: files.length,
        directories: this.inodes.filter((node) => node !== null && node.mode === 'd').length,
        blocks: used,
        bytes,
        allocated: used * BLOCK_SIZE,
        free: this.freeBlocks.length,
        quota: this.quota,
        encoded,
        reserve: this.reserve,
        remaining: Math.max(0, this.quota - encoded),
        share: encoded / this.quota
      };
    }

    image() {
      return {
        superblock: this.superblock,
        inodes: this.inodes,
        blocks: this.blocks,
        freeInodes: this.freeInodes,
        freeBlocks: this.freeBlocks
      };
    }

    toString() {
      return encode(JSON.stringify(this.image()));
    }

    pack() {
      return pack(JSON.stringify(this.image()));
    }

    adopt(other) {
      this.superblock = other.superblock;
      this.inodes = other.inodes;
      this.blocks = other.blocks;
      this.freeInodes = other.freeInodes;
      this.freeBlocks = other.freeBlocks;
    }
  }

  const create = () => new FileSystem();

  /*
   * An image can arrive from a pasted string, so it is checked before it is
   * trusted: the right magic, the shapes the code expects, and block contents
   * that really are text.
   */
  const valid = (image) => {
    if (image === null || typeof image !== 'object') {
      return false;
    }

    if (image.superblock === null || typeof image.superblock !== 'object' || image.superblock.magic !== MAGIC) {
      return false;
    }

    if (Array.isArray(image.inodes) === false || Array.isArray(image.blocks) === false) {
      return false;
    }

    if (image.blocks.some((block) => typeof block !== 'string')) {
      return false;
    }

    if (image.inodes[0] !== null || image.inodes.length < 2) {
      return false;
    }

    return image.inodes.every((node, position) => {
      if (position === 0 || node === null) {
        return true;
      }

      if (typeof node !== 'object') {
        return false;
      }

      if (node.mode === 'd') {
        return node.entries !== null && typeof node.entries === 'object' && Array.isArray(node.entries) === false;
      }

      return node.mode === 'f' && Array.isArray(node.blocks)
        && node.blocks.every((number) => typeof number === 'number' && number >= 0 && number < image.blocks.length);
    });
  };

  const parse = (token) => {
    try {
      const image = JSON.parse(decode(token));

      return valid(image) ? new FileSystem(image) : null;
    } catch (error) {
      return null;
    }
  };

  const open = async (token) => {
    try {
      const image = JSON.parse(await unpack(token));

      return valid(image) ? new FileSystem(image) : null;
    } catch (error) {
      return null;
    }
  };

  return {
    create,
    parse,
    open,
    pack,
    unpack,
    encode,
    decode,
    canPack,
    sanitiseName,
    BLOCK_SIZE,
    ADDRESS_QUOTA,
    LOCAL_QUOTA,
    MAGIC,
    VERSION
  };
})();
