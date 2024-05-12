declare module 'encoding' {
  function convert(buffer: Buffer | string, charset?: string, fromCharset?: string): Buffer;
}
