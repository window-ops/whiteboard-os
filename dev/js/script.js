'use strict';

(() => {
  const select = document.getElementById('DOCUMENT');
  const previous = document.getElementById('PREVIOUS');
  const next = document.getElementById('NEXT');
  const source = document.getElementById('SOURCE');
  const sourceRow = document.getElementById('SOURCE-ROW');
  const stage = document.getElementById('STAGE');
  const page = document.getElementById('PAGE');

  const held = {};

  let current = '';

  const pageById = (id) => WOS_DEV_PAGES.filter((entry) => entry.id === id)[0] || null;

  /*
   * Rendering.
   *
   * The documents are files in this repository, but they are read at runtime
   * and never assigned to innerHTML: every piece of text becomes a text node,
   * which keeps the rule the rest of the project follows. The subset covered
   * is the one the documents use: headings, paragraphs, fenced code, lists,
   * pipe tables, and inline code, emphasis and links.
   */

  const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

  /* A link to another document opens it here rather than leaving the frame. */
  const linkTarget = (href) => {
    const cleaned = href.replace(/^\.\//, '').replace(/^\.\.\//, '');

    if (cleaned.endsWith('.md') === false) {
      return null;
    }

    return WOS_DEV_PAGES.filter((entry) => entry.path.endsWith(`/${cleaned}`))[0] || null;
  };

  const inline = (text, target) => {
    let last = 0;
    let match = null;

    INLINE.lastIndex = 0;

    while ((match = INLINE.exec(text)) !== null) {
      if (match.index > last) {
        target.append(document.createTextNode(text.substring(last, match.index)));
      }

      if (match[1] !== undefined) {
        const code = document.createElement('code');

        code.textContent = match[1];
        target.append(code);
      } else if (match[2] !== undefined) {
        const strong = document.createElement('strong');

        strong.textContent = match[2];
        target.append(strong);
      } else {
        const href = match[4];
        const destination = linkTarget(href);

        if (destination === null) {
          const link = document.createElement('a');

          link.href = href;
          link.textContent = match[3];
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          target.append(link);
        } else {
          const jump = document.createElement('button');

          jump.type = 'button';
          jump.className = 'dev-jump';
          jump.textContent = match[3];
          jump.addEventListener('click', () => {
            show(destination.id);
          });
          target.append(jump);
        }
      }

      last = match.index + match[0].length;
    }

    if (last < text.length) {
      target.append(document.createTextNode(text.substring(last)));
    }
  };

  const cells = (line) => line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  const isRule = (line) => /^\|[\s:|-]+\|$/.test(line.trim());

  const render = (text) => {
    const lines = text.split(/\r?\n/);
    const fragment = document.createDocumentFragment();

    let index = 0;

    const paragraph = (collected) => {
      const element = document.createElement('p');

      inline(collected.join(' '), element);
      fragment.append(element);
    };

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (trimmed === '') {
        index += 1;
        continue;
      }

      /* Fenced code. */
      if (trimmed.startsWith('```')) {
        const collected = [];

        index += 1;

        while (index < lines.length && lines[index].trim().startsWith('```') === false) {
          collected.push(lines[index]);
          index += 1;
        }

        const block = document.createElement('pre');
        const code = document.createElement('code');

        code.textContent = collected.join('\n');
        block.append(code);
        fragment.append(block);
        index += 1;
        continue;
      }

      /* Headings. */
      const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);

      if (heading !== null) {
        const level = Math.min(4, heading[1].length);
        const element = document.createElement(`h${level}`);

        inline(heading[2], element);
        fragment.append(element);
        index += 1;
        continue;
      }

      /* Pipe tables, where the second line is the rule. */
      if (trimmed.startsWith('|') && index + 1 < lines.length && isRule(lines[index + 1])) {
        const table = document.createElement('table');
        const head = document.createElement('thead');
        const body = document.createElement('tbody');
        const headRow = document.createElement('tr');

        table.className = 'dev-table';

        cells(trimmed).forEach((caption) => {
          const cell = document.createElement('th');

          cell.scope = 'col';
          inline(caption, cell);
          headRow.append(cell);
        });

        head.append(headRow);
        index += 2;

        while (index < lines.length && lines[index].trim().startsWith('|')) {
          const row = document.createElement('tr');

          cells(lines[index].trim()).forEach((value) => {
            const cell = document.createElement('td');

            inline(value, cell);
            row.append(cell);
          });

          body.append(row);
          index += 1;
        }

        table.append(head, body);
        fragment.append(table);
        continue;
      }

      /* Lists, with a continuation line folded into the item above it. */
      const bullet = /^([-*]|\d+\.)\s+(.*)$/.exec(trimmed);

      if (bullet !== null) {
        const ordered = bullet[1].endsWith('.');
        const list = document.createElement(ordered ? 'ol' : 'ul');

        list.className = 'dev-list';

        while (index < lines.length) {
          const entry = /^([-*]|\d+\.)\s+(.*)$/.exec(lines[index].trim());

          if (entry === null || lines[index].trim() === '') {
            break;
          }

          if (entry[1].endsWith('.') !== ordered) {
            break;
          }

          const collected = [entry[2]];

          index += 1;

          while (index < lines.length && /^\s+\S/.test(lines[index]) && /^\s*([-*]|\d+\.)\s/.test(lines[index]) === false) {
            collected.push(lines[index].trim());
            index += 1;
          }

          const item = document.createElement('li');

          inline(collected.join(' '), item);
          list.append(item);
        }

        fragment.append(list);
        continue;
      }

      /* Anything else is a paragraph, up to the next blank line. */
      const collected = [];

      while (index < lines.length && lines[index].trim() !== '' && lines[index].trim().startsWith('```') === false) {
        collected.push(lines[index].trim());
        index += 1;
      }

      paragraph(collected);
    }

    return fragment;
  };

  // Loading

  const message = (text) => {
    const note = document.createElement('p');

    note.className = 'dev-note';
    note.textContent = text;
    page.textContent = '';
    page.append(note);
  };

  const draw = (entry, text) => {
    page.textContent = '';
    page.append(render(text));
    source.textContent = entry.path.replace('../', '');
    sourceRow.hidden = false;
    stage.scrollTop = 0;
  };

  const load = (entry) => {
    if (held[entry.id] !== undefined) {
      draw(entry, held[entry.id]);
      return;
    }

    message('Reading the document.');

    /*
     * Opened from disk the browser refuses to read a file beside this one, so
     * the reader says where the text is instead of failing quietly.
     */
    fetch(entry.path).then((response) => {
      if (response.ok === false) {
        throw new Error(String(response.status));
      }

      return response.text();
    }).then((text) => {
      held[entry.id] = text;
      draw(entry, text);
    }).catch(() => {
      source.textContent = '';
      sourceRow.hidden = true;
      message(`This document could not be read. Served over http it is loaded from ${entry.path.replace('../', '')}; opened from disk the browser refuses to read it, and the same text is in that file beside the project.`);
    });
  };

  function show(id) {
    const entry = pageById(id) || WOS_DEV_PAGES[0];

    current = entry.id;
    select.value = entry.id;

    const position = WOS_DEV_PAGES.indexOf(entry);

    previous.disabled = position === 0;
    next.disabled = position === WOS_DEV_PAGES.length - 1;

    WOSState.write({ doc: entry.id === WOS_DEV_PAGES[0].id ? '' : entry.id });
    load(entry);
  }

  const step = (delta) => {
    const position = WOS_DEV_PAGES.indexOf(pageById(current));
    const target = Math.min(WOS_DEV_PAGES.length - 1, Math.max(0, position + delta));

    show(WOS_DEV_PAGES[target].id);
  };

  WOS_DEV_PAGES.forEach((entry) => {
    const option = document.createElement('option');

    option.value = entry.id;
    option.textContent = entry.name;
    select.append(option);
  });

  select.addEventListener('change', () => {
    show(select.value);
  });

  previous.addEventListener('click', () => {
    step(-1);
  });

  next.addEventListener('click', () => {
    step(1);
  });

  show(WOSState.read().doc || WOS_DEV_PAGES[0].id);
})();
