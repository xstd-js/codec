export interface DecoderStringBinaryOptions {
  readonly encoding: 'binary';
}

export interface DecoderStringOtherOptions extends TextDecoderOptions {
  readonly encoding?: string;
}

export type DecoderStringOptions = DecoderStringBinaryOptions | DecoderStringOtherOptions;
