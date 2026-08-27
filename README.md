# Perhaps

Roll random tables written in plain text in your notes. Perchance-style
syntax, interactive rerolls, works offline and on mobile.

Write a table in a fenced code block:

````markdown
```perhaps
title
  Tavern Trouble

output
  [patron] {argues with|challenges|buys a round for} [patron] over {2-12} silver

patron
  a nervous scribe
  an off-duty guard ^2
  a {cheerful|sullen} dwarf prospector
```
````

In reading view the block becomes a live roller. Click any underlined part of
a result to reroll just that part.

## Features

- **Roll a table**: fuzzy picker over every table in your vault, result in a
  modal with in-place rerolls.
- **Roll a table into the note**: inserts a result at the cursor, for session
  logs.
- Live rollers for ```` ```perhaps ```` and ```` ```perchance ```` blocks in
  reading view, with reroll and copy.
- Tables reference each other across notes by title; the vault index stays
  current as files change.

## Syntax

A documented subset of Perchance list syntax plus dice notation: sections,
`[refs]`, weights `^2`, choices `{a|b}`, ranges `{2-12}`, dice `2d6+1`,
`selectUnique`/`selectMany`. The spec lives at
[script-wizards/perhaps](https://github.com/script-wizards/perhaps/blob/main/SPEC.md).
Try it in the browser at [perhaps.sh](https://perhaps.sh).

## Development

Plugin source lives here (`src/main.ts`). The table engine is
`@scriptwizards/perhaps-engine` from the
[perhaps monorepo](https://github.com/script-wizards/perhaps), pulled in as a
git dependency and bundled from source.

```bash
just install
just build
just vault-install path/to/vault
```

Engine and spec issues go to the monorepo; plugin issues go here.

## Manual install

Copy `main.js`, `manifest.json`, and `styles.css` from the
[latest release](https://github.com/script-wizards/perhaps-obsidian/releases)
into `<vault>/.obsidian/plugins/perhaps/`, then enable Perhaps under Settings,
Community plugins.
