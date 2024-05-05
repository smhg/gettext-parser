import { Transform } from "readable-stream";

declare module 'encoding'

export interface Compiler {
    _table: GetTextTranslations;
    compile(): Buffer;
}

export interface GetTextComment {
    translator?: string;
    reference?: string;
    extracted?: string;
    flag?: string;
    previous?: string;
}

export interface GetTextTranslation {
    msgctxt?: string;
    msgid: string;
    msgid_plural?: string;
    msgstr: string[];
    comments?: GetTextComment;
}

export interface GetTextTranslations {
    charset: string;
    headers: { [headerName: string]: string };
    translations: { [msgctxt: string]: { [msgId: string]: GetTextTranslation } };
}

export interface parserOptions {
    defaultCharset?: string;
    validation?: boolean;
}

export interface po {
    parse: (buffer: Buffer | string, defaultCharset?: string) => GetTextTranslations;
    compile: (table: GetTextTranslations, options?: parserOptions) => Buffer;
    createParseStream: (options?: parserOptions, transformOptions?: import('readable-stream').TransformOptions) => Transform;
}

export interface mo {
    parse: (buffer: Buffer | string, defaultCharset?: string) => GetTextTranslations;
    compile: (table: GetTextTranslations, options?: parserOptions) => Buffer;
}

export default { po, mo } as { po: po, mo: mo };

export * from './types.d.ts';
