# Hyphenation patterns

The syllable counter uses the TeX hyphenation patterns from the hyph-utf8
project (https://github.com/hyphenation/tex-hyphen). One file per language sits
in `patterns/`, and only the language in use is loaded.

Each file keeps the licence stated in its upstream header:

| Language | Code | Patterns | Licence |
| --- | --- | --- | --- |
| English (British) | `en-gb` | 8527 | MIT |
| English (American) | `en-us` | 4938 | Verbatim copying permitted |
| Romanian | `ro` | 647 | No licence stated |
| German | `de-1996` | 36709 | MIT |
| French | `fr` | 1216 | MIT |
| Spanish | `es` | 4694 | MIT/X11 |
| Italian | `it` | 384 | LPPL version 1.3 |
| Portuguese | `pt` | 427 | BSD 3-clause licence |
| Dutch | `nl` | 12724 | MIT |
| Polish | `pl` | 4053 | MIT |
| Czech | `cs` | 3636 | GPL version 2 |
| Slovak | `sk` | 2467 | MIT |
| Hungarian | `hu` | 62851 | MPL version 1.1 |
| Turkish | `tr` | 597 | LPPL version 1 |
| Swedish | `sv` | 4693 | LPPL version 1.2 |
| Danish | `da` | 1144 | LPPL version 1.3 |
| Norwegian Bokmal | `nb` | 27448 | Verbatim copying permitted |
| Finnish | `fi` | 286 | Free distribution permitted |
| Greek | `el-monoton` | 573 | LPPL |
| Russian | `ru` | 7021 | LPPL version 1.2 |
| Ukrainian | `uk` | 4565 | MIT |
| Croatian | `hr` | 1475 | LPPL version 1 |
| Slovene | `sl` | 1068 | LPPL version 1 |

Two entries need attention before this project is redistributed:

- The Romanian patterns (Adrian Rezus, 1995-1996) carry no licence statement in
  the upstream file. They are included here so the feature works, and they can
  be removed by deleting `patterns/ro.js` and the matching entry in
  `js/languages.js`.
- The Hungarian patterns are MPL 1.1, which is not compatible with GPL-3.0 in
  one direction. They can be removed the same way.

Hyphenation points are a good approximation of syllable boundaries and are not
identical to them. The counter says so in its help text.
