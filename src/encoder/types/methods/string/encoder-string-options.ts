export interface EncoderStringUtf8Options {
  readonly encoding?: 'utf-8';
}

export interface EncoderStringBinaryOptions {
  readonly encoding: 'binary';
}

export interface EncoderStringHexOptions {
  readonly encoding: 'hex';
}

export interface EncoderStringBase64Options {
  readonly encoding: 'base64';
  readonly alphabet?: 'base64' | 'base64url';
  readonly lastChunkHandling?: 'loose' | 'strict' | 'stop-before-partial';
}

export type EncoderStringOptions =
  | EncoderStringUtf8Options
  | EncoderStringBinaryOptions
  | EncoderStringHexOptions
  | EncoderStringBase64Options;
