export interface EncoderStringUtf8Options {
  readonly encoding?: 'utf-8';
}

export interface EncoderStringBinaryOptions {
  readonly encoding: 'binary';
}

export type EncoderStringOptions = EncoderStringUtf8Options | EncoderStringBinaryOptions;
