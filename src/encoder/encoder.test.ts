import { describe, expect, it, test, vi } from 'vitest';
import { Encoder } from './encoder.js';
import { EncoderStringQuotedPrintableOptions } from './types/methods/string/encoder-string-options.js';

describe('Encoder', () => {
  it('should be able to encode a binary string', () => {
    const str: string = 'abc';

    const bytes = new Encoder()
      .int16LE(str.length) // encodes the string's length
      .string(str, { encoding: 'binary' }) // encodes the string as binary
      .toUint8Array();

    expect(bytes).toEqual(new Uint8Array([3, 0, 97, 98, 99]));
  });

  describe('static methods', () => {
    describe('encode', () => {
      it('should be able to encode a binary string', () => {
        expect(
          Encoder.encode('abc', (encoder: Encoder, str: string): void => {
            encoder
              .int16LE(str.length) // encodes the string's length
              .string(str, { encoding: 'binary' }); // encodes the string as binary
          }),
        ).toEqual(new Uint8Array([3, 0, 97, 98, 99]));
      });
    });

    describe('string', () => {
      it('must be able to encode a string', () => {
        expect(Encoder.string('ae', { encoding: 'utf-8' })).toEqual(new Uint8Array([97, 101]));
      });
    });

    describe('json', () => {
      it('must be able to encode an object', () => {
        expect(Encoder.json({ a: 1 })).toEqual(new Uint8Array([123, 34, 97, 34, 58, 49, 125]));
      });
    });
  });

  describe('methods', () => {
    describe('#alloc', () => {
      test('is internally resizeable', () => {
        const encoder = new Encoder({ initialByteLength: 1, maxByteLength: 2 });
        expect(encoder.length).toBe(0);

        // append
        encoder.uint8(1);
        expect(encoder.length).toBe(1);

        // grow
        encoder.uint8(2);
        expect(encoder.length).toBe(2);

        // excess limit
        expect(() => encoder.uint8(3)).toThrow();
      });

      test('support initialByteLength=0', () => {
        const encoder = new Encoder({ initialByteLength: 0, maxByteLength: 1 });
        expect(encoder.length).toBe(0);

        // grow
        encoder.uint8(1);
        expect(encoder.length).toBe(1);

        // excess limit
        expect(() => encoder.uint8(2)).toThrow();
      });
    });

    describe('encode', () => {
      it('should be called with this encoder and the provided value as arguments', () => {
        const spy = vi.fn();
        const encoder = new Encoder();
        encoder.encode(3, spy);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenNthCalledWith(1, encoder, 3);
      });
    });

    describe('numbers', () => {
      describe('int8', () => {
        test('int8', () => {
          const encoder = new Encoder();
          expect(encoder.int8(1).toUint8Array()).toEqual(new Uint8Array([1]));
          expect(encoder.length).toBe(1);
        });

        test('int8 -> wrap around', () => {
          expect(new Encoder().int8(-1).toUint8Array()).toEqual(new Uint8Array([255]));
          expect(new Encoder().int8(128).toUint8Array()).toEqual(new Uint8Array([128]));
          expect(new Encoder().int8(129).toUint8Array()).toEqual(new Uint8Array([129]));
          expect(new Encoder().int8(-127).toUint8Array()).toEqual(new Uint8Array([-127]));
          expect(new Encoder().int8(-128).toUint8Array()).toEqual(new Uint8Array([128]));
          expect(new Encoder().int8(-129).toUint8Array()).toEqual(new Uint8Array([127]));
        });
      });

      describe('int16', () => {
        test('int16LE', () => {
          const encoder = new Encoder();
          expect(encoder.int16LE(0x1234).toUint8Array()).toEqual(new Uint8Array([0x34, 0x12]));
          expect(encoder.length).toBe(2);
        });

        test('int16BE', () => {
          const encoder = new Encoder();
          expect(encoder.int16BE(0x1234).toUint8Array()).toEqual(new Uint8Array([0x12, 0x34]));
          expect(encoder.length).toBe(2);
        });
      });

      describe('int32', () => {
        test('int32LE', () => {
          const encoder = new Encoder();
          expect(encoder.int32LE(0x12345678).toUint8Array()).toEqual(
            new Uint8Array([0x78, 0x56, 0x34, 0x12]),
          );
          expect(encoder.length).toBe(4);
        });

        test('int32BE', () => {
          const encoder = new Encoder();
          expect(encoder.int32BE(0x12345678).toUint8Array()).toEqual(
            new Uint8Array([0x12, 0x34, 0x56, 0x78]),
          );
          expect(encoder.length).toBe(4);
        });
      });

      describe('int64', () => {
        describe('int64LE', () => {
          test('bigint', () => {
            const encoder = new Encoder();
            expect(encoder.int64LE(0x12345678_90123456n).toUint8Array()).toEqual(
              new Uint8Array([0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]),
            );
            expect(encoder.length).toBe(8);
          });

          test('number', () => {
            const encoder = new Encoder();
            expect(encoder.int64LE(0x1234).toUint8Array()).toEqual(
              new Uint8Array([0x34, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            );
            expect(encoder.length).toBe(8);
          });
        });

        test('int64BE', () => {
          const encoder = new Encoder();
          expect(encoder.int64BE(0x12345678_90123456n).toUint8Array()).toEqual(
            new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56]),
          );
          expect(encoder.length).toBe(8);
        });
      });

      describe('uint8', () => {
        test('uint8', () => {
          const encoder = new Encoder();
          expect(encoder.uint8(1).toUint8Array()).toEqual(new Uint8Array([1]));
        });
      });

      describe('uint16', () => {
        test('uint16LE', () => {
          const encoder = new Encoder();
          expect(encoder.uint16LE(0x1234).toUint8Array()).toEqual(new Uint8Array([0x34, 0x12]));
          expect(encoder.length).toBe(2);
        });

        test('uint16BE', () => {
          const encoder = new Encoder();
          expect(encoder.uint16BE(0x1234).toUint8Array()).toEqual(new Uint8Array([0x12, 0x34]));
          expect(encoder.length).toBe(2);
        });
      });

      describe('uint32', () => {
        test('uint32LE', () => {
          const encoder = new Encoder();
          expect(encoder.uint32LE(0x12345678).toUint8Array()).toEqual(
            new Uint8Array([0x78, 0x56, 0x34, 0x12]),
          );
          expect(encoder.length).toBe(4);
        });

        test('uint32BE', () => {
          const encoder = new Encoder();
          expect(encoder.uint32BE(0x12345678).toUint8Array()).toEqual(
            new Uint8Array([0x12, 0x34, 0x56, 0x78]),
          );
          expect(encoder.length).toBe(4);
        });
      });

      describe('uint64', () => {
        describe('uint64LE', () => {
          test('bigint', () => {
            const encoder = new Encoder();
            expect(encoder.uint64LE(0x12345678_90123456n).toUint8Array()).toEqual(
              new Uint8Array([0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]),
            );
            expect(encoder.length).toBe(8);
          });

          test('number', () => {
            const encoder = new Encoder();
            expect(encoder.uint64LE(0x1234).toUint8Array()).toEqual(
              new Uint8Array([0x34, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            );
            expect(encoder.length).toBe(8);
          });
        });

        describe('uint64BE', () => {
          test('bigint', () => {
            const encoder = new Encoder();
            expect(encoder.uint64BE(0x12345678_90123456n).toUint8Array()).toEqual(
              new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56]),
            );
            expect(encoder.length).toBe(8);
          });

          test('number', () => {
            const encoder = new Encoder();
            expect(encoder.uint64BE(0x1234).toUint8Array()).toEqual(
              new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x12, 0x34]),
            );
            expect(encoder.length).toBe(8);
          });
        });
      });

      describe('float16', () => {
        test('float16LE', () => {
          const encoder = new Encoder();
          expect(encoder.float16LE(0.099975586).toUint8Array()).toEqual(
            new Uint8Array([0x66, 0x2e]),
          );
          expect(encoder.length).toBe(2);
        });

        test('float16BE', () => {
          const encoder = new Encoder();
          expect(encoder.float16BE(0.1).toUint8Array()).toEqual(new Uint8Array([0x2e, 0x66]));
          expect(encoder.length).toBe(2);
        });
      });

      describe('float32', () => {
        test('float32LE', () => {
          const encoder = new Encoder();
          expect(encoder.float32LE(0.1).toUint8Array()).toEqual(
            new Uint8Array([205, 204, 204, 61]),
          );
          expect(encoder.length).toBe(4);
        });

        test('float32BE', () => {
          const encoder = new Encoder();
          expect(encoder.float32BE(0.1).toUint8Array()).toEqual(
            new Uint8Array([61, 204, 204, 205]),
          );
          expect(encoder.length).toBe(4);
        });
      });

      describe('float64', () => {
        test('float64LE', () => {
          const encoder = new Encoder();
          expect(encoder.float64LE(0.1).toUint8Array()).toEqual(
            new Uint8Array([154, 153, 153, 153, 153, 153, 185, 63]),
          );
          expect(encoder.length).toBe(8);
        });

        test('float64BE', () => {
          const encoder = new Encoder();
          expect(encoder.float64BE(0.1).toUint8Array()).toEqual(
            new Uint8Array([63, 185, 153, 153, 153, 153, 153, 154]),
          );
          expect(encoder.length).toBe(8);
        });
      });
    });

    describe('bytes', () => {
      test('bytes', () => {
        const encoder = new Encoder();
        expect(encoder.bytes(new Uint8Array([0, 1])).toUint8Array()).toEqual(
          new Uint8Array([0, 1]),
        );
        expect(encoder.length).toBe(2);
      });
    });

    describe('string', () => {
      test('encoding=undefined -> defaults on utf-8', () => {
        const encoder = new Encoder();
        expect(encoder.string('ae', { encoding: 'utf-8' }).toUint8Array()).toEqual(
          new Uint8Array([97, 101]),
        );
        expect(encoder.length).toBe(2);
      });

      describe('encoding=utf-8', () => {
        test('ASCII chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('ae', { encoding: 'utf-8' }).toUint8Array()).toEqual(
            new Uint8Array([97, 101]),
          );
          expect(encoder.length).toBe(2);
        });

        test('ASCII extended chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('àé', { encoding: 'utf-8' }).toUint8Array()).toEqual(
            new Uint8Array([195, 160, 195, 169]),
          );
          expect(encoder.length).toBe(4);
        });

        test('unicode chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('\u1234', { encoding: 'utf-8' }).toUint8Array()).toEqual(
            new Uint8Array([225, 136, 180]),
          );
          expect(encoder.length).toBe(3);
        });
      });

      describe('encoding=binary', () => {
        test('ASCII chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('ae', { encoding: 'binary' }).toUint8Array()).toEqual(
            new Uint8Array([97, 101]),
          );
          expect(encoder.length).toBe(2);
        });

        test('ASCII extended chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('àé', { encoding: 'binary' }).toUint8Array()).toEqual(
            new Uint8Array([224, 233]),
          );
          expect(encoder.length).toBe(2);
        });

        test('unicode chars', () => {
          expect(() =>
            new Encoder().string('\u1234', { encoding: 'binary' }).toUint8Array(),
          ).toThrow();
        });
      });

      describe('encoding=hex', () => {
        test('valid chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('12Af', { encoding: 'hex' }).toUint8Array()).toEqual(
            new Uint8Array([0x12, 0xaf]),
          );
          expect(encoder.length).toBe(2);
        });

        test('invalid valid chars', () => {
          expect(() => new Encoder().string('12Zu', { encoding: 'hex' }).toUint8Array()).toThrow();
        });
      });

      describe('encoding=base64', () => {
        test('valid chars', () => {
          const encoder = new Encoder();
          expect(encoder.string(btoa('abcd'), { encoding: 'base64' }).toUint8Array()).toEqual(
            new Uint8Array([97, 98, 99, 100]),
          );
          expect(encoder.length).toBe(4);
        });

        test('invalid valid chars', () => {
          expect(() =>
            new Encoder().string('???', { encoding: 'base64' }).toUint8Array(),
          ).toThrow();
        });
      });

      describe('encoding=quoted-printable', () => {
        const asText = (input: Uint8Array) => new TextDecoder().decode(input);

        describe('mode=text', () => {
          const options: EncoderStringQuotedPrintableOptions = {
            encoding: 'quoted-printable',
            mode: 'text',
          };

          test('with only safe chars', () => {
            expect(asText(Encoder.string('abc', options))).toBe('abc');
          });

          test('with unsafe char', () => {
            expect(asText(Encoder.string('é', options))).toBe('=C3=A9');
          });

          test('with safe and unsafe chars', () => {
            expect(asText(Encoder.string('aéb=c', options))).toBe('a=C3=A9b=3Dc');
          });

          test('with only safe chars reaching the limit of the max line length', () => {
            const asText = (input: Uint8Array) => new TextDecoder().decode(input);

            expect(
              asText(
                Encoder.string(
                  '0123456789012345678901234567890123456789012345678901234567890123456789012345' /* 76 chars */,
                  options,
                ),
              ),
            ).toBe('0123456789012345678901234567890123456789012345678901234567890123456789012345');
          });

          test('with only safe chars involving a soft line break', () => {
            expect(
              asText(
                Encoder.string(
                  '01234567890123456789012345678901234567890123456789012345678901234567890123456789' /* 80 chars */,
                  options,
                ),
              ),
            ).toBe(
              '012345678901234567890123456789012345678901234567890123456789012345678901234=\r\n56789',
            );
          });

          test('with only safe chars involving a meaning full line break', () => {
            expect(
              asText(
                Encoder.string('012345\r\n6789', {
                  encoding: 'quoted-printable',
                }),
              ),
            ).toBe('012345\r\n6789');
          });

          test('with only safe chars reaching the limit of the max line length and involving a meaning full line break', () => {
            expect(
              asText(
                Encoder.string(
                  '0123456789012345678901234567890123456789012345678901234567890123456789012345\r\n6789' /* 76 chars + CRLF + 4 chars */,
                  options,
                ),
              ),
            ).toBe(
              '0123456789012345678901234567890123456789012345678901234567890123456789012345\r\n6789',
            );
          });

          test('with unsafe chars reaching the limit of the max line length and involving a soft line break', () => {
            expect(
              asText(
                Encoder.string(
                  '012345678901234567890123456789012345678901234567890123456789012345678901=6789' /* 72 chars + = + 4 chars */,
                  options,
                ),
              ),
            ).toBe(
              '012345678901234567890123456789012345678901234567890123456789012345678901=3D=\r\n6789',
            );

            expect(
              asText(
                Encoder.string(
                  '0123456789012345678901234567890123456789012345678901234567890123456789012=6789' /* 73 chars + = + 4 chars */,
                  options,
                ),
              ),
            ).toBe(
              '0123456789012345678901234567890123456789012345678901234567890123456789012=\r\n=3D6789',
            );
          });

          test('with unsafe chars reaching the limit of the max line length and involving a meaning full line break', () => {
            expect(
              asText(
                Encoder.string(
                  '0123456789012345678901234567890123456789012345678901234567890123456789012=\r\n6789' /* 73 chars + =  + CRLF + 4 chars */,
                  options,
                ),
              ),
            ).toBe(
              '0123456789012345678901234567890123456789012345678901234567890123456789012=3D\r\n6789',
            );
          });

          describe('with space and tabs', () => {
            test('base', () => {
              expect(asText(Encoder.string('a b\tc', options))).toBe('a b\tc');
            });

            test('not encoded if last', () => {
              expect(asText(Encoder.string('ab\t', options))).toBe('ab\t');
            });

            test('encoded if followed by a line break', () => {
              expect(asText(Encoder.string('ab\t\r\nc', options))).toBe('ab=09\r\nc');
            });

            test('only the last one of the line is encoded', () => {
              expect(asText(Encoder.string('ab  \r\nc', options))).toBe('ab =20\r\nc');
            });

            test('only the last one of the line is encoded and involves a soft line break', () => {
              expect(asText(Encoder.string(' '.repeat(80), options))).toBe(
                '                                                                           =\r\n' +
                  '     ',
              );
            });
          });
        });

        describe('mode=binary', () => {
          const options: EncoderStringQuotedPrintableOptions = {
            encoding: 'quoted-printable',
            mode: 'binary',
            sub: {
              encoding: 'binary',
            },
          };

          test('with binary string', () => {
            expect(asText(Encoder.string('\x3D\x12', options))).toBe('=3D=12');
          });

          test('with soft line break', () => {
            expect(
              asText(
                Encoder.string(
                  '01234567890123456789012345678901234567890123456789012345678901234567890123456789' /* 80 chars */,
                  options,
                ),
              ),
            ).toBe(
              '=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=\r\n' +
                '=35=36=37=38=39=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=35=36=37=38=39=\r\n' +
                '=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=\r\n' +
                '=35=36=37=38=39',
            );
          });
        });
      });
    });

    describe('json', () => {
      test('object', () => {
        const encoder = new Encoder();
        expect(encoder.json({ a: 'b' }).toUint8Array()).toEqual(
          new Uint8Array([123, 34, 97, 34, 58, 34, 98, 34, 125]),
        );
        expect(encoder.length).toBe(9);
      });

      test('invalid json', () => {
        const a: any = { a: null };
        a.a = a;
        expect(() => new Encoder().json(a).toUint8Array()).toThrow();
      });
    });

    describe('iterable', () => {
      test('array of numbers', () => {
        const encoder = new Encoder();
        expect(
          encoder
            .iterable([1, 9], (encoder: Encoder, value: number): void => {
              encoder.uint8(value);
            })
            .toUint8Array(),
        ).toEqual(new Uint8Array([1, 9]));
        expect(encoder.length).toBe(2);
      });
    });
  });
});
