export interface DecoderStringBinaryOptions {
  readonly encoding: 'binary';
}

export interface DecoderStringHexOptions {
  readonly encoding: 'hex';
  readonly uppercase?: boolean;
}

export interface DecoderStringBase64Options {
  readonly encoding: 'base64';
  readonly alphabet?: 'base64' | 'base64url';
  readonly omitPadding?: boolean;
}

export interface DecoderStringOtherOptions extends TextDecoderOptions {
  readonly encoding?: string;
}

export type DecoderStringOptions =
  | DecoderStringBinaryOptions
  | DecoderStringHexOptions
  | DecoderStringBase64Options
  | DecoderStringOtherOptions;
