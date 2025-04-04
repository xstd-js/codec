import { describe, expect, it, test, vi } from 'vitest';
import { Encoder } from './encoder.js';

describe('Encoder', () => {
  it('should be able to encode a binary string', () => {
    const str: string = 'abc';

    const bytes = new Encoder()
      .int16LE(str.length) // encodes the string's length
      .string(str, { encoding: 'binary' }) // encodes the string as binary
      .toUint8Array();

    expect(bytes).toEqual(new Uint8Array([3, 0, 97, 98, 99]));
  });

  describe('methods', () => {
    test('#alloc', () => {
      {
        const encoder = new Encoder({ initialByteLength: 0, maxByteLength: 1 });
        expect(encoder.allocated).toBe(0);

        // grow
        encoder.uint8(1);
        expect(encoder.allocated).toBe(1);

        // excess limit
        expect(() => encoder.uint8(2)).toThrow();
      }

      {
        const encoder = new Encoder({ initialByteLength: 1, maxByteLength: 2 });
        expect(encoder.allocated).toBe(0);

        encoder.uint8(1);
        encoder.uint8(2);
        expect(encoder.allocated).toBe(2);

        // excess limit
        expect(() => encoder.uint8(3)).toThrow();
      }
    });

    test('apply', () => {
      const spy = vi.fn();
      const encoder = new Encoder();
      encoder.apply(spy);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenNthCalledWith(1, encoder);
    });

    describe('numbers', () => {
      describe('uint8', () => {
        test('int8', () => {
          const encoder = new Encoder();
          expect(encoder.int8(1).toUint8Array()).toEqual(new Uint8Array([1]));
          expect(encoder.allocated).toBe(1);
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
          expect(encoder.allocated).toBe(2);
        });

        test('int16BE', () => {
          const encoder = new Encoder();
          expect(encoder.int16BE(0x1234).toUint8Array()).toEqual(new Uint8Array([0x12, 0x34]));
          expect(encoder.allocated).toBe(2);
        });
      });

      describe('int32', () => {
        test('int32LE', () => {
          const encoder = new Encoder();
          expect(encoder.int32LE(0x12345678).toUint8Array()).toEqual(
            new Uint8Array([0x78, 0x56, 0x34, 0x12]),
          );
          expect(encoder.allocated).toBe(4);
        });

        test('int32BE', () => {
          const encoder = new Encoder();
          expect(encoder.int32BE(0x12345678).toUint8Array()).toEqual(
            new Uint8Array([0x12, 0x34, 0x56, 0x78]),
          );
          expect(encoder.allocated).toBe(4);
        });
      });

      describe('int64', () => {
        describe('int64LE', () => {
          test('bigint', () => {
            const encoder = new Encoder();
            expect(encoder.int64LE(0x12345678_90123456n).toUint8Array()).toEqual(
              new Uint8Array([0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]),
            );
            expect(encoder.allocated).toBe(8);
          });

          test('number', () => {
            const encoder = new Encoder();
            expect(encoder.int64LE(0x1234).toUint8Array()).toEqual(
              new Uint8Array([0x34, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            );
            expect(encoder.allocated).toBe(8);
          });
        });

        test('int64BE', () => {
          const encoder = new Encoder();
          expect(encoder.int64BE(0x12345678_90123456n).toUint8Array()).toEqual(
            new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56]),
          );
          expect(encoder.allocated).toBe(8);
        });
      });

      test('uint8', () => {
        const encoder = new Encoder();
        expect(encoder.uint8(1).toUint8Array()).toEqual(new Uint8Array([1]));
      });

      describe('uint16', () => {
        test('uint16LE', () => {
          const encoder = new Encoder();
          expect(encoder.uint16LE(0x1234).toUint8Array()).toEqual(new Uint8Array([0x34, 0x12]));
          expect(encoder.allocated).toBe(2);
        });

        test('uint16BE', () => {
          const encoder = new Encoder();
          expect(encoder.uint16BE(0x1234).toUint8Array()).toEqual(new Uint8Array([0x12, 0x34]));
          expect(encoder.allocated).toBe(2);
        });
      });

      describe('uint32', () => {
        test('uint32LE', () => {
          const encoder = new Encoder();
          expect(encoder.uint32LE(0x12345678).toUint8Array()).toEqual(
            new Uint8Array([0x78, 0x56, 0x34, 0x12]),
          );
          expect(encoder.allocated).toBe(4);
        });

        test('uint32BE', () => {
          const encoder = new Encoder();
          expect(encoder.uint32BE(0x12345678).toUint8Array()).toEqual(
            new Uint8Array([0x12, 0x34, 0x56, 0x78]),
          );
          expect(encoder.allocated).toBe(4);
        });
      });

      describe('uint64', () => {
        describe('uint64LE', () => {
          test('bigint', () => {
            const encoder = new Encoder();
            expect(encoder.uint64LE(0x12345678_90123456n).toUint8Array()).toEqual(
              new Uint8Array([0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]),
            );
            expect(encoder.allocated).toBe(8);
          });

          test('number', () => {
            const encoder = new Encoder();
            expect(encoder.uint64LE(0x1234).toUint8Array()).toEqual(
              new Uint8Array([0x34, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            );
            expect(encoder.allocated).toBe(8);
          });
        });

        describe('uint64BE', () => {
          test('bigint', () => {
            const encoder = new Encoder();
            expect(encoder.uint64BE(0x12345678_90123456n).toUint8Array()).toEqual(
              new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56]),
            );
            expect(encoder.allocated).toBe(8);
          });

          test('number', () => {
            const encoder = new Encoder();
            expect(encoder.uint64BE(0x1234).toUint8Array()).toEqual(
              new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x12, 0x34]),
            );
            expect(encoder.allocated).toBe(8);
          });
        });
      });

      describe('float16', () => {
        test('float16LE', () => {
          const encoder = new Encoder();
          expect(encoder.float16LE(0.099975586).toUint8Array()).toEqual(
            new Uint8Array([0x66, 0x2e]),
          );
          expect(encoder.allocated).toBe(2);
        });

        test('float16BE', () => {
          const encoder = new Encoder();
          expect(encoder.float16BE(0.1).toUint8Array()).toEqual(new Uint8Array([0x2e, 0x66]));
          expect(encoder.allocated).toBe(2);
        });
      });

      describe('float32', () => {
        test('float32LE', () => {
          const encoder = new Encoder();
          expect(encoder.float32LE(0.1).toUint8Array()).toEqual(
            new Uint8Array([205, 204, 204, 61]),
          );
          expect(encoder.allocated).toBe(4);
        });

        test('float32BE', () => {
          const encoder = new Encoder();
          expect(encoder.float32BE(0.1).toUint8Array()).toEqual(
            new Uint8Array([61, 204, 204, 205]),
          );
          expect(encoder.allocated).toBe(4);
        });
      });

      describe('float64', () => {
        test('float64LE', () => {
          const encoder = new Encoder();
          expect(encoder.float64LE(0.1).toUint8Array()).toEqual(
            new Uint8Array([154, 153, 153, 153, 153, 153, 185, 63]),
          );
          expect(encoder.allocated).toBe(8);
        });

        test('float64BE', () => {
          const encoder = new Encoder();
          expect(encoder.float64BE(0.1).toUint8Array()).toEqual(
            new Uint8Array([63, 185, 153, 153, 153, 153, 153, 154]),
          );
          expect(encoder.allocated).toBe(8);
        });
      });
    });

    test('bytes', () => {
      const encoder = new Encoder();
      expect(encoder.bytes(new Uint8Array([0, 1])).toUint8Array()).toEqual(new Uint8Array([0, 1]));
      expect(encoder.allocated).toBe(2);
    });

    describe('string', () => {
      test('encoding=undefined -> defaults on utf-8', () => {
        const encoder = new Encoder();
        expect(encoder.string('ae', { encoding: 'utf-8' }).toUint8Array()).toEqual(
          new Uint8Array([97, 101]),
        );
        expect(encoder.allocated).toBe(2);
      });

      describe('encoding=utf-8', () => {
        test('ASCII chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('ae', { encoding: 'utf-8' }).toUint8Array()).toEqual(
            new Uint8Array([97, 101]),
          );
          expect(encoder.allocated).toBe(2);
        });

        test('ASCII extended chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('àé', { encoding: 'utf-8' }).toUint8Array()).toEqual(
            new Uint8Array([195, 160, 195, 169]),
          );
          expect(encoder.allocated).toBe(4);
        });

        test('unicode chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('\u1234', { encoding: 'utf-8' }).toUint8Array()).toEqual(
            new Uint8Array([225, 136, 180]),
          );
          expect(encoder.allocated).toBe(3);
        });
      });

      describe('encoding=binary', () => {
        test('ASCII chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('ae', { encoding: 'binary' }).toUint8Array()).toEqual(
            new Uint8Array([97, 101]),
          );
          expect(encoder.allocated).toBe(2);
        });

        test('ASCII extended chars', () => {
          const encoder = new Encoder();
          expect(encoder.string('àé', { encoding: 'binary' }).toUint8Array()).toEqual(
            new Uint8Array([224, 233]),
          );
          expect(encoder.allocated).toBe(2);
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
          expect(encoder.allocated).toBe(2);
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
          expect(encoder.allocated).toBe(4);
        });

        test('invalid valid chars', () => {
          expect(() =>
            new Encoder().string('???', { encoding: 'base64' }).toUint8Array(),
          ).toThrow();
        });
      });
    });

    describe('json', () => {
      test('object', () => {
        const encoder = new Encoder();
        expect(encoder.json({ a: 'b' }).toUint8Array()).toEqual(
          new Uint8Array([123, 34, 97, 34, 58, 34, 98, 34, 125]),
        );
        expect(encoder.allocated).toBe(9);
      });

      test('invalid json', () => {
        const a: any = { a: null };
        a.a = a;
        expect(() => new Encoder().json(a).toUint8Array()).toThrow();
      });
    });
  });
});
