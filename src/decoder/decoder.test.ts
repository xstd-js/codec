import { describe, expect, it, test } from 'vitest';
import { Decoder } from '../decoder/decoder.js';

describe('Decoder', () => {
  it('should be able to decode a binary string', () => {
    const str = Decoder.decode(new Uint8Array([3, 0, 97, 98, 99]), (decoder: Decoder) => {
      const length: number = decoder.int16LE(); // decodes the string's length
      return decoder.string(length, { encoding: 'binary' }); // decodes the string as binary
    });

    expect(str).toBe('abc');
  });

  describe('static methods', () => {
    describe('decode', () => {
      test('uint8', () => {
        expect(
          Decoder.decode(new Uint8Array([1]), (decoder: Decoder): number => {
            return decoder.uint8();
          }),
        ).toBe(1);
      });

      test('incomplete', () => {
        expect(() =>
          Decoder.decode(new Uint8Array([1, 2]), (decoder: Decoder): number => {
            return decoder.uint8();
          }),
        ).toThrow();
      });
    });

    describe('string', () => {
      test('encoding=utf-8', () => {
        expect(Decoder.string(new Uint8Array([97, 101]), { encoding: 'utf-8' })).toBe('ae');
      });
    });

    describe('json', () => {
      test('object', () => {
        expect(Decoder.json(new Uint8Array([123, 34, 97, 34, 58, 34, 98, 34, 125]))).toEqual({
          a: 'b',
        });
      });
    });
  });

  describe('methods', () => {
    test('#consume', () => {
      const decoder = new Decoder(new Uint8Array([0x05]));
      expect(decoder.length).toBe(1);
      expect(decoder.consumed).toBe(0);
      expect(decoder.remaining).toBe(1);
      expect(decoder.done).toBe(false);

      // consume
      expect(decoder.uint8()).toBe(0x05);
      expect(decoder.consumed).toBe(1);
      expect(decoder.remaining).toBe(0);
      expect(decoder.done).toBe(true);

      // excess limit
      expect(() => decoder.uint8()).toThrow();
      expect(decoder.consumed).toBe(1);
      expect(decoder.remaining).toBe(0);
      expect(decoder.done).toBe(true);
    });

    describe('numbers', () => {
      describe('int8', () => {
        test('int8', () => {
          const decoder = new Decoder(new Uint8Array([1]));
          expect(decoder.int8()).toBe(1);
          expect(decoder.consumed).toBe(1);
        });

        test('int8 -> wrap around', () => {
          expect(new Decoder(new Uint8Array([-1])).int8()).toBe(-1);
          expect(new Decoder(new Uint8Array([255])).int8()).toBe(-1);
          expect(new Decoder(new Uint8Array([128])).int8()).toBe(-128);
          expect(new Decoder(new Uint8Array([129])).int8()).toBe(-127);
          expect(new Decoder(new Uint8Array([-127])).int8()).toBe(-127);
          expect(new Decoder(new Uint8Array([-128])).int8()).toBe(-128);
          expect(new Decoder(new Uint8Array([-129])).int8()).toBe(127);
        });
      });

      describe('int16', () => {
        test('int16LE', () => {
          const decoder = new Decoder(new Uint8Array([0x34, 0x12]));
          expect(decoder.int16LE()).toBe(0x1234);
          expect(decoder.consumed).toBe(2);
        });

        test('int16BE', () => {
          const decoder = new Decoder(new Uint8Array([0x12, 0x34]));
          expect(decoder.int16BE()).toBe(0x1234);
          expect(decoder.consumed).toBe(2);
        });
      });

      describe('int32', () => {
        test('int32LE', () => {
          const decoder = new Decoder(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
          expect(decoder.int32LE()).toBe(0x12345678);
          expect(decoder.consumed).toBe(4);
        });

        test('int32BE', () => {
          const decoder = new Decoder(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
          expect(decoder.int32BE()).toBe(0x12345678);
          expect(decoder.consumed).toBe(4);
        });
      });

      describe('int64', () => {
        test('int64LE', () => {
          const decoder = new Decoder(
            new Uint8Array([0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]),
          );
          expect(decoder.int64LE()).toBe(0x12345678_90123456n);
          expect(decoder.consumed).toBe(8);
        });

        test('int64BE', () => {
          const decoder = new Decoder(
            new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56]),
          );
          expect(decoder.int64BE()).toBe(0x12345678_90123456n);
          expect(decoder.consumed).toBe(8);
        });
      });

      test('uint8', () => {
        const decoder = new Decoder(new Uint8Array([1]));
        expect(decoder.uint8()).toBe(1);
      });

      describe('uint16', () => {
        test('uint16LE', () => {
          const decoder = new Decoder(new Uint8Array([0x34, 0x12]));
          expect(decoder.uint16LE()).toBe(0x1234);
          expect(decoder.consumed).toBe(2);
        });

        test('uint16BE', () => {
          const decoder = new Decoder(new Uint8Array([0x12, 0x34]));
          expect(decoder.uint16BE()).toBe(0x1234);
          expect(decoder.consumed).toBe(2);
        });
      });

      describe('uint32', () => {
        test('uint32LE', () => {
          const decoder = new Decoder(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
          expect(decoder.uint32LE()).toBe(0x12345678);
          expect(decoder.consumed).toBe(4);
        });

        test('uint32BE', () => {
          const decoder = new Decoder(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
          expect(decoder.uint32BE()).toBe(0x12345678);
          expect(decoder.consumed).toBe(4);
        });
      });

      describe('uint64', () => {
        test('uint64LE', () => {
          const decoder = new Decoder(
            new Uint8Array([0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]),
          );
          expect(decoder.uint64LE()).toBe(0x12345678_90123456n);
          expect(decoder.consumed).toBe(8);
        });

        test('uint64BE', () => {
          const decoder = new Decoder(
            new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56]),
          );
          expect(decoder.uint64BE()).toBe(0x12345678_90123456n);
          expect(decoder.consumed).toBe(8);
        });
      });

      describe('float16', () => {
        test('float16LE', () => {
          const decoder = new Decoder(new Uint8Array([0x66, 0x2e]));
          expect(decoder.float16LE()).toBe(0.0999755859375);
          expect(decoder.consumed).toBe(2);
        });

        test('float16BE', () => {
          const decoder = new Decoder(new Uint8Array([0x2e, 0x66]));
          expect(decoder.float16BE()).toBe(0.0999755859375);
          expect(decoder.consumed).toBe(2);
        });
      });

      describe('float32', () => {
        test('float32LE', () => {
          const decoder = new Decoder(new Uint8Array([205, 204, 204, 61]));
          expect(decoder.float32LE()).toBe(0.10000000149011612);
          expect(decoder.consumed).toBe(4);
        });

        test('float32BE', () => {
          const decoder = new Decoder(new Uint8Array([61, 204, 204, 205]));
          expect(decoder.float32BE()).toBe(0.10000000149011612);
          expect(decoder.consumed).toBe(4);
        });
      });

      describe('float64', () => {
        test('float64LE', () => {
          const decoder = new Decoder(new Uint8Array([154, 153, 153, 153, 153, 153, 185, 63]));
          expect(decoder.float64LE()).toBe(0.1);
          expect(decoder.consumed).toBe(8);
        });

        test('float64BE', () => {
          const decoder = new Decoder(new Uint8Array([63, 185, 153, 153, 153, 153, 153, 154]));
          expect(decoder.float64BE()).toBe(0.1);
          expect(decoder.consumed).toBe(8);
        });
      });
    });

    test('bytes', () => {
      const decoder = new Decoder(new Uint8Array([0, 1]));
      expect(decoder.bytes(decoder.remaining)).toEqual(new Uint8Array([0, 1]));
      expect(decoder.consumed).toBe(2);
    });

    describe('string', () => {
      test('encoding=undefined -> defaults on utf-8', () => {
        const decoder = new Decoder(new Uint8Array([97, 101]));
        expect(decoder.string(decoder.remaining, { encoding: 'utf-8' })).toBe('ae');
        expect(decoder.consumed).toBe(2);
      });

      describe('encoding=utf-8', () => {
        test('ASCII chars', () => {
          const decoder = new Decoder(new Uint8Array([97, 101]));
          expect(decoder.string(decoder.remaining, { encoding: 'utf-8' })).toBe('ae');
          expect(decoder.consumed).toBe(2);
        });

        test('ASCII extended chars', () => {
          const decoder = new Decoder(new Uint8Array([195, 160, 195, 169]));
          expect(decoder.string(decoder.remaining, { encoding: 'utf-8' })).toBe('àé');
          expect(decoder.consumed).toBe(4);
        });

        test('unicode chars', () => {
          const decoder = new Decoder(new Uint8Array([225, 136, 180]));
          expect(decoder.string(decoder.remaining, { encoding: 'utf-8' })).toBe('\u1234');
          expect(decoder.consumed).toBe(3);
        });
      });

      describe('encoding=binary', () => {
        test('ASCII chars', () => {
          const decoder = new Decoder(new Uint8Array([97, 101]));
          expect(decoder.string(decoder.remaining, { encoding: 'binary' })).toBe('ae');
          expect(decoder.consumed).toBe(2);
        });

        test('ASCII extended chars', () => {
          const decoder = new Decoder(new Uint8Array([224, 233]));
          expect(decoder.string(decoder.remaining, { encoding: 'binary' })).toBe('àé');
          expect(decoder.consumed).toBe(2);
        });
      });

      describe('encoding=hex', () => {
        test('lowercase', () => {
          const decoder = new Decoder(new Uint8Array([0x12, 0xaf]));
          expect(decoder.string(decoder.remaining, { encoding: 'hex', uppercase: false })).toBe(
            '12af',
          );
          expect(decoder.consumed).toBe(2);
        });
        test('uppercase', () => {
          const decoder = new Decoder(new Uint8Array([0x12, 0xaf]));
          expect(decoder.string(decoder.remaining, { encoding: 'hex', uppercase: true })).toBe(
            '12AF',
          );
          expect(decoder.consumed).toBe(2);
        });
      });

      describe('encoding=base64', () => {
        test('valid chars', () => {
          const decoder = new Decoder(new Uint8Array([97, 98, 99, 100]));
          expect(decoder.string(decoder.remaining, { encoding: 'base64' })).toBe(btoa('abcd'));
          expect(decoder.consumed).toBe(4);
        });
      });
    });

    describe('json', () => {
      test('object', () => {
        const decoder = new Decoder(new Uint8Array([123, 34, 97, 34, 58, 34, 98, 34, 125]));
        expect(decoder.json(decoder.remaining)).toEqual({ a: 'b' });
        expect(decoder.consumed).toBe(9);
      });

      test('invalid json', () => {
        expect(() => new Decoder(new Uint8Array([123])).json(1)).toThrow();
      });
    });
  });
});
