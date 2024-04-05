import { Transform } from "readable-stream";
import {Buffer} from "safe-buffer";

export declare module 'encoding' {
    export function convert(buf: Buffer, charset: string): Buffer;
}

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
    msgid_plural?: string[];
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

export interface PoParser {
    parse: (buffer: Buffer | string, defaultCharset?: string) => GetTextTranslations;
    compile: (table: GetTextTranslations, options?: parserOptions) => Buffer;
    createParseStream: (options?: parserOptions, transformOptions?: import('readable-stream').TransformOptions) => Transform;
}

export interface MoParser {
    parse: (buffer: Buffer | string, defaultCharset?: string) => GetTextTranslations;
    compile: (table: GetTextTranslations, options?: parserOptions) => Buffer;
}
