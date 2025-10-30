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

    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0x7e);
  });

  it('should correctly support values near zero', () => {
    const buffer = new ArrayBuffer(2);
    const dataView = new DataView(buffer);

    set_float_16(dataView, 0, 1e-6, false);

    expect(dataView.getUint8(0)).toBe(0x00);
    expect(dataView.getUint8(1)).toBe(0x20);
  });
});
