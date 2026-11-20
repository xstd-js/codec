import { describe, expect, it } from 'vitest';
import { set_float_16 } from './set_float_16.js';

describe('set_float_16', () => {
  it('should correctly write a positive float to DataView in big-endian', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, 1.5, false);

    expect(dataView.getUint8(0)).toBe(0x3e);
    expect(dataView.getUint8(1)).toBe(0x00);
  });

  it('should correctly write a negative float to DataView in little-endian', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, -1.5, true);

    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0xbe);
  });

  it('should correctly write zero to DataView', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, 0, false);

    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0x00);
  });

  it('should correctly write negative zero to DataView', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, -0, false);

    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0x80);
  });

  it('should correctly write NaN to DataView', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, NaN, false);

    expect(dataView.getUint8(0)).toBe(0x7e);
    expect(dataView.getUint8(1)).toBe(0x01);
  });

  it('should correctly write positive infinity to DataView', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, Infinity, false);

    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0x7c);
  });

  it('should correctly write negative infinity to DataView', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, -Infinity, false);

    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0xfc);
  });

  it('should encode values larger than the largest float16 as positive infinity', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, 1e10, false);

    // overflow -> +Infinity (0x7c00), not a NaN pattern
    expect(dataView.getUint16(0, false)).toBe(0x7c00);
  });

  it('should correctly handle values smaller than the smallest subnormal float16', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, 1e-10, false);

    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0x00);
  });

  it('should correctly handle values larger than the largest float16', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, 1e10, false);

    // +Infinity bits 0x7c00 -> big-endian bytes [0x7c, 0x00]
    expect(dataView.getUint8(0)).toBe(0x7c);
    expect(dataView.getUint8(1)).toBe(0x00);
  });

  it('should encode the subnormal 2^-15 as 0x0200 (mantissa 512)', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, 2 ** -15, false);

    // 2^-15 = 0.5 * 2^-14 -> subnormal mantissa of 512 -> bits 0x0200
    expect(dataView.getUint16(0, false)).toBe(0x0200);
  });

  it('should correctly support values near zero', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, 1e-6, false);

    // 1e-6 -> subnormal mantissa of 16 (truncated from 16.78)
    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0x10);
  });
});
