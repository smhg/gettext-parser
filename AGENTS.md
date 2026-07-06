# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Commands

- **Test**: `npm test` (uses the built-in `node --test` runner)
- **Run a single test file**: `node --test test/po-parser-test.js`
- **Run tests matching a name**: `node --test --test-name-pattern="charset" test/po-parser-test.js`
- **Lint**: `npm run lint` (ESLint over `lib/`, `test/`, `index.js`)
- **Regenerate MO fixtures**: `npm run test-generate-mo` (requires GNU `msgfmt` on PATH; compiles the `.po` fixtures back into `.mo`)
- **Release**: `npm version <patch|minor|major>` — `preversion` runs lint + tests, `postversion` pushes commits and tags. The package is ESM (`"type": "module"`).

## Architecture

This is a zero-config library that converts gettext **PO** (text) and **MO** (binary) files to/from a plain JS "translation object", and back. There are exactly four operations, wired up in `index.js` and exposed as `po.parse`/`po.compile`/`po.createParseStream` and `mo.parse`/`mo.compile`.
The goal is to adhere to https://www.gnu.org/software/gettext/ as much as possible.

### The translation object is the hub

Every parser produces, and every compiler consumes, the same shape:

```
{ charset, headers, translations: { [msgctxt]: { [msgid]: entry } } }
```

The default (empty) context lives at `translations[""]`, and its `""` entry holds the header block. See the README "Data structure" section for the full entry shape (`msgid`, `msgid_plural`, `msgstr[]`, `comments`). Because all four operations share this format, MO↔PO conversion is just parse-in-one-format + compile-in-another.

### Conventions worth knowing

- **Charset**: parsing always yields unicode, but the original charset is preserved on `.charset` and drives compilation. Only `Buffer` input is transcoded (via the `encoding` dep, which prefers native `iconv` over `iconv-lite` if installed); string input is assumed UTF-8. Header values are re-normalized to match `.charset` on compile — mutate the `headers` object, not the `""` translation string, to change output headers.
- **Header keys** are stored lowercase in the object but written with canonical casing from `HEADERS` in `lib/shared.js`.
- **Prototype-pollution guard**: header parsing uses `Object.defineProperty` rather than plain assignment (see git history — this was a security fix). Preserve this when touching header/object construction.
