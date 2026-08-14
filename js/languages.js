'use strict';

/*
 * Languages offered by the syllable counter. Each entry needs a matching file
 * at count/patterns/<code>.js, which is loaded the first time it is chosen.
 * Licences are recorded in count/PATTERNS.md.
 */

const WOS_LANGUAGES = [
  { code: 'en-gb', name: "English (British)" },
  { code: 'en-us', name: "English (American)" },
  { code: 'ro', name: "Romanian" },
  { code: 'de-1996', name: "German" },
  { code: 'fr', name: "French" },
  { code: 'es', name: "Spanish" },
  { code: 'it', name: "Italian" },
  { code: 'pt', name: "Portuguese" },
  { code: 'nl', name: "Dutch" },
  { code: 'pl', name: "Polish" },
  { code: 'cs', name: "Czech" },
  { code: 'sk', name: "Slovak" },
  { code: 'hu', name: "Hungarian" },
  { code: 'tr', name: "Turkish" },
  { code: 'sv', name: "Swedish" },
  { code: 'da', name: "Danish" },
  { code: 'nb', name: "Norwegian Bokmal" },
  { code: 'fi', name: "Finnish" },
  { code: 'el-monoton', name: "Greek" },
  { code: 'ru', name: "Russian" },
  { code: 'uk', name: "Ukrainian" },
  { code: 'hr', name: "Croatian" },
  { code: 'sl', name: "Slovene" }
];
