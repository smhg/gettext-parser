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
 */

/**
 * Represents GetText translations.
 * @typedef {Object} GetTextTranslations
 * @property {string} charset Character set.
 * @property {Object.<string, string>} headers Headers.
 * @property {Object.<string, Object.<string, GetTextTranslation>>} translations Translations.
 */

/**
 * Options for the parser.
 * @typedef {Object} parserOptions
 * @property {string} [defaultCharset] Default character set.
 * @property {boolean} [validation] Whether to perform validation.
 */
