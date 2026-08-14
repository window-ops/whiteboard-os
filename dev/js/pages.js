'use strict';

/*
 * The documents this application reads, in the order they are worth reading.
 *
 * Each one is a file in the repository, so the text has one source and this
 * application is a reader rather than a second copy. A document added to docs/
 * is added here as well, and nowhere else.
 */

const WOS_DEV_PAGES = [
  {
    id: 'index',
    name: 'Documentation index',
    path: '../docs/README.md'
  },
  {
    id: 'readme',
    name: 'Project README',
    path: '../README.md'
  },
  {
    id: 'architecture',
    name: 'Architecture',
    path: '../docs/architecture.md'
  },
  {
    id: 'session-address',
    name: 'The session address',
    path: '../docs/session-address.md'
  },
  {
    id: 'filesystem',
    name: 'The filesystem',
    path: '../docs/filesystem.md'
  },
  {
    id: 'writing-an-application',
    name: 'Writing an application',
    path: '../docs/writing-an-application.md'
  },
  {
    id: 'interface',
    name: 'Interface conventions',
    path: '../docs/interface.md'
  },
  {
    id: 'security',
    name: 'Handling untrusted input',
    path: '../SECURITY.md'
  }
];
