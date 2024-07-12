/**
 * Represents a GetText comment.
 * @typedef {Object} GetTextComment
 * @property {string} [translator] Translator information.
 * @property {string} [reference] Reference information.
 * @property {string} [extracted] Extracted comments.
 * @property {string} [flag] Flags.
 * @property {string} [previous] Previous string.
 */

/**
 * Represents a GetText translation.
 * @typedef {Object} GetTextTranslation
 * @property {string} [msgctxt] Context of the message.
 * @property {string} msgid The singular message ID.
 * @property {string} [msgid_plural] The plural message ID.
 * @property {string[]} msgstr Array of translated strings.
 * @property {GetTextComment} [comments] Comments associated with the translation.
 * @property {boolean} [obsolete] Whether the translation is obsolete.
 */

/**
 * @typedef {Record<string, Record<string, GetTextTranslation>>} Translations The translations index.
 */

/**
 * Represents GetText translations.
 * @typedef {Object} GetTextTranslations
 * @property {string|undefined} charset Character set.
 * @property {Record<string, string>} headers Headers.
 * @property {Translations} [obsolete] Obsolete messages.
 * @property {Translations} translations Translations.
 */

/**
 * Options for the parser.
 * @typedef {Object} ParserOptions
 * @property {string} [defaultCharset] Default character set.
 * @property {boolean} [validation] Whether to perform validation.
 * @property {number} [foldLength] the fold length.
 * @property {boolean} [escapeCharacters] Whether to escape characters.
 * @property {boolean} [sort] Whether to sort messages.
 * @property {string} [eol] End of line character.
 */

/**
 * @typedef {('writeUInt32LE'|'writeUInt32BE')} WriteFunc Type definition for write functions.
 */

/**
 * @typedef {('readUInt32LE'|'readUInt32BE')} ReadFunc Type definition for read functions.
 */
